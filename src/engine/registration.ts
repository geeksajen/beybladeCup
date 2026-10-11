import type { EntryDoc, EventDoc } from '../types';

export function sortActive(entries: EntryDoc[]): EntryDoc[] {
  return entries
    .filter((e) => e.status === 'active')
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export interface Classified {
  confirmed: EntryDoc[];
  waitlist: EntryDoc[];
  overflow: EntryDoc[];
}

/** 正取／候補不存資料庫：有效報名依 createdAt 排序後推導（spec §6.3）。 */
export function classifyEntries(entries: EntryDoc[], capacity: number, waitlistCapacity: number): Classified {
  const active = sortActive(entries);
  return {
    confirmed: active.slice(0, capacity),
    waitlist: active.slice(capacity, capacity + waitlistCapacity),
    overflow: active.slice(capacity + waitlistCapacity),
  };
}

export type PositionKind = 'confirmed' | 'waitlist' | 'overflow' | 'cancelled' | 'unknown';

export function entryPosition(
  entries: EntryDoc[],
  ev: Pick<EventDoc, 'capacity' | 'waitlistCapacity'>,
  id: string,
): { kind: PositionKind; index: number } {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return { kind: 'unknown', index: -1 };
  if (entry.status === 'cancelled') return { kind: 'cancelled', index: -1 };
  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  for (const kind of ['confirmed', 'waitlist', 'overflow'] as const) {
    const i = c[kind].findIndex((e) => e.id === id);
    if (i >= 0) return { kind, index: i + 1 };
  }
  return { kind: 'unknown', index: -1 };
}

export function isRegistrationOpen(ev: Pick<EventDoc, 'status' | 'registerDeadline'>, now: number): boolean {
  return ev.status === 'open' && now < ev.registerDeadline;
}

export interface RegistrationState {
  canRegister: boolean;
  reason?: string;
  willBeWaitlist: boolean;
  myActiveCount: number;
}

export function registrationState(ev: EventDoc, entries: EntryDoc[], ownerUid: string | undefined, now: number): RegistrationState {
  const active = sortActive(entries);
  const myActiveCount = ownerUid ? active.filter((e) => e.ownerUid === ownerUid).length : 0;
  const base = { myActiveCount, willBeWaitlist: active.length >= ev.capacity };
  if (ev.status !== 'open') return { ...base, canRegister: false, reason: ev.status === 'draft' ? '尚未開放報名' : '報名已截止' };
  if (now >= ev.registerDeadline) return { ...base, canRegister: false, reason: '報名已截止' };
  if (active.length >= ev.capacity + ev.waitlistCapacity) return { ...base, canRegister: false, reason: '名額與候補都已額滿' };
  if (myActiveCount >= ev.maxEntriesPerOwner)
    return { ...base, canRegister: false, reason: `每位家長最多替 ${ev.maxEntriesPerOwner} 位小朋友報名` };
  return { ...base, canRegister: true };
}
