import { describe, expect, it } from 'vitest';
import { addBattle, computeScore, decidedWinner, finalizeMatch, reopenMatch, setManualScore, undoBattle } from '../src/engine/scoring';
import { DEFAULT_RULES } from '../src/lib/defaults';
import type { Battle, Match } from '../src/types';

const base: Match = { id: 'm', stage: 'group', round: 1, order: 1, p1: 'a', p2: 'b', battles: [], p1Score: 0, p2Score: 0, status: 'live' };
const bt = (winner: Battle['winner'], finish?: Battle['finish']): Battle => ({ winner, finish, at: 0 });

describe('scoring', () => {
  it('依終結方式計分', () => {
    const s = computeScore([bt('p1', 'spin'), bt('p2', 'xtreme'), bt('p1', 'over'), bt('draw')], DEFAULT_RULES);
    expect(s).toMatchObject({ p1: 3, p2: 3 });
  });

  it('發射失誤：第一次警告、第二次判對方 +1', () => {
    const s = computeScore([bt('p2', 'launchError'), bt('p2', 'launchError'), bt('p2', 'launchError')], DEFAULT_RULES);
    expect(s.p2).toBe(2);
    expect(s.launchErrors.p1).toBe(3);
    const off = computeScore([bt('p2', 'launchError'), bt('p2', 'launchError')], { ...DEFAULT_RULES, launchErrorPenalty: false });
    expect(off.p2).toBe(0);
  });

  it('達到 pointsToWin 後不能再加局，確認後完成', () => {
    let m = addBattle(base, bt('p1', 'xtreme'), DEFAULT_RULES);
    m = addBattle(m, bt('p1', 'spin'), DEFAULT_RULES);
    expect(decidedWinner(m, DEFAULT_RULES)).toBe('p1');
    const same = addBattle(m, bt('p2', 'spin'), DEFAULT_RULES);
    expect(same.battles).toHaveLength(2);
    const done = finalizeMatch(m, DEFAULT_RULES);
    expect(done.status).toBe('done');
    expect(done.winner).toBe('a');
  });

  it('撤銷最後一局', () => {
    let m = addBattle(base, bt('p1', 'over'), DEFAULT_RULES);
    m = addBattle(m, bt('p2', 'burst'), DEFAULT_RULES);
    m = undoBattle(m, DEFAULT_RULES);
    expect(m.battles).toHaveLength(1);
    expect([m.p1Score, m.p2Score]).toEqual([2, 0]);
  });

  it('未分勝負不能確認', () => {
    const m = addBattle(base, bt('p1', 'over'), DEFAULT_RULES);
    expect(finalizeMatch(m, DEFAULT_RULES).status).toBe('live');
  });

  it('快速模式直接輸入比分', () => {
    const m = setManualScore(base, 2, 4);
    expect(decidedWinner(m, DEFAULT_RULES)).toBe('p2');
    expect(finalizeMatch(m, DEFAULT_RULES).winner).toBe('b');
    expect(decidedWinner(setManualScore(base, 3, 3), DEFAULT_RULES)).toBeUndefined();
  });

  it('重新開啟', () => {
    const done = finalizeMatch(setManualScore(base, 4, 0), DEFAULT_RULES);
    const re = reopenMatch(done);
    expect(re.status).toBe('live');
    expect(re.winner).toBeUndefined();
  });
});
