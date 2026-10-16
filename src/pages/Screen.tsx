import { useEffect, useMemo, useRef, useState } from 'react';
import { GroupTable } from '../components/bracket/GroupTable';
import { KnockoutTree } from '../components/bracket/KnockoutTree';
import { ArenaFxOverlay, useArenaEvents } from '../components/fx/ArenaFx';
import { Confetti } from '../components/fx/Confetti';
import { Countdown } from '../components/fx/Countdown';
import { DrawAnimation } from '../components/fx/DrawAnimation';
import { MetaHighlights } from '../components/MetaHighlights';
import { PopularityBars } from '../components/Popularity';
import { FocusView } from '../components/screen/FocusView';
import { PostMatchView } from '../components/screen/PostMatchView';
import { Ticker, tickerItems } from '../components/screen/Ticker';
import { computeMeta, META_MIN_BATTLES } from '../engine/meta';
import { classifyEntries } from '../engine/registration';
import { intermissionPages, isBattling, liveMatches, pageDuration, POST_MATCH_MS, type ScreenPage } from '../engine/screen';
import { displayName, formatCountdown, formatDateTime } from '../lib/format';
import { useNow, usePersistentState } from '../lib/hooks';
import { isAudioReady, unlockAudio } from '../lib/sound';
import { usePredictions, useReadyEvent } from '../providers/EventProvider';
import { ResultsView } from './Results';

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

/**
 * 大螢幕依比賽節奏切換（不是固定時間輪播）：
 * - 對打中（有局數、或剛按倒數）→ 鎖定目前場次的主版面
 * - 一場剛結束 → 積分更新／晉級畫面
 * - 中場（下一場還沒開打）→ 目前場次與其他資訊交替輪播
 */
type Mode = 'pre' | 'results' | 'focus' | 'post' | 'intermission';

export default function Screen() {
  const { event: ev, bracket, entries, entryById } = useReadyEvent();
  const now = useNow();
  const [isFull, setIsFull] = useState(false);
  const [drawing, stopDrawing] = useTrigger(bracket?.drawAt);
  const [countingDown, stopCountdown] = useTrigger(bracket?.countdownAt);
  const arena = useArenaEvents(bracket, ev.rules);
  const [soundPref, setSoundPref] = usePersistentState<'on' | 'off'>('screenSound', 'on');
  const [audioReady, setAudioReady] = useState(isAudioReady);
  const enableAudio = () => void unlockAudio().then(setAudioReady);
  const preds = usePredictions(!!ev.predictionsOpen);
  const meta = useMemo(() => (bracket ? computeMeta(bracket) : undefined), [bracket]);

  const lastWin = arena.lastWin;
  const postMatch = bracket && lastWin && now - lastWin.at < POST_MATCH_MS && bracket.matches.some((m) => m.id === lastWin.matchId && m.status === 'done');
  const mode: Mode =
    ev.status === 'finished' && bracket?.awards ? 'results' : !bracket ? 'pre' : isBattling(bracket, now) ? 'focus' : postMatch ? 'post' : 'intermission';

  const extra: ScreenPage[] = [];
  if (bracket) {
    if (bracket.format !== 'knockout' && bracket.groups.length > 0) extra.push('groups');
    if (bracket.matches.some((m) => m.stage === 'knockout')) extra.push('tree');
    if (ev.predictionsOpen) extra.push('predict');
    if (meta && meta.battles >= META_MIN_BATTLES) extra.push('meta');
  }
  const pages = intermissionPages(extra);

  // 中場輪播：每次進入中場都從「目前場次」開始
  const [rot, setRot] = useState({ idx: 0, since: Date.now() });
  useEffect(() => {
    if (mode === 'intermission') setRot({ idx: 0, since: Date.now() });
  }, [mode]);
  const page: ScreenPage = mode === 'intermission' ? pages[rot.idx % pages.length] : 'focus';
  useEffect(() => {
    if (mode === 'intermission' && now - rot.since >= pageDuration(page)) setRot({ idx: rot.idx + 1, since: now });
  }, [mode, now, rot, page]);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const firstLive = bracket ? liveMatches(bracket)[0] : undefined;
  const showTicker = !!bracket && (mode === 'focus' || (mode === 'intermission' && page === 'focus'));

  let content;
  if (mode === 'results' && bracket) {
    content = (
      <>
        <Confetti count={140} />
        <ResultsView bracket={bracket} entryById={entryById} title={ev.title} big />
      </>
    );
  } else if (mode === 'pre' || !bracket) {
    const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
    content = (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="animate-spin-slow text-9xl">🌀</div>
        <h1 className="neon-text mt-6 text-7xl font-black">{ev.title}</h1>
        <p className="mt-4 text-3xl text-ink">{formatDateTime(ev.startAt)}</p>
        {ev.startAt > now && <p className="font-display mt-6 text-5xl text-primary">{formatCountdown(ev.startAt - now)}</p>}
        <div className="mt-10 flex max-w-6xl flex-wrap justify-center gap-3">
          {c.confirmed.map((e) => (
            <span key={e.id} className={`rounded-full px-4 py-2 text-2xl font-bold ${e.checkedIn ? 'bg-primary/30 text-primary' : 'bg-raised text-ink-muted'}`}>
              {displayName(e)}
            </span>
          ))}
        </div>
      </div>
    );
  } else if (mode === 'post' && lastWin) {
    content = <PostMatchView bracket={bracket} matchId={lastWin.matchId} entryById={entryById} />;
  } else if (page === 'groups') {
    content = (
      <div>
        <ScreenTitle>{bracket.format === 'roundRobin' ? '積分表' : '分組積分'}</ScreenTitle>
        <div className={`grid gap-4 ${bracket.groups.length === 1 ? 'mx-auto max-w-4xl grid-cols-1' : bracket.groups.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {bracket.groups.map((g) => (
            <GroupTable key={g.id} bracket={bracket} group={g} entryById={entryById} big={bracket.groups.length <= 4} />
          ))}
        </div>
      </div>
    );
  } else if (page === 'meta' && meta) {
    content = (
      <div className="mx-auto max-w-6xl">
        <ScreenTitle>📊 Meta 強勢榜</ScreenTitle>
        <MetaHighlights meta={meta} entryById={entryById} big />
        <p className="mt-6 text-center text-2xl text-ink-muted">共 {meta.battles} 局的統計・手機打開「對戰表 → Meta 強勢榜」看完整排行</p>
      </div>
    );
  } else if (page === 'predict') {
    content = (
      <div className="mx-auto max-w-5xl">
        <ScreenTitle>🔮 猜冠軍人氣榜</ScreenTitle>
        {preds.length > 0 ? (
          <PopularityBars preds={preds} playerIds={bracket.playerIds} entryById={entryById} limit={8} big />
        ) : (
          <p className="text-center text-4xl text-ink-muted">還沒有人投票，快用手機投一票！</p>
        )}
        <p className="mt-10 text-center text-3xl text-ink-muted">
          手機打開比賽網站 → <b className="text-accent">🔮 猜冠軍</b>，每位選手一票，猜中有「小預言家」稱號
        </p>
      </div>
    );
  } else if (page === 'tree') {
    content = (
      <div>
        <ScreenTitle>淘汰賽</ScreenTitle>
        <KnockoutTree bracket={bracket} entryById={entryById} big />
      </div>
    );
  } else {
    content = (
      <div className="h-[calc(100dvh-9rem)]">
        <FocusView bracket={bracket} entryById={entryById} arenaCount={ev.rules.arenaCount} />
      </div>
    );
  }

  return (
    <div className={`arena-bg min-h-dvh cursor-default p-6 md:p-10 ${showTicker ? 'pb-24' : ''}`}>
      {content}

      {/* 控制鈕放右上角，不擋跑馬燈 */}
      <div className="fixed right-3 top-3 z-40 flex gap-2 opacity-60 hover:opacity-100">
        {soundPref === 'on' && !audioReady ? (
          <button type="button" onClick={enableAudio} className="animate-pulse rounded-full bg-gold px-4 py-2 text-sm font-bold text-on">
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
            className="rounded-full bg-raised/80 px-3 py-1.5 text-xs text-ink"
          >
            {soundPref === 'on' ? '🔊' : '🔈 音效關'}
          </button>
        )}
        {!isFull && (
          <button
            type="button"
            onClick={() => {
              if (soundPref === 'on') enableAudio();
              void document.documentElement.requestFullscreen?.().catch(() => undefined);
            }}
            className="rounded-full bg-raised/80 px-3 py-1.5 text-xs text-ink"
          >
            ⛶ 全螢幕
          </button>
        )}
      </div>

      {mode === 'intermission' && pages.length > 1 && (
        <div className={`fixed left-1/2 flex -translate-x-1/2 gap-2 ${showTicker ? 'bottom-20' : 'bottom-4'}`}>
          {pages.map((_, i) => (
            <span key={i} className={`h-2 rounded-full ${i === rot.idx % pages.length ? 'w-8 bg-primary' : 'w-4 bg-line'}`} />
          ))}
        </div>
      )}

      {showTicker && bracket && (
        <Ticker items={tickerItems({ bracket, ev, entryById, preds, meta, recentAchievements: arena.recentAchievements, now })} />
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
      {arena.current && !drawing && !countingDown && (
        <ArenaFxOverlay key={arena.current.id} event={arena.current} entryById={entryById} sound={soundPref === 'on' && audioReady} onDone={arena.next} />
      )}
    </div>
  );
}

function ScreenTitle({ children }: { children: string }) {
  return <h2 className="neon-text mb-6 text-center text-5xl font-black">{children}</h2>;
}
