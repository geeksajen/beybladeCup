import { useEffect, useRef, useState } from 'react';
import { ACHIEVEMENT_BY_KEY } from '../../engine/achievements';
import { diffArenaEvents, type ArenaEvent } from '../../engine/arenaEvents';
import type { ScoreRules } from '../../engine/scoring';
import { comboLabel } from '../../lib/parts';
import { playSound } from '../../lib/sound';
import type { BracketDoc, EntryDoc, FinishType } from '../../types';
import { Avatar, PlayerName } from '../avatars';
import { Icon } from '../icons';
import { Confetti } from './Confetti';

/** 排隊中的特效最多保留幾個（斷線重連一次收到很多變化時，只播最後幾個）。 */
const MAX_QUEUE = 6;

type AchievementEvent = Extract<ArenaEvent, { kind: 'achievement' }>;

export interface ArenaEventState {
  /** 目前要播放的特效。 */
  current?: ArenaEvent;
  /** 播完了，換下一個。 */
  next: () => void;
  /** 最近一場結束（大螢幕切到「積分更新」用）。 */
  lastWin?: { matchId: string; at: number };
  /** 最近解鎖的成就（新的在前，跑馬燈用）。 */
  recentAchievements: AchievementEvent[];
}

/** 監聽賽程變化，回傳要播放的特效、最近一場結束與最近解鎖的成就。 */
export function useArenaEvents(bracket: BracketDoc | null | undefined, rules: ScoreRules): ArenaEventState {
  const prev = useRef(bracket);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const [queue, setQueue] = useState<ArenaEvent[]>([]);
  const [lastWin, setLastWin] = useState<{ matchId: string; at: number }>();
  const [recent, setRecent] = useState<AchievementEvent[]>([]);

  useEffect(() => {
    const p = prev.current;
    prev.current = bracket;
    if (!p || !bracket || p === bracket) return;
    const evs = diffArenaEvents(p, bracket, rulesRef.current, Date.now());
    if (!evs.length) return;
    setQueue((q) => [...q, ...evs.filter((e) => !q.some((x) => x.id === e.id))].slice(-MAX_QUEUE));
    const win = [...evs].reverse().find((e) => e.kind === 'win');
    if (win?.kind === 'win') setLastWin({ matchId: win.matchId, at: Date.now() });
    const ach = evs.filter((e): e is AchievementEvent => e.kind === 'achievement').reverse();
    if (ach.length) setRecent((r) => [...ach, ...r.filter((x) => !ach.some((a) => a.id === x.id))].slice(0, 5));
  }, [bracket]);

  return { current: queue[0], next: () => setQueue((q) => q.slice(1)), lastWin, recentAchievements: recent };
}

const FINISH_STYLE: Record<FinishType, { title: string; bg: string; text: string; ms: number; anim: string }> = {
  spin: { title: 'SPIN FINISH', bg: 'bg-primary/85', text: 'text-on', ms: 2000, anim: 'animate-pop' },
  over: { title: 'OVER FINISH!', bg: 'bg-gold/90', text: 'text-on', ms: 2300, anim: 'animate-zoom-in' },
  burst: { title: 'BURST FINISH!!', bg: 'bg-accent/90', text: 'text-on', ms: 2500, anim: 'animate-shake' },
  xtreme: {
    title: 'XTREME FINISH!!!',
    bg: 'bg-gradient-to-br from-accent via-xtreme to-primary',
    text: 'text-white',
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
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${s.bg} ${s.text} ${event.finish === 'xtreme' ? 'animate-flash' : ''}`}>
        <Icon name={event.finish} className={`${s.anim} mb-4 text-8xl md:text-[10rem]`} />
        <div className={`${s.anim} font-display text-center text-7xl leading-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.25)] md:text-[9rem]`}>{s.title}</div>
        <div className="animate-pop mt-8 text-center text-5xl font-black drop-shadow md:text-7xl" style={{ animationDelay: '0.3s' }}>
          <PlayerName entry={entryById.get(event.winnerId)} />
        </div>
        {event.combo && (
          <div className="animate-pop mt-3 rounded-full bg-black/25 px-6 py-1 text-3xl font-bold text-white md:text-5xl" style={{ animationDelay: '0.4s' }}>
            <Icon name="bey" className="mr-2" />
            {comboLabel(event.combo)}
          </div>
        )}
        <div className="font-display animate-pop mt-4 text-6xl md:text-8xl" style={{ animationDelay: '0.5s' }}>
          +{event.points}
        </div>
      </div>
    );
  }

  if (event.kind === 'win') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas/95 backdrop-blur">
        <Confetti count={120} />
        <div className="font-display neon-text animate-pop text-7xl text-gold md:text-[9rem]">WINNER</div>
        <div className="animate-pop mt-6 text-8xl md:text-[10rem]" style={{ animationDelay: '0.2s' }}>
          <Avatar value={entryById.get(event.winnerId)?.emoji} />
        </div>
        <div className="animate-pop mt-2 text-5xl font-black md:text-7xl" style={{ animationDelay: '0.35s' }}>
          {entryById.get(event.winnerId)?.nickname ?? '？'}
        </div>
        <div className="font-display mt-6 text-5xl text-ink-muted md:text-6xl">
          {event.winnerScore} : {event.loserScore}
        </div>
        <div className="mt-3 text-2xl text-ink-muted md:text-3xl"><PlayerName entry={entryById.get(event.loserId)} /> 也打得很棒！</div>
      </div>
    );
  }

  const a = ACHIEVEMENT_BY_KEY.get(event.achievement);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-8 z-50 flex justify-center px-4">
      <div className="animate-slide-down flex items-center gap-5 rounded-3xl border-4 border-gold bg-surface px-8 py-5 shadow-[0_8px_40px_rgb(var(--gold)/0.45)]">
        {a && <Icon name={a.icon} className="text-7xl text-gold" />}
        <div>
          <div className="text-xl font-bold text-gold md:text-2xl">
            <Icon name="unlock" className="mr-1.5" />
            解鎖成就
          </div>
          <div className="text-4xl font-black md:text-5xl">{a?.name}</div>
          <div className="mt-1 text-2xl font-bold text-ink md:text-3xl"><PlayerName entry={entryById.get(event.entryId)} /></div>
        </div>
      </div>
    </div>
  );
}
