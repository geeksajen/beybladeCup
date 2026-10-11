import { describe, expect, it } from 'vitest';
import { classifyEntries, entryPosition, registrationState } from '../src/engine/registration';
import { buildEventDoc, defaultSetupValues, validateSetup } from '../src/lib/defaults';
import type { EntryDoc, EventDoc } from '../src/types';

const entry = (i: number, owner = `u${i}`, status: EntryDoc['status'] = 'active'): EntryDoc => ({
  id: `e${i}`,
  ownerUid: owner,
  nickname: `n${i}`,
  status,
  checkedIn: false,
  createdAt: 1000 + i,
  updatedAt: 1000 + i,
});

const now = new Date('2026-10-01T10:00:00').getTime();
const ev: EventDoc = {
  ...buildEventDoc(
    { ...defaultSetupValues(), startAt: now + 10 * 86400000, registerDeadline: now + 9 * 86400000, capacity: 4, waitlistCapacity: 2 },
    now,
  ),
  status: 'open',
};

describe('classifyEntries', () => {
  it('依 createdAt 推導正取／候補，取消的不算', () => {
    const list = [entry(3), entry(1), entry(2, 'x', 'cancelled'), entry(4), entry(5), entry(6), entry(7), entry(8)];
    const c = classifyEntries(list, 4, 2);
    expect(c.confirmed.map((e) => e.id)).toEqual(['e1', 'e3', 'e4', 'e5']);
    expect(c.waitlist.map((e) => e.id)).toEqual(['e6', 'e7']);
    expect(c.overflow.map((e) => e.id)).toEqual(['e8']);
  });

  it('取消後候補遞補', () => {
    const list = [entry(1, 'u1', 'cancelled'), entry(2), entry(3), entry(4), entry(5)];
    expect(entryPosition(list, ev, 'e5')).toEqual({ kind: 'confirmed', index: 4 });
  });
});

describe('registrationState', () => {
  it('開放中可報名；滿了進候補', () => {
    const list = [1, 2, 3, 4].map((i) => entry(i));
    const s = registrationState(ev, list, 'me', now);
    expect(s.canRegister).toBe(true);
    expect(s.willBeWaitlist).toBe(true);
  });
  it('正取＋候補都滿不能報名', () => {
    const list = [1, 2, 3, 4, 5, 6].map((i) => entry(i));
    expect(registrationState(ev, list, 'me', now).canRegister).toBe(false);
  });
  it('每人上限 3 筆', () => {
    const list = [1, 2, 3].map((i) => entry(i, 'me'));
    expect(registrationState({ ...ev, capacity: 10 }, list, 'me', now).canRegister).toBe(false);
  });
  it('截止後不能報名', () => {
    expect(registrationState(ev, [], 'me', ev.registerDeadline + 1).canRegister).toBe(false);
    expect(registrationState({ ...ev, status: 'closed' }, [], 'me', now).canRegister).toBe(false);
  });
});

describe('validateSetup', () => {
  it('必填與範圍', () => {
    const e = validateSetup({ ...defaultSetupValues(), title: '' , capacity: 30, waitlistCapacity: -1, arenaCount: 3 }, now, true);
    expect(Object.keys(e).sort()).toEqual(['arenaCount', 'capacity', 'registerDeadline', 'startAt', 'title', 'waitlistCapacity']);
  });
  it('截止必須早於比賽', () => {
    const e = validateSetup({ ...defaultSetupValues(), startAt: now + 1000, registerDeadline: now + 2000 }, now, true);
    expect(e.registerDeadline).toBeDefined();
  });
  it('合法', () => {
    const e = validateSetup({ ...defaultSetupValues(), startAt: now + 2000, registerDeadline: now + 1000 }, now, true);
    expect(e).toEqual({});
  });
});
