import type { IconName } from '../components/icons';
import type { BracketDoc, FinishType, Match } from '../types';
import { computeScore, type ScoreRules } from './scoring';

export type AchievementKey = 'firstPoint' | 'firstWin' | 'shutout' | 'comeback' | 'streak3' | 'doubleXtreme' | 'allFinishes';

export interface AchievementDef {
  key: AchievementKey;
  icon: IconName;
  name: string;
  desc: string;
  /** 大螢幕要不要跳出「解鎖成就」（太常見的不跳，避免洗版）。 */
  announce: boolean;
}

/** 顯示順序 = 這個陣列的順序。 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'firstPoint', icon: 'sparkle', name: '第一分', desc: '在比賽中拿到第一分', announce: false },
  { key: 'firstWin', icon: 'party', name: '首勝', desc: '贏得第一場對戰', announce: true },
  { key: 'shutout', icon: 'shield', name: '完封', desc: '贏一場對戰，而且對手 0 分', announce: true },
  { key: 'comeback', icon: 'comeback', name: '絕地逆轉', desc: '對手只差 1 分就贏，還是被你逆轉', announce: true },
  { key: 'streak3', icon: 'bolt', name: '三連勝', desc: '連續贏 3 場對戰', announce: true },
  { key: 'doubleXtreme', icon: 'gem', name: '雙重 Xtreme', desc: '同一場打出 2 次 Xtreme Finish', announce: true },
  { key: 'allFinishes', icon: 'master', name: '招式大師', desc: 'Spin、Over、Burst、Xtreme 四種終結都用過', announce: true },
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

const ALL_FINISHES: FinishType[] = ['spin', 'over', 'burst', 'xtreme'];

/** 已完成、非輪空的場次，依場次順序。 */
function doneMatches(b: BracketDoc): Match[] {
  return b.matches.filter((m) => m.status === 'done' && !m.isBye && m.p1 && m.p2).sort((x, y) => x.order - y.order);
}

/** 對手曾經領先並且只差 1 分（或更少）就贏，最後還是輸了。快速輸入比分的場次沒有逐局紀錄，不計。 */
function isComeback(m: Match, side: 'p1' | 'p2', rules: ScoreRules): boolean {
  if (m.manualScore) return false;
  const opp = side === 'p1' ? 'p2' : 'p1';
  for (let i = 1; i <= m.battles.length; i++) {
    const s = computeScore(m.battles.slice(0, i), rules);
    if (s[opp] > s[side] && s[opp] >= rules.pointsToWin - 1) return true;
  }
  return false;
}

/**
 * 每位選手解鎖的成就（純函式，從逐局紀錄推導，不存資料庫）。
 * 只計算已完成的場次：場次重新開啟時，相關成就會暫時消失。
 */
export function computeAchievements(b: BracketDoc, rules: ScoreRules): Record<string, AchievementKey[]> {
  const got = new Map<string, Set<AchievementKey>>();
  const add = (id: string, key: AchievementKey) => {
    if (!got.has(id)) got.set(id, new Set());
    got.get(id)!.add(key);
  };
  const streak = new Map<string, number>();
  const finishesUsed = new Map<string, Set<FinishType>>();

  for (const m of doneMatches(b)) {
    for (const side of ['p1', 'p2'] as const) {
      const id = side === 'p1' ? m.p1! : m.p2!;
      const mine = side === 'p1' ? m.p1Score : m.p2Score;
      const theirs = side === 'p1' ? m.p2Score : m.p1Score;
      const won = m.winner === id;

      if (mine > 0) add(id, 'firstPoint');
      if (won) {
        add(id, 'firstWin');
        if (theirs === 0) add(id, 'shutout');
        if (isComeback(m, side, rules)) add(id, 'comeback');
      }
      const s = won ? (streak.get(id) ?? 0) + 1 : 0;
      streak.set(id, s);
      if (s >= 3) add(id, 'streak3');

      const myBattles = m.battles.filter((bt) => bt.winner === side);
      if (myBattles.filter((bt) => bt.finish === 'xtreme').length >= 2) add(id, 'doubleXtreme');
      if (!finishesUsed.has(id)) finishesUsed.set(id, new Set());
      for (const bt of myBattles) if (bt.finish && bt.finish !== 'launchError') finishesUsed.get(id)!.add(bt.finish);
      if (ALL_FINISHES.every((f) => finishesUsed.get(id)!.has(f))) add(id, 'allFinishes');
    }
  }

  const out: Record<string, AchievementKey[]> = {};
  for (const [id, set] of got) out[id] = ACHIEVEMENTS.map((a) => a.key).filter((k) => set.has(k));
  return out;
}
