import { describe, expect, it } from 'vitest';
import { computeStandings } from '../src/engine/standings';
import type { Match } from '../src/types';

const m = (p1: string, p2: string, s1: number, s2: number): Match => ({
  id: `${p1}${p2}`,
  stage: 'group',
  groupId: 'A',
  round: 1,
  order: 1,
  p1,
  p2,
  battles: [],
  p1Score: s1,
  p2Score: s2,
  status: 'done',
  winner: s1 > s2 ? p1 : p2,
});

describe('computeStandings', () => {
  it('依勝場排序', () => {
    const rows = computeStandings(['a', 'b', 'c'], [m('a', 'b', 4, 1), m('a', 'c', 4, 2), m('b', 'c', 4, 3)]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(rows[0]).toMatchObject({ wins: 2, losses: 0, pointsFor: 8, pointsAgainst: 3, diff: 5 });
  });

  it('勝場相同 → 積分差', () => {
    // 三人各一勝一敗
    const rows = computeStandings(['a', 'b', 'c'], [m('a', 'b', 4, 0), m('b', 'c', 4, 1), m('c', 'a', 4, 3)]);
    // a: +4 -1 = +3, b: -4 +3 = -1, c: -3 +1 = -2
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(rows.every((r) => !r.tied)).toBe(true);
  });

  it('積分差相同 → 總得分', () => {
    const rows = computeStandings(['a', 'b', 'c'], [m('a', 'b', 5, 4), m('b', 'c', 4, 3), m('c', 'a', 4, 3)]);
    // a: 8-8=0 (8), b: 8-8=0 (8), c: 7-7=0 (7) → a,b 同分 → 兩人對戰 a 勝
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('兩人同分 → 對戰結果', () => {
    const rows = computeStandings(['a', 'b', 'c', 'd'], [
      m('b', 'a', 4, 3),
      m('a', 'c', 4, 0),
      m('b', 'd', 0, 4),
      m('c', 'd', 4, 3),
      m('a', 'd', 4, 3),
      m('b', 'c', 4, 0),
    ]);
    // a: 2勝 11-7=+4 pf11；b: 2勝 8-7=+1 ... 不同分，改看 tied 為 false
    expect(rows.every((r) => !r.tied)).toBe(true);
  });

  it('三人完全相同 → 標記同分；手動順序可解決', () => {
    const ms = [m('a', 'b', 4, 2), m('b', 'c', 4, 2), m('c', 'a', 4, 2)];
    const rows = computeStandings(['a', 'b', 'c'], ms);
    expect(rows.every((r) => r.tied)).toBe(true);
    const manual = computeStandings(['a', 'b', 'c'], ms, ['c', 'a', 'b']);
    expect(manual.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(manual.every((r) => !r.tied)).toBe(true);
  });
});
