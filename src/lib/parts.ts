import type { Combo } from '../types';

// Beyblade X 零件清單（Takara Tomy 英文名）。
// ⚠️ 這只是起始清單，輸入時可以自由填寫清單沒有的零件；中文名稱（zh）等主辦提供後補上。
// 正規化規則：比對 en／zh／abbr／aliases 時忽略大小寫、空白、連字號，對到就存成 en。

export type PartKind = 'blade' | 'ratchet' | 'bit' | 'assistBlade' | 'lockChip';

export interface PartDef {
  en: string;
  zh?: string;
  /** Bit 的縮寫，例如 Flat = F。 */
  abbr?: string;
  aliases?: string[];
}

const p = (en: string, extra: Omit<PartDef, 'en'> = {}): PartDef => ({ en, ...extra });

export const BLADES: PartDef[] = [
  'Dran Sword', 'Hells Scythe', 'Wizard Arrow', 'Knight Shield', 'Knight Lance', 'Shark Edge', 'Leon Claw', 'Viper Tail',
  'Rhino Horn', 'Dran Dagger', 'Hells Chain', 'Unicorn Sting', 'Sphinx Cowl', 'Tyranno Beat', 'Weiss Tiger', 'Cobalt Dragoon',
  'Black Shell', 'Leon Crest', 'Phoenix Feather', 'Wizard Rod', 'Silver Wolf', 'Samurai Saber', 'Hells Hammer', 'Dran Buster',
  'Shinobi Shadow', 'Crimson Garuda', 'Cobalt Drake', 'Phoenix Rudder', 'Ghost Circle', 'Golem Rock', 'Scorpio Spear',
  'Tricera Press', 'Wyvern Gale', 'Aero Pegasus', 'Impact Drake',
].map((en) => p(en)).concat([p('Phoenix Wing', { aliases: ['Soar Phoenix'] })]);

export const RATCHETS: PartDef[] = [
  '0-60', '0-70', '0-80', '1-60', '1-70', '1-80', '2-60', '2-70', '2-80', '3-60', '3-70', '3-80', '3-85', '4-50', '4-55',
  '4-60', '4-70', '4-80', '5-60', '5-70', '5-80', '6-60', '6-70', '6-80', '7-60', '7-70', '7-80', '9-60', '9-65', '9-70', '9-80',
].map((en) => p(en));

export const BITS: PartDef[] = [
  p('Flat', { abbr: 'F' }),
  p('Ball', { abbr: 'B' }),
  p('Taper', { abbr: 'T' }),
  p('Needle', { abbr: 'N' }),
  p('Point', { abbr: 'P' }),
  p('Orb', { abbr: 'O' }),
  p('Rush', { abbr: 'R' }),
  p('Accel', { abbr: 'A' }),
  p('Hexa', { abbr: 'H' }),
  p('Unite', { abbr: 'U' }),
  p('Level', { abbr: 'L' }),
  p('Quake', { abbr: 'Q' }),
  p('Elevate', { abbr: 'E' }),
  p('Glide', { abbr: 'G' }),
  p('Cyclone', { abbr: 'C' }),
  p('Dot', { abbr: 'D' }),
  p('Spike', { abbr: 'S' }),
  p('Kick', { abbr: 'K' }),
  p('Low Flat', { abbr: 'LF' }),
  p('Low Rush', { abbr: 'LR' }),
  p('Low Orb', { abbr: 'LO' }),
  p('Gear Flat', { abbr: 'GF' }),
  p('Gear Ball', { abbr: 'GB' }),
  p('Gear Point', { abbr: 'GP' }),
  p('Gear Needle', { abbr: 'GN' }),
  p('High Needle', { abbr: 'HN' }),
  p('High Taper', { abbr: 'HT' }),
  p('Disc Ball', { abbr: 'DB' }),
  p('Free Ball', { abbr: 'FB' }),
  p('Rubber Accel', { abbr: 'RA' }),
  p('Bound Spike', { abbr: 'BS' }),
  p('Under Needle', { abbr: 'UN' }),
];

/** CX 系列的 Assist Blade、Lock Chip：清單不完整，主要靠自由輸入。 */
export const ASSIST_BLADES: PartDef[] = ['Slash', 'Round', 'Bumper', 'Turn', 'Charge', 'Wheel'].map((en) => p(en));
export const LOCK_CHIPS: PartDef[] = ['Dran', 'Wizard', 'Hells', 'Pegasus', 'Perseus', 'Cerberus', 'Phoenix', 'Leon', 'Knight', 'Shark'].map((en) => p(en));

export const CATALOG: Record<PartKind, PartDef[]> = {
  blade: BLADES,
  ratchet: RATCHETS,
  bit: BITS,
  assistBlade: ASSIST_BLADES,
  lockChip: LOCK_CHIPS,
};

const squash = (s: string) => s.toLowerCase().replace(/[\s\-_–—・.]/g, '');

const lookup = new Map<PartKind, Map<string, PartDef>>(
  (Object.keys(CATALOG) as PartKind[]).map((kind) => {
    const m = new Map<string, PartDef>();
    for (const d of CATALOG[kind]) for (const name of [d.en, d.zh, d.abbr, ...(d.aliases ?? [])]) if (name) m.set(squash(name), d);
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
  const hit = findPart(kind, t);
  if (hit) return hit.en;
  if (kind === 'ratchet') {
    const m = t.match(/^([0-9mM])\s*[-–—\s]?\s*(\d{2})$/);
    if (m) return `${m[1].toUpperCase()}-${m[2]}`;
  }
  return t;
}

/** 顯示用名稱：有中文用中文。 */
export function partLabel(kind: PartKind, name: string): string {
  return findPart(kind, name)?.zh ?? name;
}

/** 統計用的零件 key（不分大小寫、空白）。 */
export function partKey(name: string): string {
  return squash(name);
}

export function normalizeCombo(c: Combo): Combo {
  const out: Combo = { blade: normalizePart('blade', c.blade), ratchet: normalizePart('ratchet', c.ratchet), bit: normalizePart('bit', c.bit) };
  const assist = c.assistBlade ? normalizePart('assistBlade', c.assistBlade) : '';
  const lock = c.lockChip ? normalizePart('lockChip', c.lockChip) : '';
  if (assist) out.assistBlade = assist;
  if (lock) out.lockChip = lock;
  return out;
}

/** Blade 部分（CX 含 Lock Chip、Assist Blade）。 */
export function bladeLabel(c: Combo): string {
  return [c.lockChip && partLabel('lockChip', c.lockChip), partLabel('blade', c.blade), c.assistBlade && partLabel('assistBlade', c.assistBlade)]
    .filter(Boolean)
    .join(' ');
}

/** 官方寫法：「Dran Sword 3-60F」。Bit 有縮寫就用縮寫。 */
export function comboLabel(c: Combo): string {
  const bit = findPart('bit', c.bit);
  const bitText = bit?.zh ? ` ${bit.zh}` : bit?.abbr ?? ` ${c.bit}`;
  return `${bladeLabel(c)} ${c.ratchet}${bitText}`;
}

/** 統計用：完整組合的 key。 */
export function comboKey(c: Combo): string {
  return [c.lockChip, c.blade, c.assistBlade, c.ratchet, c.bit].map((x) => partKey(x ?? '')).join('|');
}
