import { ACHIEVEMENT_BY_KEY } from '../../engine/achievements';
import type { ArenaEvent } from '../../engine/arenaEvents';
import { finishCounts, topIds } from '../../engine/awards';
import { byWinRate, META_MIN_BATTLES, type MetaStats } from '../../engine/meta';
import { tallyPredictions } from '../../engine/predictions';
import { currentStreaks } from '../../engine/screen';
import { formatTime } from '../../lib/format';
import type { BracketDoc, EntryDoc, EventDoc, PredictionDoc } from '../../types';

interface TickerInput {
  bracket: BracketDoc;
  ev: EventDoc;
  entryById: Map<string, EntryDoc>;
  preds: PredictionDoc[];
  meta?: MetaStats;
  recentAchievements: Extract<ArenaEvent, { kind: 'achievement' }>[];
  now: number;
}

/** 跑馬燈的內容：比賽進度、連勝、Xtreme 王／爆裂王領先者、剛解鎖的成就、猜冠軍、Meta。 */
export function tickerItems({ bracket: b, ev, entryById, preds, meta, recentAchievements, now }: TickerInput): string[] {
  const name = (id: string) => entryById.get(id)?.nickname ?? '？';
  const items: string[] = [];

  const real = b.matches.filter((m) => !m.isBye);
  const done = real.filter((m) => m.status === 'done').length;
  const remaining = real.length - done;
  if (remaining > 0) {
    const endAt = now + Math.ceil(remaining / Math.max(1, ev.rules.arenaCount)) * ev.rules.minutesPerMatch * 60000;
    items.push(`⚔️ 已完成 ${done} / ${real.length} 場，預計 ${formatTime(endAt)} 結束`);
  }

  for (const s of currentStreaks(b).slice(0, 2)) items.push(`⚡ ${name(s.id)} ${s.streak} 連勝中！`);

  for (const a of recentAchievements.slice(0, 3)) {
    const def = ACHIEVEMENT_BY_KEY.get(a.achievement);
    if (def) items.push(`🔓 ${name(a.entryId)} 解鎖成就「${def.icon} ${def.name}」`);
  }

  const leader = (finish: 'xtreme' | 'burst', label: string) => {
    const counts = finishCounts(b, finish);
    const ids = topIds(counts);
    if (ids.length && ids.length <= 3) items.push(`${label}目前：${ids.map(name).join('、')}（${counts[ids[0]]} 次）`);
  };
  leader('xtreme', '🔥 Xtreme 王');
  leader('burst', '💥 爆裂王');

  if (ev.predictionsOpen) {
    const top = tallyPredictions(preds, b.playerIds)[0];
    items.push(top ? `🔮 猜冠軍人氣第一：${name(top.id)}（${top.votes} 票）・手機投票中！` : '🔮 猜冠軍投票中，用手機打開比賽網站投一票！');
  }

  if (meta && meta.battles >= META_MIN_BATTLES) {
    const popular = meta.rows.blade[0];
    if (popular) items.push(`📊 最多人用的 Blade：${popular.label}（${popular.players} 人）`);
    const bit = byWinRate(meta.rows.bit)[0];
    if (bit) items.push(`🎯 目前勝率最高的 Bit：${bit.label}（${bit.battles} 局 ${bit.wins} 勝）`);
  }
  return items;
}

/** 底部一行慢慢捲動的跑馬燈（內容複製兩份，捲到一半剛好接回開頭）。 */
export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const text = items.join('　　◆　　');
  // 依長度決定速度，取整到 10 秒，避免每次內容小變動就改速度造成跳動
  const seconds = Math.max(30, Math.round((text.length * 0.35) / 10) * 10);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 overflow-hidden border-t-2 border-fuchsia-300 bg-white/95 py-3">
      <div className="animate-marquee flex w-max whitespace-nowrap text-3xl font-bold text-slate-700" style={{ animationDuration: `${seconds}s` }}>
        <span className="pr-24">{text}</span>
        <span className="pr-24" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  );
}
