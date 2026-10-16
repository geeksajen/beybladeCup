import { useState } from 'react';
import { deckSizeOf } from '../../engine/deck';
import { classifyEntries } from '../../engine/registration';
import { comboLabel } from '../../lib/parts';
import { useReadyEvent } from '../../providers/EventProvider';
import type { EntryDoc } from '../../types';
import { DeckEditor } from '../Deck';
import { Card, ErrorText, useAction } from '../ui';

export function CheckIn() {
  const { event: ev, entries, bracket } = useReadyEvent();
  // 同時只展開一位的 Deck 編輯
  const [editingDeck, setEditingDeck] = useState<string>();
  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const checked = [...c.confirmed, ...c.waitlist].filter((e) => e.checkedIn).length;
  const size = deckSizeOf(ev);
  const noDeck = [...c.confirmed, ...c.waitlist].filter((e) => e.checkedIn && !e.deck?.length).length;
  const listProps = { editingDeck, setEditingDeck };
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-600">已報到</div>
        <div className="font-mono text-4xl font-black text-cyan-700">{checked}</div>
        <p className="mt-1 text-xs text-slate-500">只有已報到的選手會排入賽程。報到時順便確認{size === 3 ? ' Deck（3 顆）' : '陀螺組合'}。</p>
        {noDeck > 0 && <p className="mt-1 text-xs text-amber-700">已報到但還沒登錄 Deck：{noDeck} 位（沒有 Deck 的場次不會列入 Meta 統計）</p>}
        {bracket && <p className="mt-2 text-xs text-amber-700">已產生賽程；報到變動後要到「賽程」重新產生才會套用。</p>}
      </Card>
      <List title="正取" list={c.confirmed} {...listProps} />
      {c.waitlist.length > 0 && <List title="候補（有空位時也可以讓他們上場）" list={c.waitlist} {...listProps} />}
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
      {list.map((e) => (
        <CheckRow key={e.id} entry={e} {...rest} />
      ))}
    </div>
  );
}

function CheckRow({ entry, editingDeck, setEditingDeck }: { entry: EntryDoc } & ListProps) {
  const { store, event: ev } = useReadyEvent();
  const { busy, error, run } = useAction();
  const deckAction = useAction();
  const size = deckSizeOf(ev);
  const editing = editingDeck === entry.id;
  const deckCount = entry.deck?.length ?? 0;
  return (
    <div className={`rounded-xl border ${entry.checkedIn ? 'border-emerald-500/60 bg-emerald-500/15' : 'border-slate-200 bg-white'}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => store.updateEntry(entry.id, { checkedIn: !entry.checkedIn }))}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="text-2xl">{entry.emoji ?? '🌀'}</span>
        <span className="flex-1 font-bold">{entry.nickname}</span>
        <span className={`rounded-lg px-3 py-1 text-sm font-bold ${entry.checkedIn ? 'bg-emerald-500 text-slate-50' : 'bg-slate-300 text-slate-700'}`}>
          {busy ? '…' : entry.checkedIn ? '✓ 已到' : '未到'}
        </span>
      </button>
      <div className="px-3 pb-2">
        {editing ? (
          <div className="rounded-xl bg-white p-2">
            <DeckEditor
              initial={entry.deck}
              size={size}
              busy={deckAction.busy}
              error={deckAction.error}
              onCancel={() => setEditingDeck(undefined)}
              onSave={(deck) =>
                void deckAction.run(async () => {
                  await store.updateEntry(entry.id, { deck });
                  setEditingDeck(undefined);
                })
              }
            />
          </div>
        ) : (
          <button type="button" className="flex w-full items-center gap-2 text-left text-xs" onClick={() => setEditingDeck(entry.id)}>
            <span className={`shrink-0 font-bold ${deckCount >= size ? 'text-cyan-700' : 'text-amber-700'}`}>
              🌀 {deckCount}/{size}
            </span>
            <span className="min-w-0 flex-1 truncate text-slate-600">{deckCount ? entry.deck!.map(comboLabel).join('、') : '還沒登錄 Deck'}</span>
            <span className="shrink-0 text-cyan-700">編輯</span>
          </button>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
