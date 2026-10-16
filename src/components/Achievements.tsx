import { useMemo } from 'react';
import { ACHIEVEMENT_BY_KEY, ACHIEVEMENTS, computeAchievements, type AchievementKey } from '../engine/achievements';
import { useReadyEvent } from '../providers/EventProvider';

/** 全部選手的成就（沒有賽程時是空的）。 */
export function useAchievements(): Record<string, AchievementKey[]> {
  const { bracket, event: ev } = useReadyEvent();
  return useMemo(() => (bracket ? computeAchievements(bracket, ev.rules) : {}), [bracket, ev.rules]);
}

/** 名單用的小圖示列。 */
export function BadgeIcons({ keys, className = '' }: { keys?: AchievementKey[]; className?: string }) {
  if (!keys?.length) return null;
  return (
    <span className={`inline-flex gap-0.5 ${className}`}>
      {keys.map((k) => {
        const a = ACHIEVEMENT_BY_KEY.get(k)!;
        return (
          <span key={k} title={`${a.name}：${a.desc}`} aria-label={a.name}>
            {a.icon}
          </span>
        );
      })}
    </span>
  );
}

/** 選手卡用：已解鎖的亮起來，還沒解鎖的變灰（讓小孩知道還能挑戰什麼）。 */
export function BadgeGrid({ keys }: { keys: AchievementKey[] }) {
  const got = new Set(keys);
  return (
    <div className="grid grid-cols-2 gap-2">
      {ACHIEVEMENTS.map((a) => (
        <div
          key={a.key}
          className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${got.has(a.key) ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-400'}`}
        >
          <span className={`text-2xl ${got.has(a.key) ? '' : 'opacity-40 grayscale'}`}>{a.icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold">{a.name}</div>
            <div className="text-[11px] leading-tight">{a.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
