import type { Award, BracketDoc, FinishType } from '../types';
import { computePodium } from './advance';

/** 每位選手以某種終結方式獲勝的局數。 */
export function finishCounts(b: BracketDoc, finish: FinishType): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of b.matches) {
    for (const bt of m.battles) {
      if (bt.finish !== finish || bt.winner === 'draw') continue;
      const id = bt.winner === 'p1' ? m.p1 : m.p2;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

/** 次數最多的人（同數並列；最多為 0 時沒有人）。 */
export function topIds(counts: Record<string, number>): string[] {
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return [];
  return Object.keys(counts).filter((id) => counts[id] === max);
}

export const AUTO_AWARD_KEYS = ['champion', 'runnerUp', 'third', 'xtreme', 'burst'];

/** 系統自動計算的獎項（spec §5.4）；只有名次、稱號，沒有實體獎品。 */
export function autoAwards(b: BracketDoc): Award[] {
  const podium = computePodium(b);
  const awards: Award[] = [];
  if (podium?.first) awards.push({ key: 'champion', label: '🏆 冠軍', entryIds: [podium.first] });
  if (podium?.second) awards.push({ key: 'runnerUp', label: '🥈 亞軍', entryIds: [podium.second] });
  if (podium && podium.third.length) awards.push({ key: 'third', label: '🥉 季軍', entryIds: podium.third });
  const xtreme = topIds(finishCounts(b, 'xtreme'));
  if (xtreme.length) awards.push({ key: 'xtreme', label: '🔥 Xtreme 王', entryIds: xtreme });
  const burst = topIds(finishCounts(b, 'burst'));
  if (burst.length) awards.push({ key: 'burst', label: '💥 爆裂王', entryIds: burst });
  return awards;
}

export const DEFAULT_MANUAL_AWARDS: Award[] = [{ key: 'bestName', label: '🌀 最佳陀螺命名', entryIds: [], manual: true }];
