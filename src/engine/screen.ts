import type { BracketDoc, Match } from '../types';
import { groupMatches } from './advance';
import { computeStandings } from './standings';

/** 主辦按「3, 2, 1, Go Shoot!」後這段時間內視為對打中（第一局通常還沒輸入）。 */
export const COUNTDOWN_FOCUS_MS = 60000;
/** 一場結束後顯示「積分更新」多久（含前面 WINNER 特效約 3 秒）。 */
export const POST_MATCH_MS = 15000;

export function liveMatches(b: BracketDoc): Match[] {
  return b.currentMatchIds.map((id) => b.matches.find((m) => m.id === id)).filter((m): m is Match => !!m);
}

/** 對打中：有任何進行中的場次已經有局數，或主辦剛按了倒數。 */
export function isBattling(b: BracketDoc, now: number): boolean {
  // 用絕對值：主辦手機和大螢幕的時鐘可能差幾秒
  if (b.countdownAt && Math.abs(now - b.countdownAt) < COUNTDOWN_FOCUS_MS) return true;
  return liveMatches(b).some((m) => m.battles.length > 0 || m.manualScore);
}

export type ScreenPage = 'focus' | 'groups' | 'tree' | 'predict' | 'meta';

/** 中場休息的輪播：每看一頁其他資訊就回到目前場次（下一場是誰最重要）。 */
export function intermissionPages(extra: ScreenPage[]): ScreenPage[] {
  const pages: ScreenPage[] = [];
  for (const p of extra) pages.push('focus', p);
  return pages.length ? pages : ['focus'];
}

export function pageDuration(p: ScreenPage): number {
  return p === 'focus' ? 15000 : 10000;
}

export interface RankChange {
  id: string;
  rank: number;
  /** 這場之前的名次（正數 = 名次往上升了幾名）。 */
  delta: number;
  wins: number;
  losses: number;
  diff: number;
  tied: boolean;
}

/** 分組場次結束後的積分變化：比較「不算這一場」與「算這一場」的名次。 */
export function standingsChange(b: BracketDoc, matchId: string): RankChange[] {
  const m = b.matches.find((x) => x.id === matchId);
  const g = b.groups.find((x) => x.id === m?.groupId);
  if (!m || !g) return [];
  const all = groupMatches(b, g.id);
  const before = computeStandings(g.playerIds, all.filter((x) => x.id !== matchId), b.manualOrder?.[g.id]);
  const after = computeStandings(g.playerIds, all, b.manualOrder?.[g.id]);
  const prevRank = new Map(before.map((r) => [r.id, r.rank]));
  return after.map((r) => ({ id: r.id, rank: r.rank, delta: (prevRank.get(r.id) ?? r.rank) - r.rank, wins: r.wins, losses: r.losses, diff: r.diff, tied: r.tied }));
}

/** 淘汰賽：這場勝者接下來要打的場次。 */
export function nextMatchOf(b: BracketDoc, matchId: string): Match | undefined {
  return b.matches.find((m) => m.p1Source === `winner:${matchId}` || m.p2Source === `winner:${matchId}`);
}

/** 目前連勝中的場數（只算 ≥ 2 的人），用在跑馬燈。 */
export function currentStreaks(b: BracketDoc): { id: string; streak: number }[] {
  const streak = new Map<string, number>();
  const done = b.matches.filter((m) => m.status === 'done' && !m.isBye && m.p1 && m.p2).sort((x, y) => x.order - y.order);
  for (const m of done) {
    for (const id of [m.p1!, m.p2!]) streak.set(id, m.winner === id ? (streak.get(id) ?? 0) + 1 : 0);
  }
  return [...streak.entries()].filter(([, s]) => s >= 2).map(([id, s]) => ({ id, streak: s })).sort((a, b) => b.streak - a.streak);
}
