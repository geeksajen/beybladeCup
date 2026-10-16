import { useEffect, useMemo, useRef, useState } from 'react';
import { GroupTable } from '../components/bracket/GroupTable';
import { KnockoutTree } from '../components/bracket/KnockoutTree';
import { LiveMatches, upcomingMatches } from '../components/bracket/LiveMatch';
import { ArenaFxOverlay, useArenaEvents } from '../components/fx/ArenaFx';
import { Confetti } from '../components/fx/Confetti';
import { Countdown } from '../components/fx/Countdown';
import { DrawAnimation } from '../components/fx/DrawAnimation';
import { classifyEntries } from '../engine/registration';
import { describeSource, displayName, formatCountdown, formatDateTime, matchLabel } from '../lib/format';
import { useNow, usePersistentState } from '../lib/hooks';
import { isAudioReady, unlockAudio } from '../lib/sound';
import { usePredictions, useReadyEvent } from '../providers/EventProvider';
import { PopularityBars } from '../components/Popularity';
import { MetaHighlights } from '../components/MetaHighlights';
import { computeMeta, META_MIN_BATTLES } from '../engine/meta';
import type { BracketDoc, Match } from '../types';
import { ResultsView } from './Results';

type View = 'live' | 'groups' | 'tree' | 'predict' | 'meta';
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
  const [fx, nextFx] = useArenaEvents(bracket, ev.rules);
  const [soundPref, setSoundPref] = usePersistentState<'on' | 'off'>('screenSound', 'on');
  const [audioReady, setAudioReady] = useState(isAudioReady);
  const enableAudio = () => void unlockAudio().then(setAudioReady);
  const preds = usePredictions(!!ev.predictionsOpen);
  const meta = useMemo(() => (bracket ? computeMeta(bracket) : undefined), [bracket]);

  const views: View[] = [];
  if (bracket) {
    views.push('live');
    if (bracket.format !== 'knockout' && bracket.groups.length > 0) views.push('groups');
    if (bracket.matches.some((m) => m.stage === 'knockout')) views.push('tree');
    if (ev.predictionsOpen) views.push('predict');
    if (meta && meta.battles >= META_MIN_BATTLES) views.push('meta');
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
        <p className="mt-4 text-3xl text-slate-700">{formatDateTime(ev.startAt)}</p>
        {ev.startAt > now && <p className="font-display mt-6 text-5xl text-cyan-700">{formatCountdown(ev.startAt - now)}</p>}
        <div className="mt-10 flex max-w-6xl flex-wrap justify-center gap-3">
          {c.confirmed.map((e) => (
            <span key={e.id} className={`rounded-full px-4 py-2 text-2xl font-bold ${e.checkedIn ? 'bg-cyan-500/30 text-cyan-900' : 'bg-slate-200 text-slate-600'}`}>
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
  } else if (view === 'meta' && meta) {
    content = (
      <div className="mx-auto max-w-6xl">
        <ScreenTitle>📊 Meta 強勢榜</ScreenTitle>
        <MetaHighlights meta={meta} entryById={entryById} big />
        <p className="mt-6 text-center text-2xl text-slate-500">共 {meta.battles} 局的統計・手機打開「對戰表 → Meta 強勢榜」看完整排行</p>
      </div>
    );
  } else if (view === 'predict') {
    content = (
      <div className="mx-auto max-w-5xl">
        <ScreenTitle>🔮 猜冠軍人氣榜</ScreenTitle>
        {preds.length > 0 ? (
          <PopularityBars preds={preds} playerIds={bracket.playerIds} entryById={entryById} limit={8} big />
        ) : (
          <p className="text-center text-4xl text-slate-600">還沒有人投票，快用手機投一票！</p>
        )}
        <p className="mt-10 text-center text-3xl text-slate-600">
          手機打開比賽網站 → <b className="text-fuchsia-700">🔮 猜冠軍</b>，每位選手一票，猜中有「小預言家」稱號
        </p>
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
      <div className="fixed bottom-4 right-4 flex gap-2">
        {soundPref === 'on' && !audioReady ? (
          <button type="button" onClick={enableAudio} className="animate-pulse rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950">
            🔇 點一下開啟音效
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (soundPref === 'on') return setSoundPref('off');
              setSoundPref('on');
              enableAudio();
            }}
            className="rounded-full bg-slate-200/80 px-4 py-2 text-sm text-slate-700"
          >
            {soundPref === 'on' ? '🔊 音效' : '🔈 音效關'}
          </button>
        )}
        {!isFull && (
          <button
            type="button"
            onClick={() => {
              if (soundPref === 'on') enableAudio();
              void document.documentElement.requestFullscreen?.().catch(() => undefined);
            }}
            className="rounded-full bg-slate-200/80 px-4 py-2 text-sm text-slate-700"
          >
            ⛶ 全螢幕
          </button>
        )}
      </div>
      {bracket && view && ev.status !== 'finished' && (
        <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {views.map((v, i) => (
            <span key={v} className={`h-2 w-8 rounded-full ${i === viewIdx % views.length ? 'bg-cyan-600' : 'bg-slate-300'}`} />
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
      {fx && !drawing && !countingDown && <ArenaFxOverlay key={fx.id} event={fx} entryById={entryById} sound={soundPref === 'on' && audioReady} onDone={nextFx} />}
    </div>
  );
}

function ScreenTitle({ children }: { children: string }) {
  return <h2 className="neon-text mb-6 text-center text-5xl font-black">{children}</h2>;
}

function LiveView({ bracket }: { bracket: BracketDoc }) {
  const { entryById, event: ev } = useReadyEvent();
  const upcoming = upcomingMatches(bracket, 4);
  // 下一輪就要上場的場次（每個戰鬥盤一場）：選手已確定的前幾場
  const onDeck = new Set(upcoming.filter((m) => m.p1 && m.p2).slice(0, ev.rules.arenaCount).map((m) => m.id));
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
          <h3 className="mb-3 text-3xl font-bold text-slate-600">接下來</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {upcoming.map((m) => (
              <div
                key={m.id}
                className={`relative flex items-center justify-between rounded-2xl bg-white px-6 py-4 text-3xl shadow-sm ${onDeck.has(m.id) ? 'border-4 border-amber-400' : ''}`}
              >
                {onDeck.has(m.id) && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 animate-pulse rounded-full bg-amber-400 px-4 py-0.5 text-lg font-black text-amber-950">📣 請準備</span>
                )}
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
