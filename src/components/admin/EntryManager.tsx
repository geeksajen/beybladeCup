import { useEffect, useState } from 'react';
import { classifyEntries } from '../../engine/registration';
import { useReadyEvent } from '../../providers/EventProvider';
import type { ContactDoc, EntryDoc } from '../../types';
import { EntryForm } from '../EntryForm';
import { Badge, Button, Card, ErrorText, Spinner, useAction } from '../ui';

export function EntryManager() {
  const { event: ev, entries, store, user } = useReadyEvent();
  const [contacts, setContacts] = useState<Record<string, ContactDoc>>();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const load = useAction();
  const save = useAction();

  const reload = () => void load.run(async () => setContacts(await store.listContacts()));
  // 報名筆數變動時重新讀取聯絡資料（聯絡資料不建立即時監聽，節省額度）
  useEffect(() => {
    reload();
  }, [entries.length]);

  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const cancelled = entries.filter((e) => e.status === 'cancelled');
  const ownerCounts = new Map<string, number>();
  [...c.confirmed, ...c.waitlist, ...c.overflow].forEach((e) => ownerCounts.set(e.ownerUid, (ownerCounts.get(e.ownerUid) ?? 0) + 1));
  const borrowCount = [...c.confirmed, ...c.waitlist].filter((e) => contacts?.[e.id]?.needsBorrowBey).length;

  const exportText = () => {
    const line = (e: EntryDoc, i: number) => `${i + 1}. ${e.emoji ?? ''}${e.nickname}${e.grade ? `（${e.grade}）` : ''}`;
    const text = [
      `【${ev.title}】參賽名單`,
      `正取 ${c.confirmed.length}/${ev.capacity}`,
      ...c.confirmed.map(line),
      ...(c.waitlist.length ? ['', `候補 ${c.waitlist.length}`, ...c.waitlist.map(line)] : []),
    ].join('\n');
    void navigator.clipboard?.writeText(text).then(
      () => alert('已複製名單，可以直接貼到 LINE'),
      () => prompt('請手動複製：', text),
    );
  };

  if (adding) {
    return (
      <Card>
        <h2 className="mb-3 font-bold">代為報名</h2>
        <EntryForm
          submitLabel="新增報名"
          busy={save.busy}
          error={save.error}
          onCancel={() => setAdding(false)}
          onSubmit={(entry, contact) =>
            void save.run(async () => {
              await store.addEntry(user!.uid, entry, contact);
              setAdding(false);
              reload();
            })
          }
        />
      </Card>
    );
  }

  const editing = editingId ? entries.find((e) => e.id === editingId) : undefined;
  if (editing) {
    return (
      <Card>
        <h2 className="mb-3 font-bold">修改報名：{editing.nickname}</h2>
        <EntryForm
          initialEntry={editing}
          initialContact={contacts?.[editing.id]}
          submitLabel="儲存"
          busy={save.busy}
          error={save.error}
          onCancel={() => setEditingId(undefined)}
          onSubmit={(entry, contact) =>
            void save.run(async () => {
              await store.updateEntry(editing.id, { nickname: entry.nickname, grade: entry.grade ?? '', beyName: entry.beyName ?? '', emoji: entry.emoji });
              await store.saveContact(editing.id, { ...contact, ownerUid: contacts?.[editing.id]?.ownerUid ?? editing.ownerUid });
              setEditingId(undefined);
              reload();
            })
          }
        />
      </Card>
    );
  }

  const section = (title: string, list: EntryDoc[], color: string) =>
    list.length > 0 && (
      <div className="space-y-2">
        <h3 className={`text-sm font-bold ${color}`}>
          {title}（{list.length}）
        </h3>
        {list.map((e, i) => (
          <EntryRow
            key={e.id}
            index={i + 1}
            entry={e}
            contact={contacts?.[e.id]}
            ownerCount={ownerCounts.get(e.ownerUid) ?? 0}
            maxPerOwner={ev.maxEntriesPerOwner}
            onEdit={() => setEditingId(e.id)}
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-2">
          <div className="text-xs text-slate-400">正取</div>
          <div className="font-mono text-xl font-black">
            {c.confirmed.length}/{ev.capacity}
          </div>
        </Card>
        <Card className="p-2">
          <div className="text-xs text-slate-400">候補</div>
          <div className="font-mono text-xl font-black">
            {c.waitlist.length}/{ev.waitlistCapacity}
          </div>
        </Card>
        <Card className="p-2">
          <div className="text-xs text-slate-400">要借陀螺</div>
          <div className="font-mono text-xl font-black">{borrowCount}</div>
        </Card>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setAdding(true)}>
          ＋ 代為報名
        </Button>
        <Button variant="secondary" className="flex-1" onClick={exportText}>
          複製名單
        </Button>
        <Button variant="ghost" onClick={reload} disabled={load.busy}>
          ↻
        </Button>
      </div>
      <ErrorText>{load.error}</ErrorText>
      {!contacts && load.busy && <Spinner label="讀取聯絡資料…" />}
      {entries.length === 0 && <p className="py-8 text-center text-slate-500">還沒有人報名</p>}
      {section('正取', c.confirmed, 'text-cyan-300')}
      {section('候補', c.waitlist, 'text-amber-300')}
      {section('超過名額（請處理）', c.overflow, 'text-rose-300')}
      {section('已取消', cancelled, 'text-slate-500')}
    </div>
  );
}

function EntryRow({
  index,
  entry,
  contact,
  ownerCount,
  maxPerOwner,
  onEdit,
}: {
  index: number;
  entry: EntryDoc;
  contact?: ContactDoc;
  ownerCount: number;
  maxPerOwner: number;
  onEdit: () => void;
}) {
  const { store } = useReadyEvent();
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const cancelled = entry.status === 'cancelled';
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 p-3 ${cancelled ? 'opacity-60' : ''}`}>
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(!open)}>
        <span className="w-5 text-right font-mono text-xs text-slate-500">{cancelled ? '–' : index}</span>
        <span className="text-xl">{entry.emoji ?? '🌀'}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">
            {entry.nickname}
            {contact?.childRealName && <span className="ml-1 text-xs font-normal text-slate-400">（{contact.childRealName}）</span>}
          </div>
          <div className="truncate text-xs text-slate-400">
            {contact ? `${contact.parentName}${contact.phone ? `・${contact.phone}` : ''}` : '（無聯絡資料）'}
          </div>
        </div>
        {contact?.needsBorrowBey && <Badge className="bg-amber-500/20 text-amber-300">借陀螺</Badge>}
        {ownerCount > maxPerOwner && <Badge className="bg-rose-500/20 text-rose-300">同一人 {ownerCount} 筆</Badge>}
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-800 pt-2 text-sm">
          {entry.grade && <div>年級：{entry.grade}</div>}
          {entry.beyName && <div>陀螺：{entry.beyName}</div>}
          {contact?.note && <div className="whitespace-pre-wrap text-amber-200">備註：{contact.note}</div>}
          <div className="text-xs text-slate-500">報名時間：{new Date(entry.createdAt).toLocaleString('zh-TW')}</div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 py-1.5 text-sm" onClick={onEdit}>
              修改
            </Button>
            {cancelled ? (
              <Button variant="secondary" className="flex-1 py-1.5 text-sm" disabled={busy} onClick={() => void run(() => store.updateEntry(entry.id, { status: 'active' }))}>
                恢復報名
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="flex-1 py-1.5 text-sm"
                disabled={busy}
                onClick={() => confirm(`取消「${entry.nickname}」的報名？`) && void run(() => store.updateEntry(entry.id, { status: 'cancelled' }))}
              >
                取消報名
              </Button>
            )}
            <Button
              variant="danger"
              className="py-1.5 text-sm"
              disabled={busy}
              onClick={() => confirm(`永久刪除「${entry.nickname}」（含聯絡資料）？`) && void run(() => store.deleteEntry(entry.id))}
            >
              刪除
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
