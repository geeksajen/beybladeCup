import { useEffect, useRef, useState } from 'react';
import { GroupTable } from '../components/bracket/GroupTable';
import { KnockoutTree } from '../components/bracket/KnockoutTree';
import { LiveMatches, upcomingMatches } from '../components/bracket/LiveMatch';
import { Confetti } from '../components/fx/Confetti';
import { Countdown } from '../components/fx/Countdown';
import { DrawAnimation } from '../components/fx/DrawAnimation';
import { classifyEntries } from '../engine/registration';
import { describeSource, displayName, formatCountdown, formatDateTime, matchLabel } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';
import type { BracketDoc, Match } from '../types';
import { ResultsView } from './Results';

type View = 'live' | 'groups' | 'tree';
const ROTATE_MS = 12000;
/** 同步動畫只在觸發後這段時間內打開大螢幕才會播放（避免重新整理時重播舊動畫）。 */
const FRESH_MS = 15000;

/** 偵測某個時間戳記欄位被更新（例如 drawAt、countdownAt），回傳是否該播放。 */
function useTrigger(value: number | undefined): [boolean, () => void] {
  const seen = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (value && value !== seen.current) {
      seen.current = value;
      if (Math.abs(Date.now() - value) < FRESH_MS) setActive(true);
    }
  }, [value]);
  return [active, () => setActive(false)];
}

export default function Screen() {
  const { event: ev, bracket, entries, entryById } = useReadyEvent();
  const now = useNow();
  const [viewIdx, setViewIdx] = useState(0);
  const [isFull, setIsFull] = useState(false);
  const [drawing, stopDrawing] = useTrigger(bracket?.drawAt);
  const [countingDown, stopCountdown] = useTrigger(bracket?.countdownAt);

  const views: View[] = [];
  if (bracket) {
    views.push('live');
    if (bracket.format !== 'knockout' && bracket.groups.length > 0) views.push('groups');
    if (bracket.matches.some((m) => m.stage === 'knockout')) views.push('tree');
  }

  useEffect(() => {
    const t = setInterval(() => setViewIdx((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const view = views.length ? views[viewIdx % views.length] : undefined;
  const firstLive = bracket?.currentMatchIds.map((id) => bracket.matches.find((m) => m.id === id)).find((m): m is Match => !!m);

  let content;
  if (ev.status === 'finished' && bracket?.awards) {
    content = (
      <>
        <Confetti count={140} />
        <ResultsView bracket={bracket} entryById={entryById} title={ev.title} big />
      </>
    );
  } else if (!bracket) {
    const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
    content = (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="animate-spin-slow text-9xl">🌀</div>
        <h1 className="neon-text mt-6 text-7xl font-black">{ev.title}</h1>
        <p className="mt-4 text-3xl text-slate-300">{formatDateTime(ev.startAt)}</p>
        {ev.startAt > now && <p className="font-display mt-6 text-5xl text-cyan-300">{formatCountdown(ev.startAt - now)}</p>}
        <div className="mt-10 flex max-w-6xl flex-wrap justify-center gap-3">
          {c.confirmed.map((e) => (
            <span key={e.id} className={`rounded-full px-4 py-2 text-2xl font-bold ${e.checkedIn ? 'bg-cyan-500/30 text-cyan-100' : 'bg-slate-800 text-slate-400'}`}>
              {displayName(e)}
            </span>
          ))}
        </div>
      </div>
    );
  } else if (view === 'groups') {
    content = (
      <div>
        <ScreenTitle>{bracket.format === 'roundRobin' ? '積分表' : '分組積分'}</ScreenTitle>
        <div className={`grid gap-4 ${bracket.groups.length === 1 ? 'mx-auto max-w-4xl grid-cols-1' : bracket.groups.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {bracket.groups.map((g) => (
            <GroupTable key={g.id} bracket={bracket} group={g} entryById={entryById} big={bracket.groups.length <= 2} />
          ))}
        </div>
      </div>
    );
  } else if (view === 'tree') {
    content = (
      <div>
        <ScreenTitle>淘汰賽</ScreenTitle>
        <KnockoutTree bracket={bracket} entryById={entryById} big />
      </div>
    );
  } else {
    content = <LiveView bracket={bracket} />;
  }

  return (
    <div className="arena-bg min-h-dvh cursor-default p-6 md:p-10">
      {content}
      {!isFull && (
        <button
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
          className="fixed bottom-4 right-4 rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-300"
        >
          ⛶ 全螢幕
        </button>
      )}
      {bracket && view && ev.status !== 'finished' && (
        <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {views.map((v, i) => (
            <span key={v} className={`h-2 w-8 rounded-full ${i === viewIdx % views.length ? 'bg-cyan-400' : 'bg-slate-700'}`} />
          ))}
        </div>
      )}
      {drawing && bracket && (
        <DrawAnimation
          groups={bracket.groups.length ? bracket.groups : [{ id: 'all', name: '參賽選手', playerIds: bracket.playerIds }]}
          entryById={entryById}
          onDone={stopDrawing}
          big
        />
      )}
      {countingDown && !drawing && (
        <Countdown
          onDone={stopCountdown}
          title={firstLive ? `${displayName(entryById.get(firstLive.p1 ?? ''))}  vs  ${displayName(entryById.get(firstLive.p2 ?? ''))}` : undefined}
        />
      )}
    </div>
  );
}

function ScreenTitle({ children }: { children: string }) {
  return <h2 className="neon-text mb-6 text-center text-5xl font-black">{children}</h2>;
}

function LiveView({ bracket }: { bracket: BracketDoc }) {
  const { entryById } = useReadyEvent();
  const upcoming = upcomingMatches(bracket, 4);
  return (
    <div className="space-y-8">
      {bracket.currentMatchIds.length > 0 ? (
        <>
          <ScreenTitle>⚔️ 目前場次</ScreenTitle>
          <LiveMatches bracket={bracket} entryById={entryById} big />
        </>
      ) : (
        <ScreenTitle>等待下一場…</ScreenTitle>
      )}
      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-3 text-3xl font-bold text-slate-400">接下來</h3>
          <div className="grid grid-cols-2 gap-4">
            {upcoming.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl bg-slate-900/90 px-6 py-4 text-3xl">
                <span className="truncate font-bold">{m.p1 ? displayName(entryById.get(m.p1)) : describeSource(m.p1Source)}</span>
                <span className="mx-4 shrink-0 text-xl text-slate-500">{matchLabel(m.id)}</span>
                <span className="truncate text-right font-bold">{m.p2 ? displayName(entryById.get(m.p2)) : describeSource(m.p2Source)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
