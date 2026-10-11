import { describe, expect, it } from 'vitest';
import { circleRounds, generateBracket, groupSeeds, seedOrder, snakeGroups, suggestFormat } from '../src/engine/scheduler';
import { finalizeMatch, setManualScore } from '../src/engine/scoring';
import { refreshBracket } from '../src/engine/advance';
import type { BracketDoc, Match } from '../src/types';
import { DEFAULT_RULES } from '../src/lib/defaults';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gen(n: number, arenaCount = 1, thirdPlaceMatch = true) {
  return generateBracket(ids(n), suggestFormat(n), { rng: seededRng(n), now: 0, arenaCount, thirdPlaceMatch });
}

const pairKey = (m: Match) => [m.p1, m.p2].sort().join('|');

/** 依順序把每一場都打完（p1 4:0 獲勝），模擬整場比賽。 */
function playAll(b: BracketDoc, arenaCount: number, pick: (m: Match) => 'p1' | 'p2' = () => 'p1'): BracketDoc {
  let cur = b;
  for (let guard = 0; guard < 500; guard++) {
    const live = cur.matches.filter((m) => m.status === 'live');
    if (live.length === 0) break;
    const m = live[0];
    const w = pick(m);
    const scored = setManualScore(m, w === 'p1' ? 4 : 1, w === 'p2' ? 4 : 1);
    const done = finalizeMatch(scored, DEFAULT_RULES);
    cur = refreshBracket({ ...cur, matches: cur.matches.map((x) => (x.id === m.id ? done : x)) }, arenaCount);
  }
  return cur;
}

describe('circleRounds', () => {
  it.each([4, 5, 6, 7])('%i 人：每對剛好打一次、每輪每人最多一場', (n) => {
    const rounds = circleRounds(ids(n));
    const pairs = rounds.flat().map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(pairs).size).toBe((n * (n - 1)) / 2);
    expect(pairs.length).toBe((n * (n - 1)) / 2);
    for (const r of rounds) {
      const ps = r.flat();
      expect(new Set(ps).size).toBe(ps.length);
    }
  });
});

describe('snakeGroups / seeds', () => {
  it('蛇形分配', () => {
    expect(snakeGroups([1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([[1, 6, 7], [2, 5, 8], [3, 4]]);
  });
  it('seedOrder', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it('分組種子：第一輪不遇到同組', () => {
    const groups = ['A', 'B', 'C', 'D'].map((id) => ({ id, name: id, playerIds: [] }));
    const seeds = groupSeeds(groups, 2).map((s) => s.source);
    expect(seeds).toEqual(['group:A:1', 'group:B:1', 'group:C:1', 'group:D:1', 'group:A:2', 'group:D:2', 'group:C:2', 'group:B:2']);
  });
});

describe('suggestFormat', () => {
  it.each([
    [4, 'roundRobin', undefined],
    [6, 'roundRobin', undefined],
    [7, 'groupsThenKnockout', 2],
    [12, 'groupsThenKnockout', 3],
    [16, 'groupsThenKnockout', 4],
    [24, 'groupsThenKnockout', 6],
  ])('%i 人 → %s', (n, format, gc) => {
    const s = suggestFormat(n);
    expect(s.format).toBe(format);
    expect(s.groupCount).toBe(gc);
  });
});

describe('generateBracket', () => {
  it.each([4, 5, 7, 8, 12, 16, 24])('%i 人：分組內每對只打一次、每人都有比賽', (n) => {
    const b = gen(n);
    expect(b.playerIds).toHaveLength(n);
    const allInGroups = b.groups.flatMap((g) => g.playerIds);
    expect(new Set(allInGroups).size).toBe(n);
    for (const g of b.groups) {
      const ms = b.matches.filter((m) => m.groupId === g.id);
      const keys = ms.map(pairKey);
      const k = g.playerIds.length;
      expect(new Set(keys).size).toBe((k * (k - 1)) / 2);
      expect(keys.length).toBe((k * (k - 1)) / 2);
    }
    // 分組循環保證每人至少 2 場
    for (const p of b.playerIds) {
      expect(b.matches.filter((m) => m.stage === 'group' && (m.p1 === p || m.p2 === p)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each([4, 5, 7, 8, 12, 16, 24])('%i 人、2 個戰鬥盤：同一時段沒有人同時出現在兩盤', (n) => {
    const b = gen(n, 2);
    const bySlot = new Map<number, Match[]>();
    for (const m of b.matches.filter((x) => x.stage === 'group')) {
      bySlot.set(m.slot!, [...(bySlot.get(m.slot!) ?? []), m]);
    }
    for (const ms of bySlot.values()) {
      expect(ms.length).toBeLessThanOrEqual(2);
      const ps = ms.flatMap((m) => [m.p1, m.p2]);
      expect(new Set(ps).size).toBe(ps.length);
    }
    // 目前場次也不能衝突
    const live = b.matches.filter((m) => m.status === 'live');
    expect(live.length).toBe(2);
    expect(new Set(live.flatMap((m) => [m.p1, m.p2])).size).toBe(4);
  });

  it('7 人：2 組 → 4 強 → 決賽＋季軍戰', () => {
    const b = gen(7);
    expect(b.groups.map((g) => g.playerIds.length).sort()).toEqual([3, 4]);
    const ko = b.matches.filter((m) => m.stage === 'knockout').map((m) => m.id);
    expect(ko).toEqual(['KO-SF-1', 'KO-SF-2', 'KO-3RD', 'KO-F']);
  });

  it('12 人：3 組 6 人晉級 → 8 強，前 2 種子輪空', () => {
    const b = gen(12);
    const qf = b.matches.filter((m) => m.id.startsWith('KO-QF'));
    expect(qf).toHaveLength(4);
    expect(qf.filter((m) => m.isBye)).toHaveLength(2);
    expect(qf.find((m) => m.id === 'KO-QF-1')!.p1Source).toBe('group:A:1');
  });

  it('不打季軍戰時沒有 KO-3RD', () => {
    const b = gen(8, 1, false);
    expect(b.matches.some((m) => m.id === 'KO-3RD')).toBe(false);
  });

  it.each([4, 5, 7, 8, 12, 16, 24])('%i 人：完整模擬到產生最終排名', (n) => {
    const done = playAll(gen(n), 1, (m) => (m.p1! < m.p2! ? 'p1' : 'p2'));
    expect(done.matches.every((m) => m.status === 'done')).toBe(true);
    expect(done.finalRanking).toBeDefined();
    expect(done.finalRanking!.length).toBeGreaterThanOrEqual(3);
    expect(new Set(done.finalRanking).size).toBe(done.finalRanking!.length);
  });

  it('單淘汰 5 人：輪空自動晉級', () => {
    const b = generateBracket(ids(5), { format: 'knockout' }, { rng: seededRng(3), now: 0, arenaCount: 1, thirdPlaceMatch: true });
    const r1 = b.matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(4);
    expect(r1.filter((m) => m.isBye && m.status === 'done')).toHaveLength(3);
    const done = playAll(b, 1);
    expect(done.finalRanking).toHaveLength(3);
  });
});
