import type { Combo } from '../types';

// Beyblade X 零件清單（Takara Tomy 英文名）。
// ⚠️ 起始清單：輸入時可以自由填寫清單沒有的零件。
// ⚠️ 中文名稱（zh）是依英文意思的「暫譯」，不一定是台灣官方譯名；發現和小朋友認識的名字不同時直接改這裡。
// 正規化規則：比對 en／zh／abbr／aliases 時忽略大小寫、空白、連字號，對到就存成 en。

export type PartKind = 'blade' | 'ratchet' | 'bit' | 'assistBlade' | 'lockChip';

export interface PartDef {
  en: string;
  zh?: string;
  /** Bit 的縮寫，例如 Flat = F。 */
  abbr?: string;
  aliases?: string[];
}

type Row = [en: string, zh: string, extra?: Omit<PartDef, 'en' | 'zh'>];
const rows = (list: Row[]): PartDef[] => list.map(([en, zh, extra]) => ({ en, zh, ...extra }));

export const BLADES: PartDef[] = rows([
  ['Dran Sword', '龍之劍'],
  ['Hells Scythe', '地獄鐮刀'],
  ['Wizard Arrow', '巫師之箭'],
  ['Knight Shield', '騎士之盾'],
  ['Knight Lance', '騎士長槍'],
  ['Shark Edge', '鯊魚之刃'],
  ['Leon Claw', '獅子之爪'],
  ['Viper Tail', '毒蛇之尾'],
  ['Rhino Horn', '犀牛之角'],
  ['Phoenix Wing', '鳳凰之翼', { aliases: ['Soar Phoenix'] }],
  ['Dran Dagger', '龍之匕首'],
  ['Hells Chain', '地獄鎖鏈'],
  ['Unicorn Sting', '獨角獸之刺'],
  ['Sphinx Cowl', '獅身人面斗篷'],
  ['Tyranno Beat', '暴龍重擊'],
  ['Weiss Tiger', '白虎'],
  ['Cobalt Dragoon', '鈷藍飛龍'],
  ['Black Shell', '黑殼'],
  ['Leon Crest', '獅子紋章'],
  ['Phoenix Feather', '鳳凰之羽'],
  ['Wizard Rod', '巫師之杖'],
  ['Silver Wolf', '銀狼'],
  ['Samurai Saber', '武士軍刀'],
  ['Hells Hammer', '地獄之錘'],
  ['Dran Buster', '龍之破壞者'],
  ['Shinobi Shadow', '忍者之影'],
  ['Crimson Garuda', '赤紅迦樓羅'],
  ['Cobalt Drake', '鈷藍火龍'],
  ['Phoenix Rudder', '鳳凰之舵'],
  ['Ghost Circle', '幽靈之環'],
  ['Golem Rock', '石巨人'],
  ['Scorpio Spear', '天蠍之矛'],
  ['Tricera Press', '三角龍重壓'],
  ['Wyvern Gale', '飛龍疾風'],
  ['Aero Pegasus', '天馬'],
  ['Impact Drake', '衝擊火龍'],
]);

/** Ratchet 是印在零件上的數字（刃數-高度），不翻譯。 */
export const RATCHET_BLADES = ['0', '1', '2', '3', '4', '5', '6', '7', '9', 'M'];
export const RATCHET_HEIGHTS = ['50', '55', '60', '65', '70', '80', '85'];
export const RATCHETS: PartDef[] = [
  '0-60', '0-70', '0-80', '1-60', '1-70', '1-80', '2-60', '2-70', '2-80', '3-60', '3-70', '3-80', '3-85', '4-50', '4-55',
  '4-60', '4-70', '4-80', '5-60', '5-70', '5-80', '6-60', '6-70', '6-80', '7-60', '7-70', '7-80', '9-60', '9-65', '9-70', '9-80',
].map((en) => ({ en }));

export const BITS: PartDef[] = rows([
  ['Flat', '平', { abbr: 'F' }],
  ['Ball', '球', { abbr: 'B' }],
  ['Taper', '錐', { abbr: 'T' }],
  ['Needle', '針', { abbr: 'N' }],
  ['Point', '尖', { abbr: 'P' }],
  ['Orb', '圓珠', { abbr: 'O' }],
  ['Rush', '衝刺', { abbr: 'R' }],
  ['Accel', '加速', { abbr: 'A' }],
  ['Hexa', '六角', { abbr: 'H' }],
  ['Unite', '聯合', { abbr: 'U' }],
  ['Level', '水平', { abbr: 'L' }],
  ['Quake', '震動', { abbr: 'Q' }],
  ['Elevate', '升降', { abbr: 'E' }],
  ['Glide', '滑行', { abbr: 'G' }],
  ['Cyclone', '旋風', { abbr: 'C' }],
  ['Dot', '點', { abbr: 'D' }],
  ['Spike', '尖刺', { abbr: 'S' }],
  ['Kick', '踢擊', { abbr: 'K' }],
  ['Low Flat', '低平', { abbr: 'LF' }],
  ['Low Rush', '低衝刺', { abbr: 'LR' }],
  ['Low Orb', '低圓珠', { abbr: 'LO' }],
  ['Gear Flat', '齒輪平', { abbr: 'GF' }],
  ['Gear Ball', '齒輪球', { abbr: 'GB' }],
  ['Gear Point', '齒輪尖', { abbr: 'GP' }],
  ['Gear Needle', '齒輪針', { abbr: 'GN' }],
  ['High Needle', '高針', { abbr: 'HN' }],
  ['High Taper', '高錐', { abbr: 'HT' }],
  ['Disc Ball', '碟球', { abbr: 'DB' }],
  ['Free Ball', '自由球', { abbr: 'FB' }],
  ['Rubber Accel', '橡膠加速', { abbr: 'RA' }],
  ['Bound Spike', '彈跳尖刺', { abbr: 'BS' }],
  ['Under Needle', '下針', { abbr: 'UN' }],
]);

/** CX 系列的 Assist Blade、Lock Chip：清單不完整，主要靠自由輸入。 */
export const ASSIST_BLADES: PartDef[] = rows([
  ['Slash', '斬擊'],
  ['Round', '圓弧'],
  ['Bumper', '緩衝'],
  ['Turn', '迴轉'],
  ['Charge', '衝鋒'],
  ['Wheel', '飛輪'],
]);
export const LOCK_CHIPS: PartDef[] = rows([
  ['Dran', '龍'],
  ['Wizard', '巫師'],
  ['Hells', '地獄'],
  ['Pegasus', '天馬'],
  ['Perseus', '英仙'],
  ['Cerberus', '地獄犬'],
  ['Phoenix', '鳳凰'],
  ['Leon', '獅子'],
  ['Knight', '騎士'],
  ['Shark', '鯊魚'],
]);
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

/** 顯示用名稱：有中文用中文；Bit 加上縮寫（「LF 低平」），因為小朋友多半用縮寫稱呼。 */
export function partLabel(kind: PartKind, name: string): string {
  const d = findPart(kind, name);
  if (kind === 'bit' && d?.abbr) return `${d.abbr} ${d.zh ?? d.en}`;
  return d?.zh ?? name;
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

/** 官方寫法：「龍之劍 3-60F」（Blade 有中文用中文，Bit 用縮寫）。 */
export function comboLabel(c: Combo): string {
  const bit = findPart('bit', c.bit);
  return `${bladeLabel(c)} ${c.ratchet}${bit?.abbr ?? ` ${c.bit}`}`;
}

/** 統計用：完整組合的 key。 */
export function comboKey(c: Combo): string {
  return [c.lockChip, c.blade, c.assistBlade, c.ratchet, c.bit].map((x) => partKey(x ?? '')).join('|');
}
