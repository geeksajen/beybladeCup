import { useState, type FormEvent } from 'react';
import { AVATAR_KEYS } from '../lib/defaults';
import { DeckEditor, DeckView } from './Deck';
import type { ContactInput, EntryInput } from '../types';
import { Avatar, avatarKey, avatarName } from './avatars';
import { Icon } from './icons';
import { Button, ErrorText, Field, inputClass, Toggle } from './ui';

export const EMPTY_ENTRY: EntryInput = { nickname: '', grade: '', beyName: '', emoji: AVATAR_KEYS[0] };
export const EMPTY_CONTACT: ContactInput = { parentName: '', phone: '', childRealName: '', note: '', needsBorrowBey: false };

type Errors = Partial<Record<'nickname' | 'beyName' | 'grade' | 'parentName' | 'phone', string>>;

function validate(e: EntryInput, c: ContactInput): Errors {
  const errs: Errors = {};
  const nick = e.nickname.trim();
  if (nick.length < 1 || nick.length > 12) errs.nickname = '暱稱需要 1～12 字';
  if ((e.beyName ?? '').trim().length > 20) errs.beyName = '陀螺名稱最多 20 字';
  if ((e.grade ?? '').trim().length > 10) errs.grade = '最多 10 字';
  if (c.parentName.trim().length < 1) errs.parentName = '請填寫家長稱呼';
  if (c.phone && !/^[0-9+\-\s()]{6,20}$/.test(c.phone.trim())) errs.phone = '電話格式不正確';
  return errs;
}

/** 把空字串欄位拿掉（Firestore 規則與顯示都以「沒有這個欄位」表示未填）。 */
function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) out[k] = t;
    } else out[k] = v;
  }
  return out as T;
}

export function EntryForm({
  initialEntry = EMPTY_ENTRY,
  initialContact = EMPTY_CONTACT,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
  error,
  deckSize,
}: {
  /** 有傳才顯示選填的 Deck 區塊（新報名用；修改報名時 Deck 在「我的報名」另外編輯）。 */
  deckSize?: number;
  initialEntry?: EntryInput;
  initialContact?: ContactInput;
  submitLabel: string;
  onSubmit: (entry: EntryInput, contact: ContactInput) => void;
  onCancel?: () => void;
  busy?: boolean;
  error?: string;
}) {
  // 舊資料的頭像是 emoji，編輯時換成頭像代號，存檔後就是新格式
  const [entry, setEntry] = useState<EntryInput>(() => {
    const e = { ...EMPTY_ENTRY, ...initialEntry };
    return { ...e, emoji: avatarKey(e.emoji) };
  });
  const [contact, setContact] = useState<ContactInput>({ ...EMPTY_CONTACT, ...initialContact });
  const [submitted, setSubmitted] = useState(false);
  const [editingDeck, setEditingDeck] = useState(false);
  // 第一次送出後即時驗證，修正後錯誤訊息馬上消失
  const errors: Errors = submitted ? validate(entry, contact) : {};

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    const errs = validate(entry, contact);
    if (Object.keys(errs).length === 0) onSubmit(clean(entry), clean(contact));
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">選手資料（公開顯示）</h3>
        <Field label="比賽暱稱" required hint="請用綽號，不要用真實全名。例：閃電小明" error={errors.nickname}>
          <input
            className={inputClass}
            value={entry.nickname}
            maxLength={12}
            placeholder="閃電小明"
            onChange={(e) => setEntry({ ...entry, nickname: e.target.value })}
          />
        </Field>
        <Field label="頭像" group>
          <div className="grid grid-cols-5 gap-1.5">
            {AVATAR_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setEntry({ ...entry, emoji: k })}
                aria-label={avatarName(k)}
                aria-pressed={entry.emoji === k}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-3xl ${entry.emoji === k ? 'bg-primary/20 ring-2 ring-primary' : 'bg-raised'}`}
              >
                <Avatar value={k} />
                <span className="text-[10px] text-ink-muted">{avatarName(k)}</span>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="年級" hint="選填，不限年級" error={errors.grade}>
            <input className={inputClass} value={entry.grade ?? ''} maxLength={10} placeholder="三年級" onChange={(e) => setEntry({ ...entry, grade: e.target.value })} />
          </Field>
          <Field label="陀螺名稱" hint="選填" error={errors.beyName}>
            <input className={inputClass} value={entry.beyName ?? ''} maxLength={20} placeholder="Dran Sword" onChange={(e) => setEntry({ ...entry, beyName: e.target.value })} />
          </Field>
        </div>
      </div>

      {deckSize && (
        <div className="space-y-2 border-t border-line pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary"><Icon name="bey" className="mr-1" />{deckSize === 3 ? '3on3 Deck' : '陀螺組合'}（選填）</h3>
          <p className="text-xs text-ink-muted">
            可以現在登錄{deckSize === 3 ? ' 3 顆陀螺' : ''}，也可以之後在「我的報名」再填或修改。不登錄也能比賽，只是不會列入 Meta 強勢榜統計。比賽開始前只有你和主辦看得到。
          </p>
          {editingDeck ? (
            <div className="rounded-xl border border-line bg-canvas p-2">
              <DeckEditor
                initial={entry.deck}
                size={deckSize}
                busy={false}
                saveLabel="確定"
                onCancel={() => setEditingDeck(false)}
                onSave={(deck) => {
                  setEntry({ ...entry, deck: deck.length ? deck : undefined });
                  setEditingDeck(false);
                }}
              />
            </div>
          ) : (
            <>
              {entry.deck?.length ? <DeckView deck={entry.deck} className="text-sm" /> : null}
              <Button variant="secondary" className="w-full" onClick={() => setEditingDeck(true)}>
                {entry.deck?.length ? '修改 Deck' : `＋ 登錄 ${deckSize === 3 ? '3 顆陀螺' : '陀螺組合'}`}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="space-y-4 border-t border-line pt-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent">聯絡資料（只有主辦看得到）</h3>
        <Field label="家長稱呼" required error={errors.parentName}>
          <input className={inputClass} value={contact.parentName} maxLength={20} placeholder="小明媽媽" onChange={(e) => setContact({ ...contact, parentName: e.target.value })} />
        </Field>
        <Field label="聯絡電話" hint="選填，比賽當天聯絡用" error={errors.phone}>
          <input className={inputClass} type="tel" value={contact.phone ?? ''} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
        </Field>
        <Field label="小朋友本名" hint="選填，方便主辦認人，不會公開">
          <input className={inputClass} value={contact.childRealName ?? ''} maxLength={20} onChange={(e) => setContact({ ...contact, childRealName: e.target.value })} />
        </Field>
        <Field label="備註" hint="例如：會晚到">
          <textarea className={inputClass} rows={2} maxLength={200} value={contact.note ?? ''} onChange={(e) => setContact({ ...contact, note: e.target.value })} />
        </Field>
        <Toggle label="需要借陀螺／發射器" checked={contact.needsBorrowBey} onChange={(v) => setContact({ ...contact, needsBorrowBey: v })} />
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        {onCancel && (
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="submit" variant="neon" className="flex-1" disabled={busy || editingDeck}>
          {busy ? '送出中…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
