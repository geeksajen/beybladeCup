import { useState } from 'react';
import { downstreamStarted, startMatchNow } from '../../engine/advance';
import { deckSignature, deckSizeOf, nextBeys, reorder, setMatchDecks } from '../../engine/deck';
import { DeckEditor } from '../Deck';
import { addBattle, computeScore, decidedWinner, finalizeMatch, reopenMatch, setManualScore, undoBattle } from '../../engine/scoring';
import { FINISH_LABELS, FINISH_TYPES } from '../../lib/defaults';
import { describeSource, matchLabel } from '../../lib/format';
import { comboLabel } from '../../lib/parts';
import { useReadyEvent } from '../../providers/EventProvider';
import type { BracketDoc, Combo, EntryDoc, FinishType, Match } from '../../types';
import { Avatar, PlayerName } from '../avatars';
import { Icon } from '../icons';
import { Button, Card, ErrorText, inputClass, useAction } from '../ui';
import { PredictionsControl } from './PredictionsControl';
import { useBracketMutation } from './useBracket';

function replaceMatch(b: BracketDoc, id: string, fn: (m: Match) => Match): BracketDoc {
  return { ...b, matches: b.matches.map((m) => (m.id === id ? fn(m) : m)) };
}

export function Scorer({ onGoAwards }: { onGoAwards: () => void }) {
  const { bracket, event: ev, entryById } = useReadyEvent();
  const [selected, setSelected] = useState<string>();
  const { mutate, busy, error } = useBracketMutation();

  if (!bracket) return <Card className="text-center text-ink">還沒有賽程，請先到「賽程」分頁抽籤。</Card>;

  const live = bracket.currentMatchIds.map((id) => bracket.matches.find((m) => m.id === id)).filter((m): m is Match => !!m);
  const current = live.find((m) => m.id === selected) ?? live[0];
  const pending = bracket.matches.filter((m) => m.status === 'pending' && !m.isBye).sort((a, b) => a.order - b.order);
  const done = bracket.matches.filter((m) => m.status === 'done' && !m.isBye).sort((a, b) => b.order - a.order);
  const allDone = bracket.matches.every((m) => m.status === 'done');

  return (
    <div className="space-y-4">
      <PredictionsControl />
      {live.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {live.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              className={`rounded-xl px-2 py-2 text-sm font-bold ${m.id === current?.id ? 'bg-accent text-on' : 'bg-raised text-ink'}`}
            >
              {m.arena} 號盤・{matchLabel(m.id)}
            </button>
          ))}
        </div>
      )}

      {current ? (
        <MatchScorer key={current.id} match={current} busy={busy} mutate={mutate} />
      ) : allDone ? (
        <Card className="text-center">
          <Icon name="flag" className="text-4xl text-success" />
          <p className="mt-2 font-bold">所有場次都完成了！</p>
          <Button variant="neon" className="mt-3" onClick={onGoAwards}>
            <Icon name="trophy" className="mr-1.5" />
            前往頒獎
          </Button>
        </Card>
      ) : (
        <Card className="text-center text-ink">
          目前沒有可以開打的場次。
          {pending.some((m) => !m.p1 || !m.p2) && <div className="mt-1 text-sm text-gold">淘汰賽要等前面的結果（或同分的名次）確定。</div>}
        </Card>
      )}
      <ErrorText>{error}</ErrorText>

      {pending.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-bold text-ink-muted">接下來（{pending.length}）</h3>
          <div className="space-y-1.5">
            {pending.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-raised/60 px-2 py-1.5 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-muted">{matchLabel(m.id)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {m.p1 ? <PlayerName entry={entryById.get(m.p1)} /> : describeSource(m.p1Source)} vs {m.p2 ? <PlayerName entry={entryById.get(m.p2)} /> : describeSource(m.p2Source)}
                </span>
                {m.p1 && m.p2 && (
                  <button
                    type="button"
                    disabled={busy}
                    className="shrink-0 rounded-md bg-line px-2 py-1 text-xs"
                    onClick={() => {
                      const blocked = live.some((x) => x.battles.length > 0 || x.manualScore);
                      if (blocked && live.length >= ev.rules.arenaCount)
                        return alert('目前的場次已經有比分，請先完成或撤銷所有局數再換場。');
                      void mutate((b) => startMatchNow(b, m.id, ev.rules.arenaCount));
                    }}
                  >
                    改打這場
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-bold text-ink-muted">已完成（{done.length}）</h3>
          <div className="space-y-1.5">
            {done.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-raised/60 px-2 py-1.5 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-muted">{matchLabel(m.id)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <b className={m.winner === m.p1 ? 'text-primary' : ''}><PlayerName entry={entryById.get(m.p1 ?? '')} /></b> {m.p1Score}:{m.p2Score}{' '}
                  <b className={m.winner === m.p2 ? 'text-primary' : ''}><PlayerName entry={entryById.get(m.p2 ?? '')} /></b>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded-md bg-line px-2 py-1 text-xs"
                  onClick={() => {
                    const warn = downstreamStarted(bracket, m.id)
                      ? '注意：後續已開打的場次可能會受影響：如果勝負改變，相關淘汰賽的比分會被清空。\n\n'
                      : '';
                    if (confirm(`${warn}重新開啟「${matchLabel(m.id)}」來修改比分？`)) {
                      setSelected(m.id);
                      void mutate((b) => replaceMatch(b, m.id, reopenMatch));
                    }
                  }}
                >
                  重新開啟
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MatchScorer({ match, busy, mutate }: { match: Match; busy: boolean; mutate: (fn: (b: BracketDoc) => BracketDoc) => Promise<boolean> }) {
  const { event: ev, entryById } = useReadyEvent();
  const rules = ev.rules;
  const [pendingSide, setPendingSide] = useState<'p1' | 'p2'>();
  const [quick, setQuick] = useState(false);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const winnerSide = decidedWinner(match, rules);
  const errs = computeScore(match.battles, rules).launchErrors;
  const p1 = match.p1 ? entryById.get(match.p1) : undefined;
  const p2 = match.p2 ? entryById.get(match.p2) : undefined;

  const update = (fn: (m: Match) => Match) => mutate((b) => replaceMatch(b, match.id, fn));
  const battle = (winner: 'p1' | 'p2' | 'draw', finish?: FinishType | 'launchError') => {
    setPendingSide(undefined);
    // 第一局開打時，沒有另外設定順序就用報名時登錄的預設順序
    void update((m) => addBattle(m.p1Deck || m.p2Deck ? m : setMatchDecks(m, p1?.deck, p2?.deck), { winner, finish, at: Date.now() }, rules));
  };
  const beys = nextBeys(match);
  const hasAnyDeck = !!(p1?.deck?.length || p2?.deck?.length);
  const canSetOrder = deckSizeOf(ev) > 1 && hasAnyDeck && match.battles.length === 0 && !match.manualScore;

  return (
    <Card className="space-y-4 border-accent/50">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>
          {matchLabel(match.id)}
          {match.arena ? `・${match.arena} 號盤` : ''}
        </span>
        <span>先得 {rules.pointsToWin} 分獲勝</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="min-w-0">
          <Avatar value={p1?.emoji} className="text-3xl" />
          <div className="truncate text-lg font-black">{p1?.nickname}</div>
          <div className="font-display text-5xl text-primary">{match.p1Score}</div>
          {errs.p1 > 0 && <div className="text-xs text-gold">發射失誤 ×{errs.p1}</div>}
          {beys.p1 && !winnerSide && <div className="mt-1 truncate rounded bg-primary/10 px-1 text-xs font-bold text-primary"><Icon name="bey" className="mr-0.5" /> {comboLabel(beys.p1)}</div>}
        </div>
        <div className="font-display text-xl text-gold">VS</div>
        <div className="min-w-0">
          <Avatar value={p2?.emoji} className="text-3xl" />
          <div className="truncate text-lg font-black">{p2?.nickname}</div>
          <div className="font-display text-5xl text-accent">{match.p2Score}</div>
          {errs.p2 > 0 && <div className="text-xs text-gold">發射失誤 ×{errs.p2}</div>}
          {beys.p2 && !winnerSide && <div className="mt-1 truncate rounded bg-accent/10 px-1 text-xs font-bold text-accent"><Icon name="bey" className="mr-0.5" /> {comboLabel(beys.p2)}</div>}
        </div>
      </div>

      {match.battles.length === 0 && !match.manualScore && (
        <>
          <MissingDeck entry={p1} />
          <MissingDeck entry={p2} />
        </>
      )}

      {canSetOrder && (
        <OrderSetup
          key={`${match.p1Deck ? 'set' : 'new'}-${deckSignature(p1?.deck)}-${deckSignature(p2?.deck)}`}
          match={match}
          p1={p1}
          p2={p2}
          busy={busy}
          onConfirm={(d1, d2) => void update((m) => setMatchDecks(m, d1, d2))}
        />
      )}

      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => void mutate((b) => ({ ...b, countdownAt: Date.now() }))}
      >
        <Icon name="tv" className="mr-1.5" />
        大螢幕倒數「3, 2, 1, Go Shoot!」
      </Button>

      {winnerSide ? (
        <div className="space-y-2 rounded-2xl bg-primary/10 p-3 text-center">
          <div className="text-lg font-black">勝者確認？</div>
          <div className="text-2xl font-black text-primary"><PlayerName entry={winnerSide === 'p1' ? p1 : p2} /> 獲勝</div>
          <Button variant="neon" className="w-full py-3 text-lg" disabled={busy} onClick={() => void update((m) => finalizeMatch(m, rules))}>
            <Icon name="check" className="mr-1.5" />
            確認，下一場
          </Button>
        </div>
      ) : quick ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input className={`${inputClass} text-center text-2xl`} type="number" inputMode="numeric" min={0} value={q1} onChange={(e) => setQ1(e.target.value)} />
            <span>:</span>
            <input className={`${inputClass} text-center text-2xl`} type="number" inputMode="numeric" min={0} value={q2} onChange={(e) => setQ2(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={busy || q1 === '' || q2 === '' || q1 === q2}
            onClick={() => {
              void update((m) => setManualScore(m, Number(q1), Number(q2)));
              setQuick(false);
            }}
          >
            套用最終比分
          </Button>
        </div>
      ) : pendingSide ? (
        <div className="space-y-2">
          <div className="text-center text-sm">
            <b className={pendingSide === 'p1' ? 'text-primary' : 'text-accent'}><PlayerName entry={pendingSide === 'p1' ? p1 : p2} /></b> 贏了，終結方式是？
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FINISH_TYPES.map((f) => (
              <button
                key={f}
                type="button"
                disabled={busy}
                onClick={() => battle(pendingSide, f)}
                className={`rounded-xl py-4 text-on ${FINISH_LABELS[f].color} disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-1.5 text-lg font-black">
                  <Icon name={f} className="text-xl" />
                  {FINISH_LABELS[f].name}
                </div>
                <div className="text-xs opacity-90">+{rules.finishPoints[f]} 分</div>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setPendingSide(undefined)}>
            返回
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button className="py-5 text-lg" disabled={busy} onClick={() => setPendingSide('p1')}>
              左邊贏
            </Button>
            <Button variant="secondary" className="py-5" disabled={busy} onClick={() => battle('draw')}>
              平手
            </Button>
            <Button className="bg-accent py-5 text-lg hover:brightness-110" disabled={busy} onClick={() => setPendingSide('p2')}>
              右邊贏
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="border border-line-strong text-xs" disabled={busy} onClick={() => battle('p2', 'launchError')}>
              左邊發射失誤
            </Button>
            <Button variant="ghost" className="border border-line-strong text-xs" disabled={busy} onClick={() => battle('p1', 'launchError')}>
              右邊發射失誤
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 text-sm"
          disabled={busy || (match.battles.length === 0 && !match.manualScore)}
          onClick={() => void update((m) => undoBattle(m, rules))}
        >
          <Icon name="undo" className="mr-1" />
          撤銷最後一局
        </Button>
        {!winnerSide && (
          <Button variant="ghost" className="flex-1 text-sm" onClick={() => setQuick(!quick)}>
            {quick ? '逐局輸入' : '直接輸入比分'}
          </Button>
        )}
      </div>

      {match.battles.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs">
          {match.battles.map((b, i) => (
            <span
              key={i}
              className={`rounded px-1.5 py-0.5 ${b.winner === 'p1' ? 'bg-primary/10 text-primary' : b.winner === 'p2' ? 'bg-accent/10 text-accent' : 'bg-raised text-ink-muted'}`}
            >
              {i + 1}. {b.winner === 'draw' ? '平手' : b.finish === 'launchError' ? `${b.winner === 'p1' ? '右' : '左'}失誤` : `${b.winner === 'p1' ? '左' : '右'} ${b.finish ? FINISH_LABELS[b.finish].name : ''}`}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

/** 開打前設定本場出場順序（預設 = 報名時登錄的順序）；第一局開始後就不能改。 */
function OrderSetup({
  match,
  p1,
  p2,
  busy,
  onConfirm,
}: {
  match: Match;
  p1?: EntryDoc;
  p2?: EntryDoc;
  busy: boolean;
  onConfirm: (p1Deck?: Combo[], p2Deck?: Combo[]) => void;
}) {
  const confirmed = !!(match.p1Deck || match.p2Deck);
  const [open, setOpen] = useState(!confirmed);
  // 已設定過就從本場的順序開始調整
  const [d1, setD1] = useState<Combo[]>(match.p1Deck ?? p1?.deck ?? []);
  const [d2, setD2] = useState<Combo[]>(match.p2Deck ?? p2?.deck ?? []);

  if (!open) {
    return (
      <button type="button" className="w-full rounded-xl bg-success/10 px-3 py-2 text-left text-sm text-success" onClick={() => setOpen(true)}>
        <Icon name="check" className="mr-1" />
        本場出場順序已確定 <span className="float-right text-primary">改順序</span>
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/10 p-2">
      <div className="text-sm font-bold text-gold"><Icon name="shuffle" className="mr-1" />本場出場順序（請雙方小聲告訴你）</div>
      <div className="grid grid-cols-2 gap-2">
        <OrderList entry={p1} deck={d1} onChange={setD1} color="text-primary" />
        <OrderList entry={p2} deck={d2} onChange={setD2} color="text-accent" />
      </div>
      <Button
        className="w-full"
        disabled={busy}
        onClick={() => {
          onConfirm(d1, d2);
          setOpen(false);
        }}
      >
        確定順序
      </Button>
    </div>
  );
}

function OrderList({ entry, deck, onChange, color }: { entry?: EntryDoc; deck: Combo[]; onChange: (d: Combo[]) => void; color: string }) {
  return (
    <div className="min-w-0">
      <div className={`truncate text-xs font-bold ${color}`}><PlayerName entry={entry} /></div>
      {deck.length === 0 && <div className="text-xs text-ink-muted">沒有登錄 Deck</div>}
      <ol className="mt-1 space-y-1">
        {deck.map((c, i) => (
          <li key={i} className="flex items-center gap-1 rounded bg-surface px-1.5 py-1 text-xs">
            <span className="font-mono text-ink-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{comboLabel(c)}</span>
            {i > 0 && (
              <button
                type="button"
                className="shrink-0 rounded bg-raised px-1.5"
                aria-label="往前"
                onClick={() => onChange(reorder(deck, deck.map((_, j) => (j === i - 1 ? i : j === i ? i - 1 : j))))}
              >
                ↑
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 開打前發現選手沒有 Deck：可以現在補（不補也能照常比賽，只是這場不列入 Meta 統計）。 */
function MissingDeck({ entry }: { entry?: EntryDoc }) {
  const { event: ev, store } = useReadyEvent();
  const [open, setOpen] = useState(false);
  const { busy, error, run } = useAction();
  if (!entry || entry.deck?.length) return null;
  if (!open) {
    return (
      <button type="button" className="w-full rounded-xl bg-gold/10 px-3 py-2 text-left text-xs text-gold" onClick={() => setOpen(true)}>
        <Icon name="alert" className="mr-1" />
        {entry.nickname} 還沒登錄 Deck（可以照常比賽，只是不列入 Meta 統計）<span className="float-right font-bold text-primary">現在補</span>
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-gold/40 bg-surface p-2">
      <div className="mb-2 text-sm font-bold"><PlayerName entry={entry} /> 的 Deck</div>
      <DeckEditor
        size={deckSizeOf(ev)}
        busy={busy}
        error={error}
        onCancel={() => setOpen(false)}
        onSave={(deck) => void run(() => store.updateEntry(entry.id, { deck, deckCheckedKey: deckSignature(deck) }))}
      />
    </div>
  );
}
