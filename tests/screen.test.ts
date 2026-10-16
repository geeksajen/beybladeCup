import { describe, expect, it } from 'vitest';
import { COUNTDOWN_FOCUS_MS, currentStreaks, intermissionPages, isBattling, nextMatchOf, standingsChange } from '../src/engine/screen';
import { generateBracket } from '../src/engine/scheduler';
import type { BracketDoc, Match } from '../src/types';

function match(id: string, order: number, p1: string, p2: string, status: Match['status'], winner?: string, extra: Partial<Match> = {}): Match {
  const p1Won = winner === p1;
  return {
    id, stage: 'group', groupId: 'A', round: 1, order, p1, p2, battles: [], status, winner,
    p1Score: winner ? (p1Won ? 4 : 1) : 0, p2Score: winner ? (p1Won ? 1 : 4) : 0, manualScore: !!winner, ...extra,
  };
}

function bracket(matches: Match[], extra: Partial<BracketDoc> = {}): BracketDoc {
  return {
    version: 1, generatedAt: 1, format: 'roundRobin', playerIds: ['a', 'b', 'c', 'd'], groups: [{ id: 'A', name: 'A 組', playerIds: ['a', 'b', 'c', 'd'] }],
    matches, currentMatchIds: matches.filter((m) => m.status === 'live').map((m) => m.id), ...extra,
  };
}

describe('screen', () => {
  it('isBattling：進行中有局數、或剛按倒數才算對打中', () => {
    const idle = bracket([match('1', 1, 'a', 'b', 'live')]);
    expect(isBattling(idle, 1000)).toBe(false);
    const fighting = bracket([match('1', 1, 'a', 'b', 'live', undefined, { battles: [{ winner: 'draw', at: 0 }] })]);
    expect(isBattling(fighting, 1000)).toBe(true);
    expect(isBattling({ ...idle, countdownAt: 1000 }, 1000 + 5000)).toBe(true);
    expect(isBattling({ ...idle, countdownAt: 1000 }, 1000 + COUNTDOWN_FOCUS_MS + 1)).toBe(false);
    // 大螢幕時鐘比主辦手機慢幾秒也算
    expect(isBattling({ ...idle, countdownAt: 10000 }, 7000)).toBe(true);
  });

  it('中場輪播：每一頁其他資訊之間都回到目前場次', () => {
    expect(intermissionPages(['groups', 'tree'])).toEqual(['focus', 'groups', 'focus', 'tree']);
    expect(intermissionPages([])).toEqual(['focus']);
  });

  it('standingsChange：這場讓名次升降', () => {
    // a 先贏 b（a 第 1），然後 c 贏 a：c 從第 3 升到第 1 附近
    const b = bracket([match('1', 1, 'a', 'b', 'done', 'a'), match('2', 2, 'c', 'a', 'done', 'c')]);
    const rows = standingsChange(b, '2');
    const c = rows.find((r) => r.id === 'c')!;
    const a = rows.find((r) => r.id === 'a')!;
    expect(c.delta).toBeGreaterThan(0);
    expect(a.delta).toBeLessThan(0);
    expect(rows.find((r) => r.id === 'd')!.delta).toBeLessThanOrEqual(0);
  });

  it('nextMatchOf：勝者晉級到哪一場', () => {
    const b = generateBracket(['a', 'b', 'c', 'd'], { format: 'knockout' }, { now: 0, arenaCount: 1, thirdPlaceMatch: true });
    const sf = b.matches.find((m) => m.id.startsWith('KO-SF'))!;
    expect(nextMatchOf(b, sf.id)?.id).toBe('KO-F');
    expect(nextMatchOf(b, 'KO-F')).toBeUndefined();
  });

  it('currentStreaks：只算目前還在延續的連勝', () => {
    const b = bracket([
      match('1', 1, 'a', 'b', 'done', 'a'),
      match('2', 2, 'a', 'c', 'done', 'a'),
      match('3', 3, 'a', 'd', 'done', 'a'),
      match('4', 4, 'b', 'c', 'done', 'b'),
      match('5', 5, 'b', 'd', 'done', 'b'),
      match('6', 6, 'c', 'd', 'done', 'c'),
    ]);
    expect(currentStreaks(b)).toEqual([
      { id: 'a', streak: 3 },
      { id: 'b', streak: 2 },
    ]);
  });
});
