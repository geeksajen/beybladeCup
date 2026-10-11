import { useState } from 'react';
import { sortActive } from '../../engine/registration';
import { FINISH_LABELS, FINISH_TYPES, STATUS_FLOW, STATUS_LABELS, type SetupValues } from '../../lib/defaults';
import { useReadyEvent } from '../../providers/EventProvider';
import { resetLocalData } from '../../store/localAdapter';
import type { EventDoc, EventStatus, RuleConfig } from '../../types';
import { Button, Card, ErrorText, Field, inputClass, Toggle, useAction } from '../ui';
import { EventSetupForm } from './EventSetupForm';

const STATUS_HELP: Record<EventStatus, string> = {
  draft: '訪客只看得到活動資訊，不能報名',
  open: '開放報名（到截止時間會自動停止受理）',
  closed: '停止報名，等待比賽',
  running: '比賽中：可以報到、產生賽程、計分',
  finished: '比賽結束，公布結果（建議在「頒獎」分頁操作）',
};

export function EventSettings() {
  const { event: ev, store, entries, bracket } = useReadyEvent();
  const setup = useAction();
  const status = useAction();
  const privacy = useAction();
  const [savedMsg, setSavedMsg] = useState<string>();

  const initial: SetupValues = {
    title: ev.title,
    startAt: ev.startAt,
    registerDeadline: ev.registerDeadline,
    capacity: ev.capacity,
    waitlistCapacity: ev.waitlistCapacity,
    arenaCount: ev.rules.arenaCount,
  };
  const locked = ev.status === 'running' || ev.status === 'finished';

  const saveSetup = (v: SetupValues) => {
    const activeCount = sortActive(entries).length;
    if (v.capacity < ev.capacity && v.capacity < activeCount) {
      if (!confirm(`目前有 ${activeCount} 位有效報名，正取改成 ${v.capacity} 位後，多出的人會變成候補。確定嗎？`)) return;
    }
    if (bracket && v.arenaCount !== ev.rules.arenaCount) {
      if (!confirm('已經產生賽程。修改戰鬥盤數量後需要到「賽程」重新產生賽程才會套用（不會自動改動現有賽程）。確定嗎？')) return;
    }
    void setup.run(async () => {
      await store.updateEvent({
        title: v.title,
        startAt: v.startAt!,
        registerDeadline: v.registerDeadline!,
        capacity: v.capacity,
        waitlistCapacity: v.waitlistCapacity,
        rules: { ...ev.rules, arenaCount: v.arenaCount },
      });
      setSavedMsg('已儲存基本設定');
    });
  };

  const changeStatus = (s: EventStatus) => {
    if (s === ev.status) return;
    if (!confirm(`把狀態改成「${STATUS_LABELS[s]}」？\n${STATUS_HELP[s]}`)) return;
    void status.run(() => store.updateEvent({ status: s }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-bold">比賽狀態</h2>
        <div className="grid grid-cols-5 gap-1">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              disabled={status.busy}
              onClick={() => changeStatus(s)}
              className={`rounded-lg px-1 py-2 text-xs font-bold ${ev.status === s ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">{STATUS_HELP[ev.status]}</p>
        {ev.status === 'draft' && (
          <Button variant="neon" className="mt-3 w-full" disabled={status.busy} onClick={() => changeStatus('open')}>
            開放報名 🚀
          </Button>
        )}
        <ErrorText>{status.error}</ErrorText>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">基本設定</h2>
        <EventSetupForm
          key={ev.updatedAt}
          initial={initial}
          requireFuture={false}
          lockSchedule={locked}
          submitLabel="儲存基本設定"
          busy={setup.busy}
          error={setup.error}
          onSubmit={saveSetup}
        />
        {savedMsg && !setup.error && <p className="mt-2 text-center text-sm text-emerald-600">{savedMsg}</p>}
      </Card>

      <OtherSettings ev={ev} />

      <Card>
        <h2 className="mb-1 font-bold">隱私</h2>
        <p className="mb-3 text-xs text-slate-600">比賽結束一個月後，請清除所有家長聯絡資料。結果頁（只有暱稱）會保留。</p>
        <Button
          variant="danger"
          className="w-full"
          disabled={privacy.busy}
          onClick={() => {
            if (confirm('確定要永久刪除所有報名的聯絡資料（家長姓名、電話、本名、備註）嗎？無法復原。'))
              void privacy.run(async () => {
                const n = await store.clearContacts();
                alert(`已刪除 ${n} 筆聯絡資料`);
              });
          }}
        >
          清除聯絡資料
        </Button>
        <ErrorText>{privacy.error}</ErrorText>
      </Card>

      {store.mode === 'local' && (
        <Card className="border-amber-500/40">
          <h2 className="mb-1 font-bold text-amber-700">開發工具（本機模式）</h2>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              if (confirm('清空本機所有資料，回到初次設定？')) resetLocalData();
            }}
          >
            清空本機資料
          </Button>
        </Card>
      )}
    </div>
  );
}

function OtherSettings({ ev }: { ev: EventDoc }) {
  const { store } = useReadyEvent();
  const { busy, error, run } = useAction();
  const [saved, setSaved] = useState(false);
  const [subtitle, setSubtitle] = useState(ev.subtitle ?? '');
  const [locationHint, setLocationHint] = useState(ev.locationHint);
  const [announcement, setAnnouncement] = useState(ev.announcement ?? '');
  const [maxEntries, setMaxEntries] = useState(ev.maxEntriesPerOwner);
  const [rules, setRules] = useState<RuleConfig>(ev.rules);

  const setRule = <K extends keyof RuleConfig>(k: K, v: RuleConfig[K]) => {
    setSaved(false);
    setRules((r) => ({ ...r, [k]: v }));
  };

  const save = () => {
    if (!Number.isInteger(rules.pointsToWin) || rules.pointsToWin < 1 || rules.pointsToWin > 10) return alert('勝利分數需要 1～10');
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 10) return alert('每人報名上限需要 1～10');
    void run(async () => {
      await store.updateEvent({
        subtitle: subtitle.trim(),
        locationHint: locationHint.trim(),
        announcement: announcement.trim(),
        maxEntriesPerOwner: maxEntries,
        // arenaCount 由基本設定管理，這裡保留目前的值
        rules: { ...rules, arenaCount: ev.rules.arenaCount },
      });
      setSaved(true);
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="font-bold">其他設定</h2>
      <Field label="副標題">
        <input className={inputClass} value={subtitle} maxLength={40} onChange={(e) => setSubtitle(e.target.value)} />
      </Field>
      <Field label="地點提示（公開）" hint="不要寫詳細地址，網站是公開的">
        <input className={inputClass} value={locationHint} maxLength={60} onChange={(e) => setLocationHint(e.target.value)} />
      </Field>
      <Field label="首頁公告">
        <textarea className={inputClass} rows={3} maxLength={300} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
      </Field>
      <Field label="每位家長最多報名幾人">
        <input className={inputClass} type="number" min={1} max={10} value={maxEntries} onChange={(e) => setMaxEntries(Number(e.target.value))} />
      </Field>
      <div className="border-t border-slate-200 pt-3">
        <h3 className="mb-2 text-sm font-bold text-cyan-700">規則參數（Beyblade X）</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="先得幾分獲勝">
            <input className={inputClass} type="number" min={1} max={10} value={rules.pointsToWin} onChange={(e) => setRule('pointsToWin', Number(e.target.value))} />
          </Field>
          <Field label="每場預估分鐘">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={30}
              value={rules.minutesPerMatch}
              onChange={(e) => setRule('minutesPerMatch', Number(e.target.value))}
            />
          </Field>
          {FINISH_TYPES.map((f) => (
            <Field key={f} label={`${FINISH_LABELS[f].name} Finish 分數`}>
              <input
                className={inputClass}
                type="number"
                min={0}
                max={5}
                value={rules.finishPoints[f]}
                onChange={(e) => setRule('finishPoints', { ...rules.finishPoints, [f]: Number(e.target.value) })}
              />
            </Field>
          ))}
        </div>
        <Toggle label="發射失誤罰則（第二次起判對方 +1）" checked={rules.launchErrorPenalty} onChange={(v) => setRule('launchErrorPenalty', v)} />
        <Toggle label="淘汰賽打季軍戰" checked={rules.thirdPlaceMatch} onChange={(v) => setRule('thirdPlaceMatch', v)} />
      </div>
      <ErrorText>{error}</ErrorText>
      <Button className="w-full" disabled={busy} onClick={save}>
        {busy ? '儲存中…' : '儲存其他設定'}
      </Button>
      {saved && !error && <p className="text-center text-sm text-emerald-600">已儲存</p>}
    </Card>
  );
}
