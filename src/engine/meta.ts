import { bladeLabel, comboKey, comboLabel, partKey, partLabel } from '../lib/parts';
import type { BracketDoc, Combo, FinishType } from '../types';
import { computePodium } from './advance';
import { beysAt, isDecisive } from './deck';

/** 勝率排行至少要打過幾局才列入（樣本太少的勝率沒有意義）。 */
export const META_MIN_BATTLES = 5;

export type MetaKind = 'blade' | 'ratchet' | 'bit' | 'combo';

export interface MetaRow {
  key: string;
  label: string;
  /** 用過的選手人數。 */
  players: number;
  /** 上場、分出勝負的局數（同零件互打的局不計）。 */
  battles: number;
  wins: number;
  /** 贏的局用了哪些終結方式。 */
  finishes: Record<FinishType, number>;
}

export interface MetaStats {
  /** 有記錄 Deck、分出勝負的總局數。 */
  battles: number;
  rows: Record<MetaKind, MetaRow[]>;
  /** 冠軍最後一場用的 Deck（依出場順序）。 */
  championDeck?: Combo[];
  championId?: string;
}

const emptyFinishes = (): Record<FinishType, number> => ({ spin: 0, over: 0, burst: 0, xtreme: 0 });

/** 每種統計怎麼從一顆陀螺取 key 與顯示名稱。 */
const EXTRACT: Record<MetaKind, (c: Combo) => { key: string; label: string }> = {
  blade: (c) => ({ key: partKey(bladeLabel(c)), label: bladeLabel(c) }),
  ratchet: (c) => ({ key: partKey(c.ratchet), label: partLabel('ratchet', c.ratchet) }),
  bit: (c) => ({ key: partKey(c.bit), label: partLabel('bit', c.bit) }),
  combo: (c) => ({ key: comboKey(c), label: comboLabel(c) }),
};

export const winRate = (r: Pick<MetaRow, 'battles' | 'wins'>): number => (r.battles ? r.wins / r.battles : 0);

/**
 * Meta 統計（純函式）：只用開打時記錄下來的 Deck（Match.p1Deck／p2Deck），以「局」為單位。
 * 快速輸入比分的場次沒有逐局紀錄，不計。
 */
export function computeMeta(b: BracketDoc): MetaStats {
  const kinds: MetaKind[] = ['blade', 'ratchet', 'bit', 'combo'];
  const maps = Object.fromEntries(kinds.map((k) => [k, new Map<string, MetaRow & { users: Set<string> }>()])) as Record<
    MetaKind,
    Map<string, MetaRow & { users: Set<string> }>
  >;
  let total = 0;

  const row = (kind: MetaKind, c: Combo) => {
    const { key, label } = EXTRACT[kind](c);
    const map = maps[kind];
    if (!map.has(key)) map.set(key, { key, label, players: 0, battles: 0, wins: 0, finishes: emptyFinishes(), users: new Set() });
    return map.get(key)!;
  };

  for (const m of b.matches) {
    if (m.isBye || m.manualScore || !m.p1 || !m.p2 || !m.p1Deck?.length || !m.p2Deck?.length) continue;
    for (const c of m.p1Deck) for (const k of kinds) row(k, c).users.add(m.p1);
    for (const c of m.p2Deck) for (const k of kinds) row(k, c).users.add(m.p2);
    m.battles.forEach((bt, i) => {
      if (!isDecisive(bt)) return;
      const beys = beysAt(m, i);
      if (!beys.p1 || !beys.p2) return;
      total++;
      const win = bt.winner === 'p1' ? beys.p1 : beys.p2;
      const lose = bt.winner === 'p1' ? beys.p2 : beys.p1;
      for (const k of kinds) {
        const w = row(k, win);
        const l = row(k, lose);
        if (w === l) continue; // 同零件互打：不影響這個零件的勝率
        w.battles++;
        w.wins++;
        w.finishes[bt.finish]++;
        l.battles++;
      }
    });
  }

  const rows = Object.fromEntries(
    kinds.map((k) => [
      k,
      [...maps[k].values()]
        .map(({ users, ...r }) => ({ ...r, players: users.size }))
        .sort((x, y) => y.players - x.players || y.battles - x.battles || x.label.localeCompare(y.label)),
    ]),
  ) as Record<MetaKind, MetaRow[]>;

  const championId = computePodium(b)?.first;
  let championDeck: Combo[] | undefined;
  if (championId) {
    const last = b.matches
      .filter((m) => m.status === 'done' && !m.isBye && (m.p1 === championId || m.p2 === championId))
      .sort((x, y) => y.order - x.order)[0];
    championDeck = last ? (last.p1 === championId ? last.p1Deck : last.p2Deck) : undefined;
  }
  return { battles: total, rows, championDeck, championId };
}

/** 勝率排行：達到樣本門檻的才排，勝率 → 局數。 */
export function byWinRate(rows: MetaRow[], min = META_MIN_BATTLES): MetaRow[] {
  return rows.filter((r) => r.battles >= min).sort((a, b) => winRate(b) - winRate(a) || b.battles - a.battles);
}

/** 某種終結方式次數最多的（0 次不算）。 */
export function topByFinish(rows: MetaRow[], finish: FinishType): MetaRow | undefined {
  const best = [...rows].sort((a, b) => b.finishes[finish] - a.finishes[finish])[0];
  return best && best.finishes[finish] > 0 ? best : undefined;
}
