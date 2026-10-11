import { useState, type FormEvent } from 'react';
import { defaultDeadlineFor, validateSetup, type SetupErrors, type SetupValues } from '../../lib/defaults';
import { fromLocalInput, toLocalInput } from '../../lib/format';
import { Button, ErrorText, Field, inputClass } from '../ui';

/**
 * 初次設定頁與後台「活動設定」共用的表單（spec §4.3、§7.1）。
 */
export function EventSetupForm({
  initial,
  requireFuture,
  submitLabel,
  lockSchedule,
  onSubmit,
  busy,
  error,
}: {
  initial: SetupValues;
  requireFuture: boolean;
  submitLabel: string;
  /** 比賽開始後日期與名額改為唯讀 */
  lockSchedule?: boolean;
  onSubmit: (v: SetupValues) => void;
  busy?: boolean;
  error?: string;
}) {
  const [v, setV] = useState<SetupValues>(initial);
  const [deadlineTouched, setDeadlineTouched] = useState(initial.registerDeadline != null);
  const [submitted, setSubmitted] = useState(false);
  // 第一次送出後即時驗證，修正後錯誤訊息馬上消失
  const errors: SetupErrors = submitted ? validateSetup(v, Date.now(), requireFuture) : {};

  const set = <K extends keyof SetupValues>(k: K, value: SetupValues[K]) => setV((prev) => ({ ...prev, [k]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateSetup(v, Date.now(), requireFuture);
    if (Object.keys(errs).length === 0) onSubmit({ ...v, title: v.title.trim() });
  };

  const num = (s: string) => (s === '' ? NaN : Number(s));

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="比賽名稱" required error={errors.title}>
        <input className={inputClass} value={v.title} maxLength={30} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="比賽日期與開始時間" required error={errors.startAt}>
        <input
          className={inputClass}
          type="datetime-local"
          disabled={lockSchedule}
          value={toLocalInput(v.startAt)}
          onChange={(e) => {
            const t = fromLocalInput(e.target.value);
            setV((prev) => ({
              ...prev,
              startAt: t,
              registerDeadline: !deadlineTouched && t != null ? defaultDeadlineFor(t) : prev.registerDeadline,
            }));
          }}
        />
      </Field>
      <Field label="報名截止日期與時間" required hint="預設為比賽前一天 21:00" error={errors.registerDeadline}>
        <input
          className={inputClass}
          type="datetime-local"
          disabled={lockSchedule}
          value={toLocalInput(v.registerDeadline)}
          onChange={(e) => {
            setDeadlineTouched(true);
            set('registerDeadline', fromLocalInput(e.target.value));
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="正取名額" required hint="4～24 人" error={errors.capacity}>
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={4}
            max={24}
            disabled={lockSchedule}
            value={Number.isNaN(v.capacity) ? '' : v.capacity}
            onChange={(e) => set('capacity', num(e.target.value))}
          />
        </Field>
        <Field label="候補名額" required hint="0～10 人" error={errors.waitlistCapacity}>
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            disabled={lockSchedule}
            value={Number.isNaN(v.waitlistCapacity) ? '' : v.waitlistCapacity}
            onChange={(e) => set('waitlistCapacity', num(e.target.value))}
          />
        </Field>
      </div>
      <Field label="戰鬥盤數量" required group hint="2 個盤可以兩場同時進行" error={errors.arenaCount}>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set('arenaCount', n)}
              className={`rounded-lg border px-3 py-2.5 font-bold ${
                v.arenaCount === n ? 'border-cyan-600 bg-cyan-500/20 text-cyan-800' : 'border-slate-400 text-slate-700'
              }`}
            >
              {n} 個
            </button>
          ))}
        </div>
      </Field>
      {lockSchedule && <p className="text-xs text-amber-700">比賽已開始，日期與名額不能再修改。</p>}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? '儲存中…' : submitLabel}
      </Button>
    </form>
  );
}
