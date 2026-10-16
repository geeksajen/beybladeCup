import type { BracketDoc, FinishType } from '../types';
import { ACHIEVEMENT_BY_KEY, computeAchievements, type AchievementKey } from './achievements';
import type { ScoreRules } from './scoring';

/** 大螢幕要播放的特效事件（比較前後兩版賽程得出，不存資料庫）。 */
export type ArenaEvent =
  | { kind: 'finish'; id: string; finish: FinishType; winnerId: string; points: number }
  | { kind: 'win'; id: string; winnerId: string; loserId: string; winnerScore: number; loserScore: number }
  | { kind: 'achievement'; id: string; entryId: string; achievement: AchievementKey };

/** 逐局紀錄超過這個時間才收到（例如大螢幕斷線後重連），就不播放終結特效。 */
export const EVENT_FRESH_MS = 15000;

/**
 * 比較前後兩版賽程，找出新的終結技、勝利與解鎖的成就。
 * 重新產生賽程（generatedAt 不同）時不產生任何事件。
 */
export function diffArenaEvents(prev: BracketDoc, next: BracketDoc, rules: ScoreRules, now: number): ArenaEvent[] {
  if (prev.generatedAt !== next.generatedAt) return [];
  const events: ArenaEvent[] = [];
  const prevById = new Map(prev.matches.map((m) => [m.id, m]));

  for (const m of next.matches) {
    const before = prevById.get(m.id);
    if (!before || m.isBye || !m.p1 || !m.p2) continue;

    if (m.battles.length > before.battles.length && m.status !== 'done') {
      m.battles.slice(before.battles.length).forEach((bt, i) => {
        if (bt.winner === 'draw' || !bt.finish || bt.finish === 'launchError') return;
        if (now - bt.at > EVENT_FRESH_MS) return;
        events.push({
          kind: 'finish',
          id: `${m.id}:b${before.battles.length + i}`,
          finish: bt.finish,
          winnerId: bt.winner === 'p1' ? m.p1! : m.p2!,
          points: rules.finishPoints[bt.finish],
        });
      });
    }

    if (before.status !== 'done' && m.status === 'done' && m.winner) {
      const p1Won = m.winner === m.p1;
      events.push({
        kind: 'win',
        id: `${m.id}:win`,
        winnerId: m.winner,
        loserId: p1Won ? m.p2 : m.p1,
        winnerScore: p1Won ? m.p1Score : m.p2Score,
        loserScore: p1Won ? m.p2Score : m.p1Score,
      });
    }
  }

  const before = computeAchievements(prev, rules);
  const after = computeAchievements(next, rules);
  for (const [entryId, keys] of Object.entries(after)) {
    const had = new Set(before[entryId] ?? []);
    for (const key of keys) {
      if (had.has(key) || !ACHIEVEMENT_BY_KEY.get(key)?.announce) continue;
      events.push({ kind: 'achievement', id: `${entryId}:${key}`, entryId, achievement: key });
    }
  }
  return events;
}
