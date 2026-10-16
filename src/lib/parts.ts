import generated from '../data/parts.generated.json';
import { PARTS_ZH, type ZhSource } from '../data/parts-zh';
import type { Combo } from '../types';

// Beyblade X 零件清單（Takara Tomy 英文名）。
// 來源：Beydex 社群資料（scripts/sync-parts.mjs 產生 src/data/parts.generated.json，`npm run sync-parts` 更新）；
// 中文名稱在 src/data/parts-zh.ts（台灣麗嬰代理版名稱，查不到的暫譯），舊名稱當別名。清單沒有的零件可以在登錄時自由輸入。
// 正規化規則：比對 en／zh／abbr／aliases 時忽略大小寫、空白、連字號，對到就存成 en。

export type PartKind = 'blade' | 'ratchet' | 'bit' | 'lockChip' | 'assistBlade' | 'overBlade';

export interface PartDef {
  en: string;
  zh?: string;
  /** 中文名稱的可信度：checked 已核對台灣代理版／hub 依 BeybladeHub／temp 暫譯。 */
  zhSource?: ZhSource;
  /** 縮寫：Bit 的 F（Flat）、Assist Blade 的 S（Slash）、Ratchet 的 Tr（Turbo）。 */
  abbr?: string;
  /** Hasbro 名稱、舊的中文暫譯、口語叫法等別名。 */
  aliases?: string[];
  /** Blade：CX 的 Main Blade／CXE 的 Metal Blade。 */
  cx?: boolean;
  /** Ratchet：與 Bit 一體的融合型（不需要另外選 Bit）。 */
  fusion?: boolean;
  /** Attack／Defense／Stamina／Balance。 */
  type?: string;
}

/** 來源資料沒有、但需要認得的寫法（例如舊版清單用過的拼法）。 */
const EXTRA_ALIASES: Partial<Record<PartKind, Record<string, string[]>>> = {
  bit: { 'Disk Ball': ['Disc Ball'] },
};

const KINDS: PartKind[] = ['blade', 'ratchet', 'bit', 'lockChip', 'assistBlade', 'overBlade'];

export const CATALOG: Record<PartKind, PartDef[]> = Object.fromEntries(
  KINDS.map((kind) => [
    kind,
    (generated.parts[kind] as PartDef[]).map((d) => {
      const zh = PARTS_ZH[kind]?.[d.en];
      const extra = [...(EXTRA_ALIASES[kind]?.[d.en] ?? []), ...(zh?.alt ?? [])];
      return {
        ...d,
        ...(zh ? { zh: zh.zh, zhSource: zh.src } : {}),
        ...(extra.length ? { aliases: [...(d.aliases ?? []), ...extra] } : {}),
      };
    }),
  ]),
) as Record<PartKind, PartDef[]>;

export const BLADES = CATALOG.blade;
export const BITS = CATALOG.bit;

/** 零件清單的來源版本（顯示在規則頁、後台）。 */
export const CATALOG_SOURCE = generated.source;

/** Ratchet 是印在零件上的數字（刃數-高度），點兩下選。 */
export const RATCHET_BLADES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M'];
export const RATCHET_HEIGHTS = ['50', '55', '60', '65', '70', '80', '85'];

const squash = (s: string) => s.toLowerCase().replace(/[\s\-_–—・.]/g, '');

const lookup = new Map<PartKind, Map<string, PartDef>>(
  KINDS.map((kind) => {
    const m = new Map<string, PartDef>();
    // 先放別名與縮寫、最後放正式名稱，衝突時以正式名稱為準
    for (const d of CATALOG[kind]) for (const name of [...(d.aliases ?? []), d.abbr]) if (name) m.set(squash(name), d);
    for (const d of CATALOG[kind]) for (const name of [d.zh, d.en]) if (name) m.set(squash(name), d);
    return [kind, m];
  }),
);

export function findPart(kind: PartKind, text: string): PartDef | undefined {
  return lookup.get(kind)!.get(squash(text));
}

/** 輸入 → 儲存用的名稱：清單裡有的統一成英文名；Ratchet 統一成「3-60」格式；其他保留原字（去掉多餘空白）。 */
export function normalizePart(kind: PartKind, text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const m = kind === 'ratchet' ? t.match(/^([0-9mM])\s*[-–—\s]?\s*(\d{2})$/) : null;
  if (m) return `${m[1].toUpperCase()}-${m[2]}`;
  return findPart(kind, t)?.en ?? t;
}

/** 融合型 Ratchet（Turbo 等）：不需要另外選 Bit。 */
export function isFusionRatchet(ratchet: string): boolean {
  return !!(ratchet && findPart('ratchet', ratchet)?.fusion);
}

/** 顯示用名稱：有中文用中文；Bit 加上縮寫（「LF 低平」），因為小朋友多半用縮寫稱呼。 */
export function partLabel(kind: PartKind, name: string): string {
  const d = findPart(kind, name);
  if (kind === 'bit' && d?.abbr) return `${d.abbr} ${d.zh ?? d.en}`;
  return d?.zh ?? name;
}

/** 縮寫（沒有就用名稱本身）：組合寫法裡的 Bit、Assist／Over Blade、融合型 Ratchet。 */
function abbrOf(kind: PartKind, name: string): string {
  return findPart(kind, name)?.abbr ?? name;
}

export function normalizeCombo(c: Combo): Combo {
  const out: Combo = { blade: normalizePart('blade', c.blade), ratchet: normalizePart('ratchet', c.ratchet), bit: normalizePart('bit', c.bit ?? '') };
  for (const kind of ['lockChip', 'assistBlade', 'overBlade'] as const) {
    const v = c[kind] ? normalizePart(kind, c[kind]!) : '';
    if (v) out[kind] = v;
  }
  if (isFusionRatchet(out.ratchet)) out.bit = '';
  return out;
}

/** 這顆陀螺是 CX 系列（三片式）。 */
export function isCx(c: Combo): boolean {
  return !!(c.lockChip || c.assistBlade || c.overBlade || findPart('blade', c.blade)?.cx);
}

/** Blade 部分：一般「蒼龍神劍」；CX「蒼龍勇氣 S」（Lock Chip＋Main Blade，再接 Over／Assist 縮寫）。 */
export function bladeLabel(c: Combo): string {
  if (!isCx(c)) return partLabel('blade', c.blade);
  const name = [c.lockChip && partLabel('lockChip', c.lockChip), partLabel('blade', c.blade)].filter(Boolean).join('');
  const letters = [c.overBlade && abbrOf('overBlade', c.overBlade), c.assistBlade && abbrOf('assistBlade', c.assistBlade)].filter(Boolean).join('');
  return letters ? `${name} ${letters}` : name;
}

/** 官方寫法：「蒼龍神劍 3-60F」、CX「蒼龍勇氣 S6-60V」（Blade 有中文用中文，Bit 用縮寫）。 */
export function comboLabel(c: Combo): string {
  const ratchet = isFusionRatchet(c.ratchet) ? abbrOf('ratchet', c.ratchet) : c.ratchet;
  const bit = c.bit ? abbrOf('bit', c.bit) : '';
  const bitText = bit && bit === c.bit && bit.length > 2 ? ` ${bit}` : bit;
  const blade = bladeLabel(c);
  // CX 的 Assist 縮寫直接接 Ratchet（S6-60V）
  return isCx(c) && (c.assistBlade || c.overBlade) ? `${blade}${ratchet}${bitText}` : `${blade} ${ratchet}${bitText}`;
}

/** 統計用的零件 key（不分大小寫、空白）。 */
export function partKey(name: string): string {
  return squash(name);
}

/** 統計用：完整組合的 key。 */
export function comboKey(c: Combo): string {
  return [c.lockChip, c.blade, c.overBlade, c.assistBlade, c.ratchet, c.bit].map((x) => partKey(x ?? '')).join('|');
}

export interface StockBey {
  code: string;
  name: string;
  type?: string;
  combo: Combo;
}

/** 原廠組合（例如 BX-01 DranSword 3-60F），選了 Blade 之後可以一鍵帶入。 */
export const STOCK_BEYS: StockBey[] = generated.beys.map((b) => ({
  ...b,
  combo: { ...b.combo, bit: (b.combo as Partial<Combo>).bit ?? '' } as Combo,
}));

/** 跟目前已選的 Blade（CX 再加 Lock Chip）相符的原廠組合，同組合只列一次。 */
export function stockCombosFor(partial: Partial<Combo>): StockBey[] {
  if (!partial.blade) return [];
  const blade = partKey(partial.blade);
  const lock = partial.lockChip ? partKey(partial.lockChip) : '';
  const seen = new Set<string>();
  return STOCK_BEYS.filter((s) => {
    if (partKey(s.combo.blade) !== blade) return false;
    if (lock && partKey(s.combo.lockChip ?? '') !== lock) return false;
    const k = comboKey(s.combo);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
