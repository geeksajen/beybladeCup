import { describe, expect, it } from 'vitest';
import { autoAwards, finishCounts, topIds } from '../src/engine/awards';
import { downstreamStarted, refreshBracket, startMatchNow } from '../src/engine/advance';
import { generateBracket } from '../src/engine/scheduler';
import { addBattle, finalizeMatch, reopenMatch } from '../src/engine/scoring';
import { DEFAULT_RULES } from '../src/lib/defaults';
import type { BracketDoc, FinishType } from '../src/types';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function scoreLive(b: BracketDoc, finish: FinishType, sideArg?: 'p1' | 'p2'): BracketDoc {
  const m = b.matches.find((x) => x.status === 'live')!;
  // 預設編號小的贏，避免循環賽出現三人同分
  const side = sideArg ?? (Number(m.p1!.slice(1)) < Number(m.p2!.slice(1)) ? 'p1' : 'p2');
  let cur = m;
  while (!['done'].includes(cur.status)) {
    const next = addBattle(cur, { winner: side, finish, at: 0 }, DEFAULT_RULES);
    if (next === cur) break;
    cur = next;
  }
  cur = finalizeMatch(cur, DEFAULT_RULES);
  return refreshBracket({ ...b, matches: b.matches.map((x) => (x.id === m.id ? cur : x)) }, 1);
}

describe('awards', () => {
  it('topIds 並列與 0', () => {
    expect(topIds({ a: 2, b: 2, c: 1 })).toEqual(['a', 'b']);
    expect(topIds({ a: 0 })).toEqual([]);
  });

  it('單循環 4 人：冠亞季與 Xtreme 王', () => {
    let b = generateBracket(ids(4), { format: 'roundRobin' }, { now: 0, arenaCount: 1, thirdPlaceMatch: true });
    let i = 0;
    while (b.matches.some((m) => m.status === 'live')) {
      b = scoreLive(b, i === 0 ? 'xtreme' : 'spin');
      i++;
    }
    const xt = finishCounts(b, 'xtreme');
    expect(Object.values(xt)).toEqual([2]);
    const awards = autoAwards(b);
    const keys = awards.map((a) => a.key);
    expect(keys).toContain('xtreme');
    expect(keys).not.toContain('burst');
    if (b.finalRanking) {
      expect(keys).toEqual(expect.arrayContaining(['champion', 'runnerUp', 'third']));
    }
  });
});

describe('advance', () => {
  it('重新開啟分組場次且淘汰賽已開打 → 警告', () => {
    let b = generateBracket(ids(7), { format: 'groupsThenKnockout', groupCount: 2, advancePerGroup: 2 }, {
      now: 0,
      arenaCount: 1,
      thirdPlaceMatch: true,
    });
    while (b.matches.some((m) => m.status === 'live' && m.stage === 'group')) b = scoreLive(b, 'over');
    const groupMatch = b.matches.find((m) => m.stage === 'group')!;
    expect(downstreamStarted(b, groupMatch.id)).toBe(false);
    const ko = b.matches.find((m) => m.status === 'live')!;
    b = { ...b, matches: b.matches.map((m) => (m.id === ko.id ? addBattle(m, { winner: 'p1', finish: 'spin', at: 0 }, DEFAULT_RULES) : m)) };
    expect(downstreamStarted(b, groupMatch.id)).toBe(true);
  });

  it('改打指定場次', () => {
    const b = generateBracket(ids(5), { format: 'roundRobin' }, { now: 0, arenaCount: 1, thirdPlaceMatch: true });
    const pending = b.matches.find((m) => m.status === 'pending' && !b.currentMatchIds.includes(m.id))!;
    const next = startMatchNow(b, pending.id, 1);
    expect(next.currentMatchIds).toEqual([pending.id]);
  });

  it('重新開啟後改判，淘汰賽選手跟著更新', () => {
    let b = generateBracket(ids(4), { format: 'knockout' }, { now: 0, arenaCount: 1, thirdPlaceMatch: false });
    b = scoreLive(b, 'over', 'p1');
    const sf1 = b.matches.find((m) => m.id === 'KO-SF-1')!;
    const final1 = b.matches.find((m) => m.id === 'KO-F')!;
    expect(final1.p1).toBe(sf1.winner);
    const reopened = reopenMatch(sf1);
    b = refreshBracket({ ...b, matches: b.matches.map((m) => (m.id === sf1.id ? reopened : m)) }, 1);
    expect(b.matches.find((m) => m.id === 'KO-F')!.p1).toBeUndefined();
  });
});
