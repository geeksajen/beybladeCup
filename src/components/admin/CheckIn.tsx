import { useState } from 'react';
import { deckSignature, deckSizeOf, deckStatus } from '../../engine/deck';
import { classifyEntries } from '../../engine/registration';
import { comboLabel } from '../../lib/parts';
import { useReadyEvent } from '../../providers/EventProvider';
import type { EntryDoc } from '../../types';
import { DeckEditor, DeckView } from '../Deck';
import { Button, Card, ErrorText, inputClass, useAction } from '../ui';

/** 還沒到的排前面（報到時要找的人在上面），同狀態維持報名順序。 */
const notArrivedFirst = (list: EntryDoc[]) => [...list.filter((e) => !e.checkedIn), ...list.filter((e) => e.checkedIn)];

export function CheckIn() {
  const { event: ev, entries, bracket } = useReadyEvent();
  // 同時只展開一位的 Deck 編輯
  const [editingDeck, setEditingDeck] = useState<string>();
  const [q, setQ] = useState('');
  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const all = [...c.confirmed, ...c.waitlist];
  const checked = all.filter((e) => e.checkedIn).length;
  const size = deckSizeOf(ev);
  const noDeck = all.filter((e) => e.checkedIn && !e.deck?.length).length;
  const toConfirm = all.filter((e) => e.checkedIn && deckStatus(e) === 'unconfirmed').length;
  const filter = (list: EntryDoc[]) => notArrivedFirst(q.trim() ? list.filter((e) => e.nickname.includes(q.trim())) : list);
  const listProps = { editingDeck, setEditingDeck };
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-600">已報到</div>
        <div className="font-mono text-4xl font-black text-cyan-700">
          {checked}
          <span className="text-lg text-slate-400"> / {c.confirmed.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          只有已報到的選手會排入賽程。報到時請小朋友拿出{size === 3 ? ' 3 顆陀螺' : '陀螺'}對一下 Deck。
        </p>
        {(noDeck > 0 || toConfirm > 0) && (
          <p className="mt-1 text-xs text-amber-700">
            {toConfirm > 0 && `Deck 待確認 ${toConfirm} 位　`}
            {noDeck > 0 && `沒有 Deck ${noDeck} 位（可以照常比賽，只是不列入 Meta 統計）`}
          </p>
        )}
        {bracket && <p className="mt-2 text-xs text-amber-700">已產生賽程；報到變動後要到「賽程」重新產生才會套用。</p>}
      </Card>
      <input className={inputClass} placeholder="🔍 搜尋暱稱" value={q} onChange={(e) => setQ(e.target.value)} />
      <List title="正取" list={filter(c.confirmed)} {...listProps} />
      {c.waitlist.length > 0 && <List title="候補（有空位時也可以讓他們上場）" list={filter(c.waitlist)} {...listProps} />}
    </div>
  );
}

interface ListProps {
  editingDeck?: string;
  setEditingDeck: (id?: string) => void;
}

function List({ title, list, ...rest }: { title: string; list: EntryDoc[] } & ListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-600">{title}</h3>
      {list.length === 0 && <p className="text-sm text-slate-500">沒有符合的選手</p>}
      {list.map((e) => (
        <CheckRow key={e.id} entry={e} {...rest} />
      ))}
    </div>
  );
}

const STATUS_BADGE = {
  none: { text: '⚠️ 未登錄', cls: 'bg-slate-200 text-slate-600' },
  unconfirmed: { text: '📝 待確認', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { text: '✓ 已確認', cls: 'bg-cyan-100 text-cyan-800' },
};

function CheckRow({ entry, editingDeck, setEditingDeck }: { entry: EntryDoc } & ListProps) {
  const { store, event: ev } = useReadyEvent();
  const { busy, error, run } = useAction();
  const size = deckSizeOf(ev);
  const editing = editingDeck === entry.id;
  const status = deckStatus(entry);
  const badge = STATUS_BADGE[status];
  // 已到、Deck 待確認：展開讓主辦對照實物
  const showConfirm = entry.checkedIn && status === 'unconfirmed' && !editing;

  const saveDeck = (deck: EntryDoc['deck']) =>
    void run(async () => {
      // 主辦親自登錄／修改的 Deck 視為已確認
      await store.updateEntry(entry.id, { deck, deckCheckedKey: deckSignature(deck) });
      setEditingDeck(undefined);
    });

  return (
    <div className={`rounded-xl border ${entry.checkedIn ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => store.updateEntry(entry.id, { checkedIn: !entry.checkedIn }))}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="text-2xl">{entry.emoji ?? '🌀'}</span>
        <span className="min-w-0 flex-1 truncate font-bold">{entry.nickname}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>{badge.text}</span>
        <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${entry.checkedIn ? 'bg-emerald-500 text-slate-50' : 'bg-slate-300 text-slate-700'}`}>
          {busy ? '…' : entry.checkedIn ? '✓ 已到' : '未到'}
        </span>
      </button>
      <div className="px-3 pb-2">
        {editing ? (
          <div className="rounded-xl bg-white p-2">
            <DeckEditor initial={entry.deck} size={size} busy={busy} error={error} onCancel={() => setEditingDeck(undefined)} onSave={saveDeck} />
          </div>
        ) : showConfirm ? (
          <div className="space-y-2 rounded-xl bg-white p-2">
            <div className="text-xs font-bold text-amber-800">請小朋友拿出陀螺對一下：</div>
            <DeckView deck={entry.deck} className="text-sm" />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => setEditingDeck(entry.id)}>
                修改
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void run(() => store.updateEntry(entry.id, { deckCheckedKey: deckSignature(entry.deck) }))}>
                正確 ✓
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" className="flex w-full items-center gap-2 text-left text-xs" onClick={() => setEditingDeck(entry.id)}>
            <span className={`shrink-0 font-bold ${(entry.deck?.length ?? 0) >= size ? 'text-cyan-700' : 'text-amber-700'}`}>
              🌀 {entry.deck?.length ?? 0}/{size}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-600">{entry.deck?.length ? entry.deck.map(comboLabel).join('、') : '還沒登錄 Deck'}</span>
            <span className="shrink-0 font-bold text-cyan-700">{entry.deck?.length ? '修改' : '登錄'}</span>
          </button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
