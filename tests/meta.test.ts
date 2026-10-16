import { describe, expect, it } from 'vitest';
import { checkDeck, deckSignature, deckStatus, nextBeys, setMatchDecks, slotAt } from '../src/engine/deck';
import { byWinRate, computeMeta, topByFinish } from '../src/engine/meta';
import { generateBracket } from '../src/engine/scheduler';
import { DEFAULT_RULES } from '../src/lib/defaults';
import { simulateAll } from '../src/lib/devSim';
import { comboLabel, normalizePart } from '../src/lib/parts';
import type { EntryDoc } from '../src/types';
import type { Battle, BracketDoc, Combo, FinishType, Match } from '../src/types';

const c = (blade: string, ratchet: string, bit: string): Combo => ({ blade, ratchet, bit });
const A = c('Dran Sword', '3-60', 'Flat');
const B = c('Hells Scythe', '4-60', 'Taper');
const C = c('Wizard Arrow', '4-80', 'Ball');
const X = c('Knight Shield', '3-80', 'Needle');
const Y = c('Shark Edge', '3-60', 'Low Flat');
const Z = c('Leon Claw', '5-60', 'Point');

const win = (side: 'p1' | 'p2', finish: FinishType = 'spin'): Battle => ({ winner: side, finish, at: 0 });
const draw: Battle = { winner: 'draw', at: 0 };
const err = (side: 'p1' | 'p2'): Battle => ({ winner: side, finish: 'launchError', at: 0 });

function match(battles: Battle[], extra: Partial<Match> = {}): Match {
  return {
    id: 'G-A-1', stage: 'group', groupId: 'A', round: 1, order: 1, p1: 'a', p2: 'b', battles, p1Score: 0, p2Score: 0,
    status: 'done', winner: 'a', p1Deck: [A, B, C], p2Deck: [X, Y, Z], ...extra,
  };
}

const bracket = (matches: Match[]): BracketDoc => ({
  version: 1, generatedAt: 1, format: 'roundRobin', playerIds: ['a', 'b', 'c'], groups: [{ id: 'A', name: 'A', playerIds: ['a', 'b', 'c'] }],
  matches, currentMatchIds: [],
});

describe('parts', () => {
  it('正規化：大小寫、縮寫、Ratchet 格式、別名', () => {
    expect(normalizePart('blade', ' dran  sword ')).toBe('Dran Sword');
    expect(normalizePart('blade', 'Soar Phoenix')).toBe('Phoenix Wing');
    expect(normalizePart('bit', 'lf')).toBe('Low Flat');
    expect(normalizePart('ratchet', '3 60')).toBe('3-60');
    expect(normalizePart('ratchet', '3–60')).toBe('3-60');
    expect(normalizePart('blade', '新陀螺')).toBe('新陀螺');
    expect(normalizePart('blade', '龍之劍')).toBe('Dran Sword');
  });

  it('組合寫法：Blade 用中文、Bit 用縮寫', () => {
    expect(comboLabel(A)).toBe('龍之劍 3-60F');
    expect(comboLabel(c('新陀螺', '3-60', 'Mystery'))).toBe('新陀螺 3-60 Mystery');
    expect(comboLabel({ ...C, lockChip: 'Pegasus', blade: 'Brave', assistBlade: 'Slash' })).toBe('天馬 Brave 斬擊 4-80B');
  });
});

describe('deck', () => {
  it('平手、發射失誤不換下一顆；3 顆用完從頭輪', () => {
    const bs = [win('p1'), draw, err('p1'), win('p2'), win('p1'), win('p2')];
    expect(bs.map((_, i) => slotAt(bs, i, 3))).toEqual([0, 1, 1, 1, 2, 0]);
    expect(nextBeys(match(bs, { status: 'live' }))).toEqual({ p1: B, p2: Y });
  });

  it('開打後不能改順序', () => {
    const m = match([], { status: 'live', p1Deck: undefined, p2Deck: undefined });
    expect(setMatchDecks(m, [C, B, A], [X]).p1Deck).toEqual([C, B, A]);
    expect(setMatchDecks(match([win('p1')]), [C], [X]).p1Deck).toEqual([A, B, C]);
  });

  it('checkDeck：未填完是錯誤，重複與顆數不足是提醒', () => {
    const empty = c('', '', '');
    expect(checkDeck([A, c('Dran Sword', '', ''), empty], 3).errors).toHaveLength(1);
    const r = checkDeck([A, c('dran sword', '4-60', 'B'), empty], 3);
    expect(r.errors).toEqual([]);
    expect(r.deck).toHaveLength(2);
    expect(r.warnings.join()).toMatch(/目前只有 2 顆/);
    expect(r.warnings.join()).toMatch(/Blade「Dran Sword」重複/);
    expect(checkDeck([A, B, C], 3)).toMatchObject({ errors: [], warnings: [] });
  });
});

describe('deckStatus', () => {
  it('主辦確認後 Deck 被修改 → 回到待確認', () => {
    expect(deckStatus({})).toBe('none');
    expect(deckStatus({ deck: [A, B, C] })).toBe('unconfirmed');
    const key = deckSignature([A, B, C]);
    expect(deckStatus({ deck: [A, B, C], deckCheckedKey: key })).toBe('confirmed');
    expect(deckStatus({ deck: [B, A, C], deckCheckedKey: key })).toBe('unconfirmed');
  });
});

describe('computeMeta', () => {
  it('以局計算零件勝率與終結方式；同零件互打不計', () => {
    // 第 1 局 A(3-60) vs X 贏；第 2 局 B vs Y(3-60) 輸；第 3 局 C vs Z 贏 Xtreme
    const m = match([win('p1', 'over'), win('p2'), win('p1', 'xtreme')]);
    const s = computeMeta(bracket([m]));
    expect(s.battles).toBe(3);
    const rat = s.rows.ratchet.find((r) => r.key === '360')!;
    // A(3-60) 贏 X(3-80)：+1 局 +1 勝；B(4-60) 輸 Y(3-60)：+1 局 +1 勝
    expect([rat.battles, rat.wins, rat.players]).toEqual([2, 2, 2]);
    const dran = s.rows.blade.find((r) => r.label === '龍之劍')!;
    expect([dran.battles, dran.wins, dran.finishes.over]).toEqual([1, 1, 1]);
    expect(topByFinish(s.rows.combo, 'xtreme')?.label).toBe('巫師之箭 4-80B');
  });

  it('同零件互打：該零件不計勝負', () => {
    const m = match([win('p1')], { p1Deck: [A], p2Deck: [c('Hells Scythe', '3-60', 'Ball')] });
    const rat = computeMeta(bracket([m])).rows.ratchet.find((r) => r.key === '360')!;
    expect([rat.battles, rat.wins, rat.players]).toEqual([0, 0, 2]);
  });

  it('快速輸入比分、沒有 Deck 的場次不計', () => {
    const s = computeMeta(bracket([match([win('p1')], { manualScore: true }), match([win('p1')], { id: 'x', p2Deck: undefined })]));
    expect(s.battles).toBe(0);
  });

  it('byWinRate 有樣本門檻', () => {
    const rows = [
      { key: 'a', label: 'a', players: 1, battles: 2, wins: 2, finishes: { spin: 0, over: 0, burst: 0, xtreme: 0 } },
      { key: 'b', label: 'b', players: 1, battles: 6, wins: 4, finishes: { spin: 0, over: 0, burst: 0, xtreme: 0 } },
      { key: 'c', label: 'c', players: 1, battles: 5, wins: 4, finishes: { spin: 0, over: 0, burst: 0, xtreme: 0 } },
    ];
    expect(byWinRate(rows).map((r) => r.key)).toEqual(['c', 'b']);
  });

  it('冠軍 Deck 取最後一場', () => {
    const done = (id: string, order: number, p1: string, p2: string, p1Deck: Combo[]): Match => ({
      ...match([], { id, order, p1, p2, winner: p1, p1Score: 4, p2Score: 0, manualScore: true, p1Deck }),
    });
    const s = computeMeta(bracket([done('1', 1, 'a', 'b', [A, B, C]), done('2', 2, 'a', 'c', [C, B, A]), done('3', 3, 'b', 'c', [X])]));
    expect(s.championId).toBe('a');
    expect(s.championDeck).toEqual([C, B, A]);
  });
});

describe('simulateAll（開發工具）', () => {
  it('8 人分組＋淘汰：打完後 Meta 有資料、有冠軍 Deck', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const decks = [[A, B, C], [X, Y, Z], [B, C, A], [Y, Z, X]];
    const entryById = new Map(
      ids.map((id, i) => [id, { id, nickname: id, ownerUid: id, status: 'active', checkedIn: true, createdAt: i, updatedAt: i, deck: decks[i % 4] } as EntryDoc]),
    );
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const b0 = generateBracket(ids, { format: 'groupsThenKnockout', groupCount: 2, advancePerGroup: 2 }, { now: 0, arenaCount: 1, thirdPlaceMatch: true });
    const b = simulateAll(b0, entryById, DEFAULT_RULES, rng);
    const meta = computeMeta(b);
    expect(meta.battles).toBeGreaterThan(20);
    if (b.matches.every((m) => m.status === 'done')) expect(meta.championDeck).toHaveLength(3);
  });
});
