import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENT_BY_KEY } from '../../engine/achievements';
import { diffArenaEvents, type ArenaEvent } from '../../engine/arenaEvents';
import type { ScoreRules } from '../../engine/scoring';
import { displayName } from '../../lib/format';
import { comboLabel } from '../../lib/parts';
import { playSound } from '../../lib/sound';
import type { BracketDoc, EntryDoc, FinishType } from '../../types';
import { Confetti } from './Confetti';

/** 排隊中的特效最多保留幾個（斷線重連一次收到很多變化時，只播最後幾個）。 */
const MAX_QUEUE = 6;

/** 監聽賽程變化，回傳目前要播放的特效與「播完了」的回呼。 */
export function useArenaEvents(bracket: BracketDoc | null | undefined, rules: ScoreRules): [ArenaEvent | undefined, () => void] {
  const prev = useRef(bracket);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const [queue, setQueue] = useState<ArenaEvent[]>([]);

  useEffect(() => {
    const p = prev.current;
    prev.current = bracket;
    if (!p || !bracket || p === bracket) return;
    const evs = diffArenaEvents(p, bracket, rulesRef.current, Date.now());
    if (evs.length) setQueue((q) => [...q, ...evs.filter((e) => !q.some((x) => x.id === e.id))].slice(-MAX_QUEUE));
  }, [bracket]);

  return [queue[0], () => setQueue((q) => q.slice(1))];
}

const FINISH_STYLE: Record<FinishType, { title: string; bg: string; text: string; ms: number; anim: string }> = {
  spin: { title: 'SPIN FINISH', bg: 'bg-sky-500/85', text: 'text-white', ms: 2000, anim: 'animate-pop' },
  over: { title: 'OVER FINISH!', bg: 'bg-amber-500/90', text: 'text-white', ms: 2300, anim: 'animate-zoom-in' },
  burst: { title: 'BURST FINISH!!', bg: 'bg-rose-600/90', text: 'text-white', ms: 2500, anim: 'animate-shake' },
  xtreme: {
    title: 'XTREME FINISH!!!',
    bg: 'bg-gradient-to-br from-fuchsia-600 via-violet-700 to-cyan-500',
    text: 'text-yellow-200',
    ms: 3000,
    anim: 'animate-shake',
  },
};

function durationOf(e: ArenaEvent): number {
  if (e.kind === 'finish') return FINISH_STYLE[e.finish].ms;
  if (e.kind === 'win') return 3200;
  return 2400;
}

/** 大螢幕全螢幕特效：終結技、勝利、解鎖成就。 */
export function ArenaFxOverlay({
  event,
  entryById,
  sound,
  onDone,
}: {
  event: ArenaEvent;
  entryById: Map<string, EntryDoc>;
  sound: boolean;
  onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (sound) playSound(event.kind === 'finish' ? event.finish : event.kind);
    const t = setTimeout(() => done.current(), durationOf(event));
    return () => clearTimeout(t);
    // 每個事件只播一次
  }, [event.id]);

  if (event.kind === 'finish') {
    const s = FINISH_STYLE[event.finish];
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${s.bg} ${event.finish === 'xtreme' ? 'animate-flash' : ''}`}>
        <div className={`${s.anim} font-display text-center text-7xl leading-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.25)] md:text-[9rem] ${s.text}`}>{s.title}</div>
        <div className="animate-pop mt-8 text-center text-5xl font-black text-white drop-shadow md:text-7xl" style={{ animationDelay: '0.3s' }}>
          {displayName(entryById.get(event.winnerId))}
        </div>
        {event.combo && (
          <div className="animate-pop mt-3 rounded-full bg-black/25 px-6 py-1 text-3xl font-bold text-white md:text-5xl" style={{ animationDelay: '0.4s' }}>
            🌀 {comboLabel(event.combo)}
          </div>
        )}
        <div className="font-display animate-pop mt-4 text-6xl text-white md:text-8xl" style={{ animationDelay: '0.5s' }}>
          +{event.points}
        </div>
      </div>
    );
  }

  if (event.kind === 'win') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur">
        <Confetti count={120} />
        <div className="font-display neon-text animate-pop text-7xl text-amber-500 md:text-[9rem]">WINNER</div>
        <div className="animate-pop mt-6 text-8xl md:text-[10rem]" style={{ animationDelay: '0.2s' }}>
          {entryById.get(event.winnerId)?.emoji ?? '🌀'}
        </div>
        <div className="animate-pop mt-2 text-5xl font-black md:text-7xl" style={{ animationDelay: '0.35s' }}>
          {entryById.get(event.winnerId)?.nickname ?? '？'}
        </div>
        <div className="font-display mt-6 text-5xl text-slate-600 md:text-6xl">
          {event.winnerScore} : {event.loserScore}
        </div>
        <div className="mt-3 text-2xl text-slate-500 md:text-3xl">{displayName(entryById.get(event.loserId))} 也打得很棒！</div>
      </div>
    );
  }

  const a = ACHIEVEMENT_BY_KEY.get(event.achievement);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-8 z-50 flex justify-center px-4">
      <div className="animate-slide-down flex items-center gap-5 rounded-3xl border-4 border-amber-400 bg-white px-8 py-5 shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
        <div className="text-7xl">{a?.icon}</div>
        <div>
          <div className="text-xl font-bold text-amber-600 md:text-2xl">🔓 解鎖成就</div>
          <div className="text-4xl font-black md:text-5xl">{a?.name}</div>
          <div className="mt-1 text-2xl font-bold text-slate-700 md:text-3xl">{displayName(entryById.get(event.entryId))}</div>
        </div>
      </div>
    </div>
  );
}
