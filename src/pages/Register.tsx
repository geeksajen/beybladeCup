import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EntryForm } from '../components/EntryForm';
import { Confetti } from '../components/fx/Confetti';
import { Icon } from '../components/icons';
import { Button, Card, useAction } from '../components/ui';
import { deckSizeOf } from '../engine/deck';
import { entryPosition, registrationState } from '../engine/registration';
import { isInAppBrowser } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';

export default function Register() {
  const { event: ev, entries, user, store } = useReadyEvent();
  const now = useNow(5000);
  const { busy, error, run } = useAction();
  const [createdId, setCreatedId] = useState<string>();
  const [formKey, setFormKey] = useState(0);
  const state = registrationState(ev, entries, user?.uid, now);

  if (createdId) {
    const pos = entryPosition(entries, ev, createdId);
    const entry = entries.find((e) => e.id === createdId);
    return (
      <div className="space-y-4 pt-6 text-center">
        {pos.kind === 'confirmed' && <Confetti count={60} />}
        {pos.kind === 'confirmed' ? <Icon name="party" className="text-6xl text-accent" /> : <Icon name="hourglass" className="text-6xl text-gold" />}
        <h1 className="neon-text text-2xl font-black">報名成功！</h1>
        {entry && (
          <p className="text-lg">
            {entry.emoji} {entry.nickname}
          </p>
        )}
        <Card>
          {pos.kind === 'confirmed' && <p className="text-xl font-bold text-primary">正取第 {pos.index} 位</p>}
          {pos.kind === 'waitlist' && (
            <p className="text-xl font-bold text-gold">候補第 {pos.index} 位（有人取消時會自動遞補）</p>
          )}
          {pos.kind === 'unknown' && <p className="text-ink">資料同步中…</p>}
        </Card>
        {entry && !entry.deck?.length && (
          <Card className="text-left text-sm text-ink"><Icon name="bey" className="mr-1 text-primary" />還沒登錄 Deck 沒關係，比賽前到「我的報名」補上就好，當天報到會比較快。</Card>
        )}
        <Card className="border-gold/40 text-left text-sm text-gold">
          <Icon name="alert" className="mr-1" />
          之後要修改或取消，請用<b>同一支手機、同一個瀏覽器</b>打開「我的報名」。換裝置的話請直接聯絡主辦。
        </Card>
        <div className="flex gap-2">
          <Link to="/my" className="flex-1">
            <Button variant="secondary" className="w-full">
              我的報名
            </Button>
          </Link>
          {registrationState(ev, entries, user?.uid, now).canRegister && (
            <Button
              className="flex-1"
              onClick={() => {
                setCreatedId(undefined);
                setFormKey((k) => k + 1);
              }}
            >
              再報名一位
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-black">我要報名</h1>
      {isInAppBrowser() && (
        <Card className="border-gold/60 bg-gold/10 text-sm text-gold">
          <Icon name="phone" className="mr-1" />
          你正在用 LINE / FB 的內建瀏覽器。之後要修改報名必須用同一個瀏覽器，建議點右上角「⋯」選擇<b>用 Safari／Chrome 開啟</b>後再報名。
        </Card>
      )}
      {!state.canRegister ? (
        <Card className="text-center">
          <p className="text-lg font-bold">{state.reason}</p>
          <Link to="/" className="mt-3 inline-block text-primary underline">
            回首頁
          </Link>
        </Card>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            不限同學、不限年級，兄弟姊妹也可以報名。每位家長最多替 {ev.maxEntriesPerOwner} 位小朋友報名
            {state.myActiveCount > 0 && `（你已報名 ${state.myActiveCount} 位）`}。
          </p>
          {state.willBeWaitlist && (
            <Card className="border-gold/50 text-sm text-gold">正取名額已滿，現在報名會進入候補名單。</Card>
          )}
          <Card>
            <EntryForm
              key={formKey}
              deckSize={deckSizeOf(ev)}
              submitLabel={state.willBeWaitlist ? '送出（候補）' : '送出報名'}
              busy={busy}
              error={error}
              onSubmit={(entry, contact) =>
                void run(async () => {
                  if (!user) throw new Error('尚未連線，請稍後再試');
                  const id = await store.addEntry(user.uid, entry, contact);
                  setCreatedId(id);
                  window.scrollTo(0, 0);
                })
              }
            />
          </Card>
        </>
      )}
    </div>
  );
}
