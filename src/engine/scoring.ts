import type { Battle, Match, RuleConfig } from '../types';

type ScoreRules = Pick<RuleConfig, 'pointsToWin' | 'finishPoints' | 'launchErrorPenalty'>;

export interface ScoreResult {
  p1: number;
  p2: number;
  launchErrors: { p1: number; p2: number };
}

/**
 * 逐局累計比分。
 * 發射失誤的紀錄方式：Battle.winner = 受益的一方，finish = 'launchError'。
 * 同一場同一人第一次失誤只警告，第二次（含之後）判對方 +1（可由 launchErrorPenalty 關閉）。
 */
export function computeScore(battles: Battle[], rules: ScoreRules): ScoreResult {
  const score = { p1: 0, p2: 0 };
  const errors = { p1: 0, p2: 0 };
  for (const b of battles) {
    if (b.winner === 'draw') continue;
    if (b.finish === 'launchError') {
      const erring = b.winner === 'p1' ? 'p2' : 'p1';
      errors[erring] += 1;
      if (rules.launchErrorPenalty && errors[erring] >= 2) score[b.winner] += 1;
    } else if (b.finish) {
      score[b.winner] += rules.finishPoints[b.finish];
    }
  }
  return { p1: score.p1, p2: score.p2, launchErrors: errors };
}

/** 已有人達到 pointsToWin 時回傳領先者。 */
export function decidedWinner(match: Pick<Match, 'p1Score' | 'p2Score' | 'manualScore'>, rules: ScoreRules): 'p1' | 'p2' | undefined {
  if (match.manualScore) {
    if (match.p1Score === match.p2Score) return undefined;
    return match.p1Score > match.p2Score ? 'p1' : 'p2';
  }
  if (match.p1Score >= rules.pointsToWin && match.p1Score > match.p2Score) return 'p1';
  if (match.p2Score >= rules.pointsToWin && match.p2Score > match.p1Score) return 'p2';
  return undefined;
}

function withBattles(match: Match, battles: Battle[], rules: ScoreRules): Match {
  const s = computeScore(battles, rules);
  return { ...match, battles, p1Score: s.p1, p2Score: s.p2, manualScore: false };
}

export function addBattle(match: Match, battle: Battle, rules: ScoreRules): Match {
  if (match.status === 'done' || !match.p1 || !match.p2) return match;
  if (!match.manualScore && decidedWinner(match, rules)) return match;
  return withBattles(match, [...(match.manualScore ? [] : match.battles), battle], rules);
}

export function undoBattle(match: Match, rules: ScoreRules): Match {
  if (match.status === 'done') return match;
  if (match.manualScore) return { ...match, manualScore: false, p1Score: 0, p2Score: 0, battles: [] };
  return withBattles(match, match.battles.slice(0, -1), rules);
}

/** 快速模式：直接輸入最終比分。 */
export function setManualScore(match: Match, p1Score: number, p2Score: number): Match {
  if (match.status === 'done') return match;
  return { ...match, battles: [], p1Score, p2Score, manualScore: true };
}

export function finalizeMatch(match: Match, rules: ScoreRules): Match {
  const w = decidedWinner(match, rules);
  if (!w || !match.p1 || !match.p2) return match;
  return { ...match, status: 'done', winner: w === 'p1' ? match.p1 : match.p2 };
}

/** 重新開啟已完成的場次：保留逐局紀錄，回到進行中。 */
export function reopenMatch(match: Match): Match {
  if (match.status !== 'done' || match.isBye) return match;
  return { ...match, status: 'live', winner: undefined };
}

export function loserOf(match: Match): string | undefined {
  if (match.status !== 'done' || match.isBye || !match.winner) return undefined;
  return match.winner === match.p1 ? match.p2 : match.p1;
}
