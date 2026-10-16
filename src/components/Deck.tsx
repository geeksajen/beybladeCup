import { useMemo, useState, type KeyboardEvent } from 'react';
import { checkDeck, deckPublic } from '../engine/deck';
import {
  CATALOG,
  comboLabel,
  findPart,
  isCx,
  isFusionRatchet,
  normalizePart,
  partKey,
  partLabel,
  RATCHET_BLADES,
  RATCHET_HEIGHTS,
  stockCombosFor,
  type PartDef,
  type PartKind,
} from '../lib/parts';
import { useReadyEvent } from '../providers/EventProvider';
import type { Combo, EntryDoc } from '../types';
import { Button, ErrorText, inputClass } from './ui';

const EMPTY: Combo = { blade: '', ratchet: '', bit: '' };
const KIND_LABEL: Record<PartKind, string> = {
  blade: 'Blade',
  ratchet: 'Ratchet',
  bit: 'Bit',
  lockChip: 'Lock Chip',
  assistBlade: 'Assist Blade',
  overBlade: 'Over Blade',
};
/** 這幾種零件用縮寫稱呼（F、S、B…）。 */
const ABBR_KINDS: PartKind[] = ['bit', 'assistBlade', 'overBlade'];

/** 自己、主辦，或比賽開始後才看得到 Deck（畫面上隱藏，資料本身是公開讀）。 */
export function useCanSeeDeck(): (entry: EntryDoc | undefined) => boolean {
  const { event: ev, user, isFamily } = useReadyEvent();
  return (entry) => !!entry && (deckPublic(ev) || isFamily || entry.ownerUid === user?.uid);
}

/** Deck 列表：「1. 龍之劍 3-60F」。highlight = 目前上場的那顆。 */
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

const complete = (c: Combo) => !!(c.blade && c.ratchet && (c.bit || isFusionRatchet(c.ratchet)));
const isEmpty = (c: Combo) => !c.blade && !c.ratchet && !c.bit && !c.assistBlade && !c.lockChip && !c.overBlade;
/** 每顆要選的零件：CX 是 Lock Chip → Main Blade → Over Blade（CXE 才有）→ Assist → Ratchet → Bit；融合型 Ratchet 不用選 Bit。 */
const stepsFor = (cx: boolean, c?: Combo): PartKind[] => {
  const steps: PartKind[] = cx ? ['lockChip', 'blade', 'overBlade', 'assistBlade', 'ratchet', 'bit'] : ['blade', 'ratchet', 'bit'];
  return c && isFusionRatchet(c.ratchet) ? steps.filter((k) => k !== 'bit') : steps;
};

/**
 * 「今天熱門」：其他選手已登錄的零件，依使用次數排序。
 * 比賽開始前只給主辦看（避免家長從熱門清單猜到別人的 Deck）。
 */
function usePopularParts(): Record<PartKind, string[]> {
  const { entries, event: ev, isFamily } = useReadyEvent();
  return useMemo(() => {
    const out: Record<PartKind, string[]> = { blade: [], ratchet: [], bit: [], lockChip: [], assistBlade: [], overBlade: [] };
    if (!isFamily && !deckPublic(ev)) return out;
    for (const kind of Object.keys(out) as PartKind[]) {
      const counts = new Map<string, number>();
      for (const e of entries) {
        if (e.status !== 'active') continue;
        for (const c of e.deck ?? []) {
          const v = c[kind];
          if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
      }
      out[kind] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
    }
    return out;
  }, [entries, ev, isFamily]);
}

type Step = { bey: number; kind: PartKind } | 'summary';

/**
 * 逐步點選登錄 Deck（不用打字）：每顆依序選 Blade → Ratchet（兩下：刃數＋高度）→ Bit，選完自動跳下一步；
 * 最後在確認畫面調整順序、看重複提醒、儲存。清單沒有的零件可以在搜尋框直接打字。
 */
export function DeckEditor({
  initial,
  size,
  busy,
  error,
  onSave,
  onCancel,
  saveLabel = '儲存 Deck',
}: {
  initial?: Combo[];
  size: number;
  busy: boolean;
  error?: string;
  onSave: (deck: Combo[]) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [deck, setDeck] = useState<Combo[]>(() => Array.from({ length: size }, (_, i) => ({ ...EMPTY, ...initial?.[i] })));
  const [cx, setCx] = useState<boolean[]>(() => deck.map((r) => !!r.blade && isCx(r)));
  const [step, setStep] = useState<Step>(() => (deck.some(complete) ? 'summary' : { bey: 0, kind: 'blade' }));
  // 從確認畫面點進來編輯單一顆時，編完回確認畫面
  const [single, setSingle] = useState(false);
  const [tried, setTried] = useState(false);
  const popular = usePopularParts();

  const goSummary = () => {
    setSingle(false);
    setStep('summary');
  };

  /** 這一顆填完：跳到下一顆空的，或回確認畫面。 */
  const nextBeyOrSummary = (bey: number, next: Combo[]) => {
    const nextBey = next.findIndex((c, j) => j > bey && isEmpty(c));
    if (!single && nextBey >= 0) return setStep({ bey: nextBey, kind: stepsFor(cx[nextBey])[0] });
    goSummary();
  };

  const advance = (bey: number, kind: PartKind, next: Combo[]) => {
    const steps = stepsFor(cx[bey], next[bey]);
    const i = steps.indexOf(kind);
    if (i >= 0 && i < steps.length - 1) return setStep({ bey, kind: steps[i + 1] });
    nextBeyOrSummary(bey, next);
  };

  const pick = (bey: number, kind: PartKind, value: string) => {
    const next = deck.map((c, j) => {
      if (j !== bey) return c;
      const updated = { ...c, [kind]: normalizePart(kind, value) };
      // 換成融合型 Ratchet 時清掉 Bit
      if (kind === 'ratchet' && isFusionRatchet(updated.ratchet)) updated.bit = '';
      return updated;
    });
    setDeck(next);
    advance(bey, kind, next);
  };

  /** 原廠組合一鍵帶入：保留已選的 Blade，其他零件照原廠填好。 */
  const applyStock = (bey: number, combo: Combo) => {
    const next = deck.map((c, j) => (j === bey ? { ...combo } : c));
    setDeck(next);
    nextBeyOrSummary(bey, next);
  };

  const back = () => {
    if (step === 'summary') return;
    const steps = stepsFor(cx[step.bey], deck[step.bey]);
    const i = steps.indexOf(step.kind);
    if (i > 0) return setStep({ bey: step.bey, kind: steps[i - 1] });
    if (!single && step.bey > 0) {
      const prev = stepsFor(cx[step.bey - 1], deck[step.bey - 1]);
      return setStep({ bey: step.bey - 1, kind: prev[prev.length - 1] });
    }
    if (deck.some(complete) || single) return goSummary();
    onCancel();
  };

  const setCxFor = (bey: number, on: boolean) => {
    setCx((list) => list.map((v, j) => (j === bey ? on : v)));
    // 切換系列時 Blade 清單不同，清掉已選的 Blade 與 CX 專用零件
    setDeck((list) => list.map((c, j) => (j === bey ? { ...c, blade: '', assistBlade: undefined, lockChip: undefined, overBlade: undefined } : c)));
    setStep({ bey, kind: stepsFor(on)[0] });
  };

  if (step !== 'summary') {
    const cur = deck[step.bey];
    const steps = stepsFor(cx[step.bey], cur);
    const bladeIdx = steps.indexOf('blade');
    // Blade 選好之後，每一步上方都提供原廠組合（目前的組合已經是原廠的就不顯示）
    const stocks = steps.indexOf(step.kind) > bladeIdx ? stockCombosFor(cur).filter((s) => comboLabel(s.combo) !== comboLabel(cur)).slice(0, 3) : [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-bold" onClick={back}>
            ← 上一步
          </button>
          <div className="text-center">
            <div className="text-sm font-black">
              {size > 1 ? `第 ${step.bey + 1} / ${size} 顆・` : ''}
              {KIND_LABEL[step.kind]}
            </div>
            {size > 1 && (
              <div className="mt-0.5 flex justify-center gap-1">
                {deck.map((c, j) => (
                  <span key={j} className={`h-1.5 w-6 rounded-full ${j === step.bey ? 'bg-fuchsia-500' : complete(c) ? 'bg-cyan-500' : 'bg-slate-300'}`} />
                ))}
              </div>
            )}
          </div>
          <button type="button" className="rounded-lg px-2 py-1.5 text-xs font-bold text-cyan-700" onClick={goSummary}>
            {deck.some(complete) ? '完成' : '略過'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs">
          {steps.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStep({ bey: step.bey, kind: k })}
              className={`rounded px-1.5 py-0.5 ${k === step.kind ? 'bg-fuchsia-500 font-bold text-white' : cur[k] ? 'bg-white text-slate-800' : 'text-slate-400'}`}
            >
              {cur[k] ? partLabel(k, cur[k]!) : KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {step.kind === steps[0] && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                onClick={() => on !== cx[step.bey] && setCxFor(step.bey, on)}
                className={`rounded-md py-1 font-bold ${cx[step.bey] === on ? 'bg-white shadow-sm' : 'text-slate-500'}`}
              >
                {on ? 'CX 系列（三片式）' : '一般'}
              </button>
            ))}
          </div>
        )}

        {stocks.length > 0 && (
          <div className="space-y-1.5 rounded-xl border-2 border-cyan-300 bg-cyan-50 p-2">
            <div className="text-xs font-bold text-cyan-800">⚡ 沒有改裝？直接用原廠組合</div>
            {stocks.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => applyStock(step.bey, s.combo)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left active:scale-[0.98]"
              >
                <span className="min-w-0 truncate font-black">{comboLabel(s.combo)}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{s.code} 原廠</span>
              </button>
            ))}
          </div>
        )}

        {step.kind === 'ratchet' ? (
          <RatchetPicker key={`${step.bey}-r`} value={cur.ratchet} popular={popular.ratchet} onPick={(v) => pick(step.bey, 'ratchet', v)} />
        ) : (
          <PartPicker
            key={`${step.bey}-${step.kind}-${cx[step.bey]}`}
            kind={step.kind}
            value={cur[step.kind] ?? ''}
            popular={popular[step.kind]}
            filter={step.kind === 'blade' ? (d) => !!d.cx === cx[step.bey] : undefined}
            optional={step.kind === 'overBlade' ? '沒有 Over Blade（一般 CX）' : undefined}
            onPick={(v) => pick(step.bey, step.kind, v)}
          />
        )}
      </div>
    );
  }

  const check = checkDeck(deck, size);
  const move = (i: number) => {
    const swap = <T,>(list: T[]) => list.map((v, j) => (j === i ? list[i - 1] : j === i - 1 ? list[i] : v));
    setDeck(swap);
    setCx(swap);
  };
  return (
    <div className="space-y-2">
      {size > 1 && <p className="text-xs text-slate-600">由上到下是預設出場順序，每場開打前主辦還可以調整。</p>}
      {deck.map((c, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
          <span className="w-5 shrink-0 text-center font-mono text-sm text-slate-500">{i + 1}</span>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-bold"
            onClick={() => {
              setSingle(true);
              setStep({ bey: i, kind: stepsFor(cx[i])[0] });
            }}
          >
            {complete(c) ? comboLabel(c) : isEmpty(c) ? <span className="font-normal text-slate-400">＋ 點這裡登錄第 {i + 1} 顆</span> : <span className="text-amber-700">⚠️ 還沒填完，點這裡繼續</span>}
          </button>
          {i > 0 && (
            <button type="button" className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-sm" onClick={() => move(i)} aria-label="往上移">
              ↑
            </button>
          )}
          {!isEmpty(c) && (
            <button
              type="button"
              className="shrink-0 px-1 text-rose-500"
              aria-label="清除"
              onClick={() => setDeck((list) => list.map((x, j) => (j === i ? { ...EMPTY } : x)))}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {check.warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          ⚠️ {w}
        </p>
      ))}
      {tried && check.errors.map((e) => <ErrorText key={e}>{e}</ErrorText>)}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2 pt-1">
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
          {busy ? '儲存中…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function Chip({ def, kind, selected, onClick }: { def: PartDef; kind: PartKind; selected: boolean; onClick: () => void }) {
  const isBit = ABBR_KINDS.includes(kind) && !!def.abbr;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[3rem] flex-col items-center justify-center rounded-xl border-2 px-1 py-1 text-center leading-tight transition active:scale-95 ${
        selected ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-slate-200 bg-white'
      }`}
    >
      <span className={`font-black ${isBit ? 'text-lg' : 'text-sm'}`}>{isBit ? def.abbr : (def.zh ?? def.en)}</span>
      <span className="text-[10px] text-slate-500">{isBit ? (def.zh ?? def.en) : def.zh ? def.en : ''}</span>
    </button>
  );
}

const defOf = (kind: PartKind, name: string): PartDef => findPart(kind, name) ?? { en: name };

function matches(d: PartDef, q: string): boolean {
  const k = partKey(q);
  return [d.en, d.zh, d.abbr, ...(d.aliases ?? [])].some((n) => n && partKey(n).includes(k));
}

/** Blade／Bit／Lock Chip／Assist／Over Blade：搜尋＋今天熱門＋全部，點一下就選。 */
function PartPicker({
  kind,
  value,
  popular,
  onPick,
  filter,
  optional,
}: {
  kind: PartKind;
  value: string;
  popular: string[];
  onPick: (v: string) => void;
  /** 只顯示部分清單（例如一般 Blade／CX Main Blade）；搜尋時仍然全部找得到。 */
  filter?: (d: PartDef) => boolean;
  /** 這個零件可以沒有：顯示「略過」按鈕的文字。 */
  optional?: string;
}) {
  const [q, setQ] = useState('');
  const catalog = CATALOG[kind];
  const shown = filter ? catalog.filter(filter) : catalog;
  const query = q.trim();
  const found = query ? catalog.filter((d) => matches(d, query)) : [];
  const exact = query && found.some((d) => partKey(d.en) === partKey(normalizePart(kind, query)));
  const cols = ABBR_KINDS.includes(kind) ? 'grid-cols-4' : 'grid-cols-3';
  const hot = popular
    .map((n) => defOf(kind, n))
    .filter((d) => !filter || filter(d))
    .slice(0, ABBR_KINDS.includes(kind) ? 8 : 6);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // 在報名表單裡按 Enter 不要送出整張表單
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (query) onPick(found.length === 1 ? found[0].en : query);
  };
  const grid = (list: PartDef[]) => (
    <div className={`grid ${cols} gap-1.5`}>
      {list.map((d) => (
        <Chip key={d.en} def={d} kind={kind} selected={partKey(d.en) === partKey(value)} onClick={() => onPick(d.en)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <input
        className={`${inputClass} py-2 text-sm`}
        placeholder={`搜尋或直接輸入 ${KIND_LABEL[kind]}（中文、英文${kind === 'bit' ? '、縮寫' : ''}都可以）`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
      />
      {optional && (
        <button type="button" className={`w-full rounded-xl border-2 py-2 text-sm font-bold ${value ? 'border-slate-200 bg-white' : 'border-fuchsia-500 bg-fuchsia-50'}`} onClick={() => onPick('')}>
          {optional}
        </button>
      )}
      {query ? (
        <>
          {grid(found)}
          {!exact && (
            <button type="button" className="w-full rounded-xl border-2 border-dashed border-cyan-400 py-2 text-sm font-bold text-cyan-800" onClick={() => onPick(query)}>
              使用「{query}」（清單裡沒有的零件）
            </button>
          )}
        </>
      ) : (
        <>
          {hot.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold text-amber-700">🔥 今天熱門</div>
              {grid(hot)}
            </div>
          )}
          <div>
            {hot.length > 0 && <div className="mb-1 text-xs font-bold text-slate-500">全部</div>}
            {grid(shown)}
          </div>
        </>
      )}
    </div>
  );
}

/** Ratchet：零件上印著「3-60」，點刃數、再點高度就完成。 */
function RatchetPicker({ value, popular, onPick }: { value: string; popular: string[]; onPick: (v: string) => void }) {
  const [cur] = useState(() => value.match(/^([0-9M])-(\d{2})$/));
  const [blades, setBlades] = useState(cur?.[1] ?? '');
  const [height, setHeight] = useState(cur?.[2] ?? '');
  const [other, setOther] = useState('');
  const choose = (b: string, h: string) => {
    setBlades(b);
    setHeight(h);
    if (b && h) onPick(`${b}-${h}`);
  };
  const btn = (selected: boolean) =>
    `rounded-xl border-2 py-2.5 font-display text-lg active:scale-95 ${selected ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-slate-200 bg-white'}`;
  const fusion = CATALOG.ratchet.filter((d) => d.fusion);

  return (
    <div className="space-y-3">
      {popular.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold text-amber-700">🔥 今天熱門</div>
          <div className="grid grid-cols-4 gap-1.5">
            {popular.slice(0, 4).map((r) => (
              <button key={r} type="button" className={btn(r === value)} onClick={() => onPick(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1 text-xs font-bold text-slate-600">① 刃數（前面的數字）</div>
        <div className="grid grid-cols-5 gap-1.5">
          {RATCHET_BLADES.map((b) => (
            <button key={b} type="button" className={btn(b === blades)} onClick={() => choose(b, height)}>
              {b}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs font-bold text-slate-600">② 高度（後面的數字）</div>
        <div className="grid grid-cols-4 gap-1.5">
          {RATCHET_HEIGHTS.map((h) => (
            <button key={h} type="button" className={btn(h === height)} onClick={() => choose(blades, h)}>
              {h}
            </button>
          ))}
        </div>
      </div>
      {fusion.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold text-slate-600">融合型（Ratchet 和 Bit 一體，不用再選 Bit）</div>
          <div className="grid grid-cols-4 gap-1.5">
            {fusion.map((d) => (
              <button key={d.en} type="button" className={btn(partKey(d.en) === partKey(value))} onClick={() => onPick(d.en)}>
                <div className="leading-tight">{d.abbr ?? d.en}</div>
                <div className="font-sans text-[10px] text-slate-500">{d.zh ?? d.en}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={`${inputClass} py-2 text-sm`}
          placeholder="其他寫法"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (other.trim()) onPick(other);
          }}
        />
        <Button variant="secondary" className="shrink-0 text-sm" disabled={!other.trim()} onClick={() => onPick(other)}>
          使用
        </Button>
      </div>
    </div>
  );
}
