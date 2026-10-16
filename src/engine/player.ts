import type { BracketDoc, FinishType, Match, RuleConfig } from '../types';
import { groupRanking } from './advance';

export interface PlayerSummary {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  /** 以各種終結方式贏下的局數。 */
  finishes: Record<FinishType, number>;
  /** 這位選手的所有場次（不含輪空），依場次順序。 */
  matches: Match[];
}

export function playerMatches(b: BracketDoc, id: string): Match[] {
  return b.matches.filter((m) => !m.isBye && (m.p1 === id || m.p2 === id)).sort((x, y) => x.order - y.order);
}

export function playerSummary(b: BracketDoc, id: string): PlayerSummary {
  const s: PlayerSummary = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, finishes: { spin: 0, over: 0, burst: 0, xtreme: 0 }, matches: playerMatches(b, id) };
  for (const m of s.matches) {
    if (m.status === 'pending') continue;
    const side = m.p1 === id ? 'p1' : 'p2';
    s.pointsFor += side === 'p1' ? m.p1Score : m.p2Score;
    s.pointsAgainst += side === 'p1' ? m.p2Score : m.p1Score;
    for (const bt of m.battles) if (bt.winner === side && bt.finish && bt.finish !== 'launchError') s.finishes[bt.finish]++;
    if (m.status !== 'done') continue;
    if (m.winner === id) s.wins++;
    else if (m.winner) s.losses++;
  }
  return s;
}

export type NextUp =
  | { kind: 'live'; match: Match }
  /** ahead：排在前面、還沒開打的場次數；onDeck：下一輪就輪到。 */
  | { kind: 'next'; match: Match; ahead: number; onDeck: boolean; etaMinutes: number }
  /** 分組名次還沒確定（還沒比完或同分待決定），要看結果才知道有沒有下一場。 */
  | { kind: 'waiting' }
  | { kind: 'done' };

/** 「下一場是你！」：這位選手目前在比、下一場還要等多久，或已經沒有場次。 */
export function playerNextUp(b: BracketDoc, id: string, rules: Pick<RuleConfig, 'arenaCount' | 'minutesPerMatch'>): NextUp {
  const mine = playerMatches(b, id);
  const live = mine.find((m) => m.status === 'live');
  if (live) return { kind: 'live', match: live };

  const queue = b.matches.filter((m) => m.status === 'pending' && !m.isBye).sort((x, y) => x.order - y.order);
  const idx = queue.findIndex((m) => m.p1 === id || m.p2 === id);
  if (idx >= 0) {
    const arenas = Math.max(1, rules.arenaCount);
    return {
      kind: 'next',
      match: queue[idx],
      ahead: idx,
      onDeck: idx < arenas,
      // 目前進行中的場次也要等，所以 +1
      etaMinutes: Math.ceil((idx + 1) / arenas) * rules.minutesPerMatch,
    };
  }

  const group = b.groups.find((g) => g.playerIds.includes(id));
  const hasKnockout = b.matches.some((m) => m.stage === 'knockout');
  if (group && hasKnockout && !groupRanking(b, group.id)) return { kind: 'waiting' };
  return { kind: 'done' };
}
