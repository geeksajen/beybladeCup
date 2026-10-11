import { classifyEntries } from '../../engine/registration';
import { useReadyEvent } from '../../providers/EventProvider';
import type { EntryDoc } from '../../types';
import { Card, ErrorText, useAction } from '../ui';

export function CheckIn() {
  const { event: ev, entries, bracket } = useReadyEvent();
  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const checked = [...c.confirmed, ...c.waitlist].filter((e) => e.checkedIn).length;
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-400">已報到</div>
        <div className="font-mono text-4xl font-black text-cyan-300">{checked}</div>
        <p className="mt-1 text-xs text-slate-500">只有已報到的選手會排入賽程。</p>
        {bracket && <p className="mt-2 text-xs text-amber-300">已產生賽程；報到變動後要到「賽程」重新產生才會套用。</p>}
      </Card>
      <List title="正取" list={c.confirmed} />
      {c.waitlist.length > 0 && <List title="候補（有空位時也可以讓他們上場）" list={c.waitlist} />}
    </div>
  );
}

function List({ title, list }: { title: string; list: EntryDoc[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-400">{title}</h3>
      {list.map((e) => (
        <CheckRow key={e.id} entry={e} />
      ))}
    </div>
  );
}

function CheckRow({ entry }: { entry: EntryDoc }) {
  const { store } = useReadyEvent();
  const { busy, error, run } = useAction();
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => store.updateEntry(entry.id, { checkedIn: !entry.checkedIn }))}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
          entry.checkedIn ? 'border-emerald-500/60 bg-emerald-500/15' : 'border-slate-700 bg-slate-900'
        }`}
      >
        <span className="text-2xl">{entry.emoji ?? '🌀'}</span>
        <span className="flex-1 font-bold">{entry.nickname}</span>
        <span className={`rounded-lg px-3 py-1 text-sm font-bold ${entry.checkedIn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
          {busy ? '…' : entry.checkedIn ? '✓ 已到' : '未到'}
        </span>
      </button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
