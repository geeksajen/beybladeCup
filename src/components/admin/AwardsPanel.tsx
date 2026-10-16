import { useState } from 'react';
import { computeFinalRanking } from '../../engine/advance';
import { autoAwards, DEFAULT_MANUAL_AWARDS } from '../../engine/awards';
import { predictionAwards } from '../../engine/predictions';
import { displayName } from '../../lib/format';
import { usePredictions, useReadyEvent } from '../../providers/EventProvider';
import type { Award } from '../../types';
import { Button, Card, ErrorText, inputClass, useAction } from '../ui';

export function AwardsPanel() {
  const { bracket, event: ev, store, entryById } = useReadyEvent();
  const [manual, setManual] = useState<Award[]>(() => {
    const saved = bracket?.awards?.filter((a) => a.manual);
    return saved && saved.length ? saved : DEFAULT_MANUAL_AWARDS;
  });
  const [newLabel, setNewLabel] = useState('');
  const { busy, error, run } = useAction();
  const preds = usePredictions();

  if (!bracket) return <Card className="text-center text-slate-700">還沒有賽程。</Card>;

  const auto = [...autoAwards(bracket), ...predictionAwards(bracket, preds)];
  const ranking = computeFinalRanking(bracket);
  const remaining = bracket.matches.filter((m) => m.status !== 'done').length;
  const finished = ev.status === 'finished';

  const toggle = (key: string, id: string) =>
    setManual((list) =>
      list.map((a) => (a.key !== key ? a : { ...a, entryIds: a.entryIds.includes(id) ? a.entryIds.filter((x) => x !== id) : [...a.entryIds, id] })),
    );

  const publish = () => {
    if (!confirm('公布結果？大螢幕會播放頒獎畫面，比賽狀態改為「已結束」。')) return;
    void run(async () => {
      await store.mutateBracket((cur) =>
        cur
          ? {
              ...cur,
              awards: [...autoAwards(cur), ...predictionAwards(cur, preds), ...manual.filter((a) => a.entryIds.length > 0)],
              finalRanking: computeFinalRanking(cur),
            }
          : cur,
      );
      await store.updateEvent({ status: 'finished', predictionsOpen: false });
    });
  };

  return (
    <div className="space-y-4">
      {remaining > 0 && <Card className="border-amber-500/50 text-sm text-amber-800">還有 {remaining} 場未完成，名次確定後才能公布結果。</Card>}

      <Card>
        <h2 className="mb-2 font-bold">系統計算的獎項</h2>
        {auto.length === 0 && <p className="text-sm text-slate-500">比賽完成後會自動計算。</p>}
        <div className="space-y-1.5">
          {auto.map((a) => (
            <div key={a.key} className="flex items-center justify-between rounded-lg bg-slate-200/60 px-3 py-2">
              <span className="font-bold">{a.label}</span>
              <span className="text-right">{a.entryIds.map((id) => displayName(entryById.get(id))).join('、')}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">只頒發榮譽稱號，不設實體獎品。Xtreme 王／爆裂王依逐局紀錄統計（快速輸入比分的場次不計）。小預言家／人氣王來自猜冠軍投票。</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">手動指定的獎項</h2>
        {manual.map((a) => (
          <div key={a.key} className="rounded-xl bg-slate-200/40 p-2">
            <div className="mb-2 flex items-center gap-2">
              <input
                className={`${inputClass} py-1.5`}
                value={a.label}
                onChange={(e) => setManual((list) => list.map((x) => (x.key === a.key ? { ...x, label: e.target.value } : x)))}
              />
              <button type="button" className="px-2 text-rose-600" onClick={() => setManual((list) => list.filter((x) => x.key !== a.key))}>
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bracket.playerIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(a.key, id)}
                  className={`rounded-full px-2.5 py-1 text-sm ${a.entryIds.includes(id) ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  {displayName(entryById.get(id))}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input className={inputClass} placeholder="新增獎項，例如：😄 最佳運動精神" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <Button
            variant="secondary"
            disabled={!newLabel.trim()}
            onClick={() => {
              setManual((list) => [...list, { key: `custom-${Date.now()}`, label: newLabel.trim(), entryIds: [], manual: true }]);
              setNewLabel('');
            }}
          >
            新增
          </Button>
        </div>
        <p className="text-xs text-slate-500">🎖️ 全員參加獎會自動列出所有參賽者。</p>
      </Card>

      <ErrorText>{error}</ErrorText>
      {finished ? (
        <div className="space-y-2">
          <Button className="w-full" disabled={busy} onClick={publish}>
            更新公布的結果
          </Button>
          <Button variant="ghost" className="w-full text-sm" disabled={busy} onClick={() => confirm('撤回公布，回到「比賽中」？') && void run(() => store.updateEvent({ status: 'running' }))}>
            撤回公布
          </Button>
        </div>
      ) : (
        <Button variant="neon" className="w-full py-4 text-lg" disabled={busy || !ranking} onClick={publish}>
          🏆 公布結果
        </Button>
      )}
    </div>
  );
}
