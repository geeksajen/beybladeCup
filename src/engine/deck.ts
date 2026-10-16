import { comboKey, isFusionRatchet, normalizeCombo, partKey } from '../lib/parts';
import type { Battle, Combo, EntryDoc, EventDoc, FinishType, Match } from '../types';

const FINISHES: readonly string[] = ['spin', 'over', 'burst', 'xtreme'];

/** 分出勝負的一局（有終結方式）。平手同一組重打、發射失誤重新發射，都不換下一顆。 */
export function isDecisive(b: Battle): b is Battle & { winner: 'p1' | 'p2'; finish: FinishType } {
  return b.winner !== 'draw' && !!b.finish && FINISHES.includes(b.finish);
}

/** 第 index 局（0 起算）上場的是 Deck 的第幾顆：前面分出勝負的局數依序輪替，3 顆用完從第 1 顆重來。 */
export function slotAt(battles: Battle[], index: number, deckLen: number): number {
  if (deckLen <= 0) return 0;
  let n = 0;
  for (let i = 0; i < index && i < battles.length; i++) if (isDecisive(battles[i])) n++;
  return n % deckLen;
}

/** 下一局雙方上場的陀螺（沒有 Deck 時為 undefined）。 */
export function nextBeys(m: Match): { p1?: Combo; p2?: Combo } {
  return {
    p1: m.p1Deck?.length ? m.p1Deck[slotAt(m.battles, m.battles.length, m.p1Deck.length)] : undefined,
    p2: m.p2Deck?.length ? m.p2Deck[slotAt(m.battles, m.battles.length, m.p2Deck.length)] : undefined,
  };
}

/** 某一局雙方用的陀螺。 */
export function beysAt(m: Match, index: number): { p1?: Combo; p2?: Combo } {
  return {
    p1: m.p1Deck?.length ? m.p1Deck[slotAt(m.battles, index, m.p1Deck.length)] : undefined,
    p2: m.p2Deck?.length ? m.p2Deck[slotAt(m.battles, index, m.p2Deck.length)] : undefined,
  };
}

/** 開打前設定本場雙方的 Deck（已經有局數就不能改順序）。 */
export function setMatchDecks(m: Match, p1Deck: Combo[] | undefined, p2Deck: Combo[] | undefined): Match {
  if (m.battles.length > 0 || m.manualScore || m.status === 'done') return m;
  return { ...m, p1Deck: p1Deck?.length ? p1Deck : undefined, p2Deck: p2Deck?.length ? p2Deck : undefined };
}

/** 依指定順序重排 Deck（order 是原 Deck 的索引）。 */
export function reorder(deck: Combo[], order: number[]): Combo[] {
  return order.map((i) => deck[i]).filter((c): c is Combo => !!c);
}

export interface DeckCheck {
  /** 有這些錯誤不能儲存。 */
  errors: string[];
  /** 提醒但可以儲存（小孩零件可能不夠）。 */
  warnings: string[];
  /** 正規化、去掉空白列之後的 Deck。 */
  deck: Combo[];
}

/** 檢查 Deck：每顆都要有 Blade、Ratchet、Bit；同一組 Deck 的零件不重複（只提醒）；顆數不足（只提醒）。 */
export function checkDeck(rows: Combo[], size: number): DeckCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const deck: Combo[] = [];
  rows.forEach((raw, i) => {
    const c = normalizeCombo(raw);
    const empty = !c.blade && !c.ratchet && !c.bit && !c.assistBlade && !c.lockChip && !c.overBlade;
    if (empty) return;
    // 融合型 Ratchet（Turbo 等）本身就包含 Bit
    const done = c.blade && c.ratchet && (c.bit || isFusionRatchet(c.ratchet));
    if (!done) errors.push(`第 ${i + 1} 顆還沒填完（Blade、Ratchet、Bit 都要填）`);
    else deck.push(c);
  });
  if (deck.length > size) errors.push(`最多 ${size} 顆`);
  if (errors.length === 0 && deck.length > 0 && deck.length < size) warnings.push(`${size === 3 ? '3on3 ' : ''}需要 ${size} 顆，目前只有 ${deck.length} 顆`);
  const dup = (label: string, names: (string | undefined)[]) => {
    const seen = new Set<string>();
    for (const n of names) {
      if (!n) continue;
      const k = partKey(n);
      if (seen.has(k)) {
        warnings.push(`${label}「${n}」重複了（正式規則同一組 Deck 的零件不能重複）`);
        return;
      }
      seen.add(k);
    }
  };
  dup('Blade', deck.map((c) => c.blade));
  dup('Ratchet', deck.map((c) => c.ratchet));
  dup('Bit', deck.map((c) => c.bit));
  dup('Lock Chip', deck.map((c) => c.lockChip));
  dup('Assist Blade', deck.map((c) => c.assistBlade));
  dup('Over Blade', deck.map((c) => c.overBlade));
  return { errors, warnings, deck };
}

/** Deck 的指紋：用來判斷主辦確認過之後有沒有被修改。 */
export function deckSignature(deck: Combo[] | undefined): string {
  return (deck ?? []).map(comboKey).join('/');
}

export type DeckStatus = 'none' | 'unconfirmed' | 'confirmed';

export function deckStatus(e: Pick<EntryDoc, 'deck' | 'deckCheckedKey'>): DeckStatus {
  if (!e.deck?.length) return 'none';
  return e.deckCheckedKey === deckSignature(e.deck) ? 'confirmed' : 'unconfirmed';
}

export function deckSizeOf(ev: Pick<EventDoc, 'rules'>): 1 | 3 {
  return ev.rules.deckSize ?? 3;
}

/** 比賽開始前 Deck 不公開（只有自己與主辦看得到）。注意：這只是畫面上隱藏。 */
export function deckPublic(ev: Pick<EventDoc, 'status'>): boolean {
  return ev.status === 'running' || ev.status === 'finished';
}

/** 選手報名後、比賽開始前可以自己修改 Deck；比賽開始後只有主辦能改（Deck 整場固定）。 */
export function deckEditableByOwner(ev: Pick<EventDoc, 'status'>): boolean {
  return ev.status === 'open' || ev.status === 'closed';
}
