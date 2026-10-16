import { useState } from 'react';
import { checkDeck, deckPublic } from '../engine/deck';
import { CATALOG, comboLabel, type PartKind } from '../lib/parts';
import { useReadyEvent } from '../providers/EventProvider';
import type { Combo, EntryDoc } from '../types';
import { Button, ErrorText, inputClass } from './ui';

const EMPTY: Combo = { blade: '', ratchet: '', bit: '' };

/** 自己、主辦，或比賽開始後才看得到 Deck（畫面上隱藏，資料本身是公開讀）。 */
export function useCanSeeDeck(): (entry: EntryDoc | undefined) => boolean {
  const { event: ev, user, isFamily } = useReadyEvent();
  return (entry) => !!entry && (deckPublic(ev) || isFamily || entry.ownerUid === user?.uid);
}

/** Deck 列表：「1. Dran Sword 3-60F」。highlight = 目前上場的那顆。 */
export function DeckView({ deck, highlight, className = '' }: { deck?: Combo[]; highlight?: number; className?: string }) {
  if (!deck?.length) return <p className={`text-sm text-slate-500 ${className}`}>還沒登錄 Deck</p>;
  return (
    <ol className={`space-y-1 ${className}`}>
      {deck.map((c, i) => (
        <li key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${i === highlight ? 'bg-fuchsia-100 font-bold text-fuchsia-900' : 'bg-slate-100'}`}>
          <span className="w-5 shrink-0 text-center font-mono text-xs text-slate-500">{i + 1}</span>
          <span className="min-w-0 truncate">{comboLabel(c)}</span>
        </li>
      ))}
    </ol>
  );
}

function PartDatalists() {
  return (
    <>
      {(Object.keys(CATALOG) as PartKind[]).map((kind) => (
        <datalist key={kind} id={`parts-${kind}`}>
          {CATALOG[kind].map((d) => (
            <option key={d.en} value={d.en}>
              {[d.zh, d.abbr].filter(Boolean).join(' ')}
            </option>
          ))}
        </datalist>
      ))}
    </>
  );
}

function PartInput({ kind, label, value, onChange }: { kind: PartKind; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">{label}</span>
      <input className={`${inputClass} px-2 py-2 text-sm`} list={`parts-${kind}`} value={value} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** 登錄 Deck：每顆 Blade／Ratchet／Bit（CX 另有 Lock Chip、Assist Blade），列的順序 = 預設出場順序。 */
export function DeckEditor({
  initial,
  size,
  busy,
  error,
  onSave,
  onCancel,
}: {
  initial?: Combo[];
  size: number;
  busy: boolean;
  error?: string;
  onSave: (deck: Combo[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Combo[]>(() => Array.from({ length: size }, (_, i) => ({ ...EMPTY, ...initial?.[i] })));
  const [cx, setCx] = useState<boolean[]>(() => rows.map((r) => !!(r.assistBlade || r.lockChip)));
  const [tried, setTried] = useState(false);
  const check = checkDeck(rows, size);

  const set = (i: number, patch: Partial<Combo>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const moveUp = (i: number) => {
    setRows((list) => list.map((r, j) => (j === i ? list[i - 1] : j === i - 1 ? list[i] : r)));
    setCx((list) => list.map((v, j) => (j === i ? list[i - 1] : j === i - 1 ? list[i] : v)));
  };

  return (
    <div className="space-y-3">
      <PartDatalists />
      {size > 1 && <p className="text-xs text-slate-600">由上到下是預設出場順序，每場開打前主辦還可以調整。清單沒有的零件可以直接打字。</p>}
      {rows.map((r, i) => {
        const done = r.blade.trim() && r.ratchet.trim() && r.bit.trim();
        return (
          <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{size > 1 ? `第 ${i + 1} 顆` : '我的陀螺'}</span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1 text-slate-600">
                  <input
                    type="checkbox"
                    checked={cx[i]}
                    onChange={(e) => {
                      setCx((list) => list.map((v, j) => (j === i ? e.target.checked : v)));
                      if (!e.target.checked) set(i, { assistBlade: '', lockChip: '' });
                    }}
                  />
                  CX 系列
                </label>
                {i > 0 && (
                  <button type="button" className="rounded bg-slate-200 px-2 py-0.5" onClick={() => moveUp(i)} aria-label="往上移">
                    ↑
                  </button>
                )}
              </div>
            </div>
            {cx[i] && (
              <div className="grid grid-cols-2 gap-2">
                <PartInput kind="lockChip" label="Lock Chip" value={r.lockChip ?? ''} onChange={(v) => set(i, { lockChip: v })} />
                <PartInput kind="assistBlade" label="Assist Blade" value={r.assistBlade ?? ''} onChange={(v) => set(i, { assistBlade: v })} />
              </div>
            )}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
              <PartInput kind="blade" label={cx[i] ? 'Main Blade' : 'Blade'} value={r.blade} onChange={(v) => set(i, { blade: v })} />
              <PartInput kind="ratchet" label="Ratchet" value={r.ratchet} onChange={(v) => set(i, { ratchet: v })} />
              <PartInput kind="bit" label="Bit" value={r.bit} onChange={(v) => set(i, { bit: v })} />
            </div>
            {done && <div className="text-xs font-bold text-cyan-700">→ {comboLabel(checkDeck([r], 1).deck[0] ?? r)}</div>}
          </div>
        );
      })}
      {check.warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          ⚠️ {w}
        </p>
      ))}
      {tried && check.errors.map((e) => <ErrorText key={e}>{e}</ErrorText>)}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
          取消
        </Button>
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => {
            setTried(true);
            if (check.errors.length === 0) onSave(check.deck);
          }}
        >
          {busy ? '儲存中…' : '儲存 Deck'}
        </Button>
      </div>
    </div>
  );
}
