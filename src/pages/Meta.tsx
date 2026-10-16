import { useMemo, useState } from 'react';
import { MetaHighlights } from '../components/MetaHighlights';
import { Card } from '../components/ui';
import { deckPublic } from '../engine/deck';
import { byWinRate, computeMeta, META_MIN_BATTLES, winRate, type MetaKind, type MetaRow } from '../engine/meta';
import { usePersistentState } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';

const TABS: { key: MetaKind; label: string }[] = [
  { key: 'blade', label: 'Blade' },
  { key: 'ratchet', label: 'Ratchet' },
  { key: 'bit', label: 'Bit' },
  { key: 'combo', label: '完整組合' },
];

/** Meta 強勢榜：本次大賽各零件的使用人數、勝率、終結方式（以局計算）。 */
export default function MetaPage() {
  const { event: ev, bracket, entryById } = useReadyEvent();
  const [tab, setTab] = usePersistentState<MetaKind>('metaTab', 'blade');
  const [sort, setSort] = useState<'popular' | 'winRate'>('popular');
  const meta = useMemo(() => (bracket ? computeMeta(bracket) : undefined), [bracket]);

  if (!deckPublic(ev) || !meta) {
    return (
      <div className="pt-10 text-center">
        <div className="text-5xl">📊</div>
        <h1 className="mt-3 text-2xl font-black">Meta 強勢榜</h1>
        <p className="mt-2 text-slate-700">比賽開始後，這裡會統計大家的 Deck 與零件勝率。</p>
      </div>
    );
  }

  const rows = meta.rows[tab];
  const shown: MetaRow[] = sort === 'winRate' ? [...byWinRate(rows), ...rows.filter((r) => r.battles < META_MIN_BATTLES)] : rows;

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-black">📊 Meta 強勢榜</h1>
        <p className="mt-1 text-xs text-slate-600">
          本次大賽的趣味統計，共 {meta.battles} 局有 Deck 紀錄（以局計算，快速輸入比分的場次不計）。人數少、樣本小，看看就好 😄
        </p>
      </div>

      {meta.battles === 0 ? (
        <Card className="text-center text-sm text-slate-600">還沒有比賽紀錄，打完幾局後就會出現。</Card>
      ) : (
        <MetaHighlights meta={meta} entryById={entryById} />
      )}

      <Card>
        <div className="mb-3 grid grid-cols-4 gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg py-1.5 text-xs font-bold ${tab === t.key ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">勝率需要至少 {META_MIN_BATTLES} 局才排名</span>
          <div className="flex gap-1">
            {(['popular', 'winRate'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded-full px-2.5 py-0.5 font-bold ${sort === s ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'}`}
              >
                {s === 'popular' ? '依人氣' : '依勝率'}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-slate-500">還沒有資料</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500">
                <th className="pb-1 font-semibold">零件</th>
                <th className="pb-1 text-right font-semibold">人數</th>
                <th className="pb-1 text-right font-semibold">局數</th>
                <th className="pb-1 text-right font-semibold">勝率</th>
                <th className="pb-1 text-right font-semibold" title="Xtreme／Burst">🔥💥</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const enough = r.battles >= META_MIN_BATTLES;
                return (
                  <tr key={r.key} className="border-t border-slate-100">
                    <td className="max-w-0 truncate py-1.5 pr-2 font-bold">{r.label}</td>
                    <td className="py-1.5 text-right font-mono">{r.players}</td>
                    <td className="py-1.5 text-right font-mono">{r.battles}</td>
                    <td className={`py-1.5 text-right font-mono ${enough ? 'font-black text-cyan-700' : 'text-slate-400'}`}>
                      {r.battles === 0 ? '—' : `${Math.round(winRate(r) * 100)}%`}
                    </td>
                    <td className="py-1.5 text-right font-mono text-xs text-slate-600">
                      {r.finishes.xtreme}/{r.finishes.burst}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[11px] text-slate-500">灰色勝率 = 局數太少，僅供參考。同一個零件互打的局不計入該零件的勝率。</p>
      </Card>
    </div>
  );
}
