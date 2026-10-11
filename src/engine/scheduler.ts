import type { BracketDoc, Format, Group, Match } from '../types';
import { refreshBracket } from './advance';

const BYE = '__bye__';
export const GROUP_IDS = 'ABCDEFGHIJKL'.split('');

/** 循環賽排程（circle method / 輪轉法）：回傳每一輪的對戰組合。 */
export function circleRounds(ids: string[]): [string, string][][] {
  const list = [...ids];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(BYE);
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      pairs.push(i === 0 && r % 2 === 1 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

/** 蛇形分配到各組。 */
export function snakeGroups<T>(items: T[], groupCount: number): T[][] {
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  items.forEach((it, i) => {
    const row = Math.floor(i / groupCount);
    const col = row % 2 === 0 ? i % groupCount : groupCount - 1 - (i % groupCount);
    groups[col].push(it);
  });
  return groups;
}

export interface FormatChoice {
  format: Format;
  groupCount?: number;
  advancePerGroup?: number;
}

/** 依人數建議賽制（spec §5.2）。 */
export function suggestFormat(n: number): FormatChoice {
  if (n <= 6) return { format: 'roundRobin' };
  return { format: 'groupsThenKnockout', groupCount: Math.ceil(n / 4), advancePerGroup: 2 };
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** 標準種子位置，例如 8 → [1,8,4,5,2,7,3,6]。 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap((s) => [s, len + 1 - s]);
  }
  return order;
}

export function koLabel(size: number): string {
  if (size === 2) return 'F';
  if (size === 4) return 'SF';
  if (size === 8) return 'QF';
  return `R${size}`;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Seed {
  player?: string;
  source?: string;
}

function newMatch(id: string, stage: Match['stage'], round: number): Match {
  return { id, stage, round, order: 0, battles: [], p1Score: 0, p2Score: 0, status: 'pending' };
}

/** 單淘汰樹：人數不是 2 的次方時，前段種子輪空。 */
export function buildKnockout(seeds: Seed[], thirdPlace: boolean): Match[] {
  const k = seeds.length;
  if (k < 2) return [];
  const size = nextPow2(k);
  const order = seedOrder(size);
  const rounds = Math.log2(size);
  const out: Match[] = [];
  let prev: Match[] = [];
  for (let r = 1; r <= rounds; r++) {
    const players = size / 2 ** (r - 1);
    const count = players / 2;
    const label = koLabel(players);
    const cur: Match[] = [];
    for (let i = 0; i < count; i++) {
      const m = newMatch(count === 1 ? `KO-${label}` : `KO-${label}-${i + 1}`, 'knockout', r);
      if (r === 1) {
        const a = seeds[order[2 * i] - 1];
        const bSeed = order[2 * i + 1];
        const b = bSeed <= k ? seeds[bSeed - 1] : undefined;
        m.p1 = a.player;
        m.p1Source = a.source;
        if (b) {
          m.p2 = b.player;
          m.p2Source = b.source;
        } else m.isBye = true;
      } else {
        m.p1Source = `winner:${prev[2 * i].id}`;
        m.p2Source = `winner:${prev[2 * i + 1].id}`;
      }
      cur.push(m);
    }
    if (r === rounds && thirdPlace && rounds >= 2) {
      const third = newMatch('KO-3RD', 'knockout', r);
      third.p1Source = `loser:${prev[0].id}`;
      third.p2Source = `loser:${prev[1].id}`;
      // 準決賽有輪空時少一位敗者，季軍直接由另一位取得
      if (prev[0].isBye || prev[1].isBye) third.isBye = true;
      out.push(third);
    }
    out.push(...cur);
    prev = cur;
  }
  return out;
}

/**
 * 分組晉級的種子：各組第 1 名為前段種子，第 2 名以相反順序並錯開一組排列，
 * 讓第一輪盡量不會遇到同組的人。
 */
export function groupSeeds(groups: Group[], advancePerGroup: number): Seed[] {
  const g = groups.length;
  const seeds: Seed[] = [];
  for (let t = 0; t < advancePerGroup; t++) {
    for (let i = 0; i < g; i++) {
      const group = groups[(i + t) % g];
      const slot = t % 2 === 0 ? t * g + i : t * g + (g - 1 - i);
      seeds[slot] = { source: `group:${group.id}:${t + 1}` };
    }
  }
  return seeds;
}

function playersOf(m: Match): string[] {
  return [m.p1, m.p2].filter((x): x is string => !!x);
}

/**
 * 循環賽排序：每個時段最多 arenaCount 場，同一時段同一人不可重複；
 * 盡量避免同一個人連續兩個時段都要上場。
 */
export function orderMatches(matches: Match[], arenaCount: number, startOrder = 0, startSlot = 0): Match[] {
  const remaining = [...matches];
  const result: Match[] = [];
  let prevPlayers = new Set<string>();
  let slot = startSlot;
  while (remaining.length) {
    const slotPlayers = new Set<string>();
    const conflicts = (m: Match, set: Set<string>) => playersOf(m).some((p) => set.has(p));
    let placed = 0;
    for (let a = 0; a < arenaCount; a++) {
      let idx = remaining.findIndex((m) => !conflicts(m, slotPlayers) && !conflicts(m, prevPlayers));
      if (idx < 0) idx = remaining.findIndex((m) => !conflicts(m, slotPlayers));
      if (idx < 0) break;
      const [m] = remaining.splice(idx, 1);
      m.arena = a + 1;
      m.slot = slot + 1;
      playersOf(m).forEach((p) => slotPlayers.add(p));
      result.push(m);
      placed++;
    }
    if (placed === 0) break;
    prevPlayers = slotPlayers;
    slot++;
  }
  result.forEach((m, i) => (m.order = startOrder + i + 1));
  return result;
}

export interface GenerateOptions {
  rng?: () => number;
  now?: number;
  /** 指定分組（手動交換選手後重新產生時使用）；不指定則隨機抽籤。 */
  groups?: string[][];
  thirdPlaceMatch: boolean;
  arenaCount: number;
}

export function generateBracket(playerIds: string[], choice: FormatChoice, opts: GenerateOptions): BracketDoc {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? Date.now();
  const n = playerIds.length;
  const players = shuffle(playerIds, rng);
  const format = choice.format;

  let groupLists: string[][] = [];
  if (opts.groups) groupLists = opts.groups.filter((g) => g.length > 0);
  else if (format === 'roundRobin') groupLists = [players];
  else if (format === 'groupsThenKnockout') {
    const gc = Math.max(1, Math.min(choice.groupCount ?? Math.ceil(n / 4), Math.floor(n / 2)));
    groupLists = snakeGroups(players, gc);
  }
  const groups: Group[] = groupLists.map((ids, i) => ({ id: GROUP_IDS[i], name: `${GROUP_IDS[i]} 組`, playerIds: ids }));

  // 分組循環：各組同一輪交錯排列
  const perGroup = groups.map((g) =>
    circleRounds(g.playerIds).map((pairs) => pairs.map(([p1, p2]) => ({ ...newMatch('', 'group', 0), groupId: g.id, p1, p2 }))),
  );
  const interleaved: Match[] = [];
  const maxRounds = Math.max(0, ...perGroup.map((r) => r.length));
  const counters = new Map<string, number>();
  for (let r = 0; r < maxRounds; r++) {
    for (const rounds of perGroup) {
      for (const m of rounds[r] ?? []) {
        const k = (counters.get(m.groupId!) ?? 0) + 1;
        counters.set(m.groupId!, k);
        interleaved.push({ ...m, id: `G-${m.groupId}-${k}`, round: r + 1 });
      }
    }
  }
  const groupStage = orderMatches(interleaved, opts.arenaCount);

  let seeds: Seed[] = [];
  if (format === 'groupsThenKnockout' && groups.length > 0) {
    const minSize = Math.min(...groups.map((g) => g.playerIds.length));
    const adv = Math.max(1, Math.min(choice.advancePerGroup ?? 2, minSize));
    seeds = groupSeeds(groups, adv);
  } else if (format === 'knockout') {
    seeds = players.map((p) => ({ player: p }));
  }
  const knockout = buildKnockout(seeds, opts.thirdPlaceMatch);
  let slot = groupStage.reduce((s, m) => Math.max(s, m.slot ?? 0), 0);
  let order = groupStage.length;
  const rounds = [...new Set(knockout.map((m) => m.round))];
  for (const r of rounds) {
    const inRound = knockout.filter((m) => m.round === r);
    inRound.forEach((m, i) => {
      m.order = ++order;
      m.arena = (i % opts.arenaCount) + 1;
      m.slot = slot + Math.floor(i / opts.arenaCount) + 1;
    });
    slot += Math.ceil(inRound.length / opts.arenaCount);
  }

  const bracket: BracketDoc = {
    version: 0,
    generatedAt: now,
    format,
    playerIds: [...playerIds],
    groups,
    matches: [...groupStage, ...knockout],
    currentMatchIds: [],
    drawAt: now,
  };
  return refreshBracket(bracket, opts.arenaCount);
}

/** 估計場數（首頁顯示預計結束時間，賽程未產生前使用）。 */
export function estimateMatchCount(n: number): number {
  if (n < 2) return 0;
  const choice = suggestFormat(n);
  if (choice.format === 'roundRobin') return (n * (n - 1)) / 2;
  const gc = choice.groupCount!;
  const sizes = snakeGroups(Array.from({ length: n }, (_, i) => i), gc).map((g) => g.length);
  const groupMatches = sizes.reduce((s, k) => s + (k * (k - 1)) / 2, 0);
  const k = gc * 2;
  return groupMatches + (k - 1) + 1;
}
