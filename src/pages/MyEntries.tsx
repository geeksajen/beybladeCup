import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DeckEditor, DeckView } from '../components/Deck';
import { PlayerName } from '../components/avatars';
import { EntryForm } from '../components/EntryForm';
import { Icon } from '../components/icons';
import { NextUpBanner } from '../components/NextUp';
import { Badge, Button, Card, ErrorText, Spinner, useAction } from '../components/ui';
import { deckEditableByOwner, deckSizeOf } from '../engine/deck';
import { entryPosition, isRegistrationOpen, sortActive } from '../engine/registration';
import { useNow } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';
import type { ContactDoc, EntryDoc } from '../types';

export default function MyEntries() {
  const { event: ev, entries, user, entriesLoaded } = useReadyEvent();
  const now = useNow(10000);
  const mine = entries.filter((e) => e.ownerUid === user?.uid);
  const active = sortActive(mine);
  const cancelled = mine.filter((e) => e.status === 'cancelled');
  const editable = isRegistrationOpen(ev, now);

  if (!entriesLoaded) return <Spinner />;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-black">我的報名</h1>
      <p className="text-sm text-ink-muted">這裡只會顯示用<b>這個瀏覽器</b>送出的報名。換了手機或瀏覽器的話，請聯絡主辦幫忙修改。</p>
      {deckEditableByOwner(ev) && active.some((e) => !e.deck?.length) && (
        <Card className="border-gold bg-gold/10 text-sm text-gold">
          <Icon name="alert" className="mr-1" />
          還沒登錄 Deck：<b>{active.filter((e) => !e.deck?.length).map((e) => e.nickname).join('、')}</b>
          <div className="mt-1 text-xs">比賽前先登錄，當天報到會快很多！不登錄也能比賽，只是不會列入 Meta 強勢榜。</div>
        </Card>
      )}
      {active.length === 0 && (
        <Card className="text-center">
          <p className="text-ink">這個瀏覽器還沒有報名紀錄。</p>
          {editable && (
            <Link to="/register">
              <Button variant="neon" className="mt-3">
                我要報名
              </Button>
            </Link>
          )}
        </Card>
      )}
      {active.map((e) => (
        <MyEntryCard key={e.id} entry={e} editable={editable} />
      ))}
      {!editable && active.length > 0 && <p className="text-center text-sm text-ink-muted">報名已截止，如需修改請聯絡主辦。</p>}
      {cancelled.length > 0 && (
        <div className="space-y-1 pt-2 text-sm text-ink-muted">
          <div>已取消：</div>
          {cancelled.map((e) => (
            <div key={e.id}>
              <PlayerName entry={e} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyEntryCard({ entry, editable }: { entry: EntryDoc; editable: boolean }) {
  const { event: ev, entries, store } = useReadyEvent();
  const pos = entryPosition(entries, ev, entry.id);
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState<ContactDoc | null>();
  const { busy, error, run } = useAction();

  const startEdit = () =>
    void run(async () => {
      setContact(await store.getContact(entry.id));
      setEditing(true);
    });

  if (editing) {
    return (
      <Card>
        <h2 className="mb-3 font-bold">修改報名</h2>
        <EntryForm
          initialEntry={entry}
          initialContact={contact ?? undefined}
          submitLabel="儲存修改"
          busy={busy}
          error={error}
          onCancel={() => setEditing(false)}
          onSubmit={(input, c) =>
            void run(async () => {
              await store.updateEntry(entry.id, {
                nickname: input.nickname,
                grade: input.grade ?? '',
                beyName: input.beyName ?? '',
                emoji: input.emoji,
              });
              await store.saveContact(entry.id, { ...c, ownerUid: entry.ownerUid });
              setEditing(false);
            })
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xl font-black">
            <PlayerName entry={entry} />
          </div>
          <div className="text-sm text-ink-muted">{[entry.grade, entry.beyName].filter(Boolean).join('・')}</div>
        </div>
        {pos.kind === 'confirmed' && <Badge className="bg-primary/20 text-primary">正取 #{pos.index}</Badge>}
        {pos.kind === 'waitlist' && <Badge className="bg-gold/20 text-gold">候補 #{pos.index}</Badge>}
        {pos.kind === 'overflow' && <Badge className="bg-danger/20 text-danger">超過名額</Badge>}
      </div>
      <div className="mt-3 space-y-2">
        <NextUpBanner entryId={entry.id} />
        <MyDeck entry={entry} />
        <Link to={`/player/${entry.id}`} className="block text-sm font-bold text-primary">
          <Icon name="idcard" className="mr-1" />
          看選手卡 →
        </Link>
      </div>
      <ErrorText>{error}</ErrorText>
      {editable && (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={busy} onClick={startEdit}>
            修改
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              if (confirm(`確定要取消「${entry.nickname}」的報名嗎？`)) void run(() => store.updateEntry(entry.id, { status: 'cancelled' }));
            }}
          >
            取消報名
          </Button>
        </div>
      )}
    </Card>
  );
}

function MyDeck({ entry }: { entry: EntryDoc }) {
  const { event: ev, store, isFamily } = useReadyEvent();
  const [editing, setEditing] = useState(false);
  const { busy, error, run } = useAction();
  const size = deckSizeOf(ev);
  const editable = deckEditableByOwner(ev) || isFamily;

  return (
    <div className="rounded-xl border border-line p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-bold"><Icon name="bey" className="mr-1 text-primary" />{size === 3 ? '3on3 Deck' : '我的陀螺'}</span>
        {editable && !editing && (
          <button type="button" className="text-sm font-bold text-primary" onClick={() => setEditing(true)}>
            {entry.deck?.length ? '修改' : '登錄'}
          </button>
        )}
      </div>
      {editing ? (
        <DeckEditor
          initial={entry.deck}
          size={size}
          busy={busy}
          error={error}
          onCancel={() => setEditing(false)}
          onSave={(deck) =>
            void run(async () => {
              await store.updateEntry(entry.id, { deck });
              setEditing(false);
            })
          }
        />
      ) : (
        <>
          <DeckView deck={entry.deck} className="text-sm" />
          <p className="mt-1.5 text-[11px] text-ink-muted">
            {editable ? '比賽開始前只有你和主辦看得到。比賽開始後 Deck 就固定了。' : '比賽已開始，Deck 已固定；需要修改請找主辦。'}
          </p>
        </>
      )}
    </div>
  );
}
