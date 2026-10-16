import type { BracketDoc, Match } from '../types';
import { loserOf } from './scoring';
import { computeStandings, type StandingRow } from './standings';

export function groupMatches(b: BracketDoc, groupId: string): Match[] {
  return b.matches.filter((m) => m.stage === 'group' && m.groupId === groupId);
}

export function isGroupComplete(b: BracketDoc, groupId: string): boolean {
  return groupMatches(b, groupId).every((m) => m.status === 'done');
}

export function groupStandings(b: BracketDoc, groupId: string): StandingRow[] {
  const g = b.groups.find((x) => x.id === groupId);
  if (!g) return [];
  return computeStandings(g.playerIds, groupMatches(b, groupId), b.manualOrder?.[groupId]);
}

/** 分組名次確定（比完且沒有未解決的同分）才回傳。 */
export function groupRanking(b: BracketDoc, groupId: string): string[] | undefined {
  if (!isGroupComplete(b, groupId)) return undefined;
  const rows = groupStandings(b, groupId);
  if (rows.some((r) => r.tied)) return undefined;
  return rows.map((r) => r.id);
}

/** 已比完但有同分需要主辦手動決定名次的組別。 */
export function groupsNeedingManualOrder(b: BracketDoc): string[] {
  return b.groups
    .filter((g) => isGroupComplete(b, g.id) && groupStandings(b, g.id).some((r) => r.tied))
    .map((g) => g.id);
}

function resolveSource(b: BracketDoc, byId: Map<string, Match>, src: string): string | undefined {
  const [kind, ref, n] = src.split(':');
  if (kind === 'group') return groupRanking(b, ref)?.[Number(n) - 1];
  const m = byId.get(ref);
  if (!m) return undefined;
  if (kind === 'winner') return m.status === 'done' ? m.winner : undefined;
  if (kind === 'loser') return loserOf(m);
  return undefined;
}

function resetMatch(m: Match): void {
  m.battles = [];
  m.p1Score = 0;
  m.p2Score = 0;
  m.manualScore = false;
  m.p1Deck = undefined;
  m.p2Deck = undefined;
  m.winner = undefined;
  m.status = 'pending';
}

const koSort = (a: Match, b: Match) => a.round - b.round || a.order - b.order;

/**
 * 依來源（group:A:1、winner:KO-QF-1、loser:KO-SF-1）填入淘汰賽選手，處理輪空。
 * 若某場的選手因為前面的結果被修改而改變，該場比分會清空。
 */
export function resolveBracket(input: BracketDoc): BracketDoc {
  const b: BracketDoc = { ...input, matches: input.matches.map((m) => ({ ...m, battles: [...m.battles] })) };
  const byId = new Map(b.matches.map((m) => [m.id, m]));
  for (const m of b.matches.filter((x) => x.stage === 'knockout').sort(koSort)) {
    const p1 = m.p1Source ? resolveSource(b, byId, m.p1Source) : m.p1;
    const p2 = m.p2Source ? resolveSource(b, byId, m.p2Source) : m.p2;
    if (p1 !== m.p1 || p2 !== m.p2) {
      m.p1 = p1;
      m.p2 = p2;
      resetMatch(m);
    }
    if (m.isBye) {
      const present = m.p1 ?? m.p2;
      m.winner = present;
      m.status = present ? 'done' : 'pending';
    }
  }
  b.finalRanking = computeFinalRanking(b);
  return b;
}

/** 自動帶出下一場：空的戰鬥盤依順序補上選手已確定、且沒有人正在比賽的場次。 */
export function pickCurrent(input: BracketDoc, arenaCount: number): BracketDoc {
  const b: BracketDoc = { ...input, matches: input.matches.map((m) => ({ ...m })) };
  const live = b.matches.filter((m) => m.status === 'live');
  const busy = new Set(live.flatMap((m) => [m.p1, m.p2]));
  const usedArenas = new Set(live.map((m) => m.arena));
  for (const m of [...b.matches].sort((x, y) => x.order - y.order)) {
    if (live.length >= arenaCount) break;
    if (m.status !== 'pending' || m.isBye || !m.p1 || !m.p2) continue;
    if (busy.has(m.p1) || busy.has(m.p2)) continue;
    let arena = 1;
    while (usedArenas.has(arena)) arena++;
    m.status = 'live';
    m.arena = arena;
    usedArenas.add(arena);
    busy.add(m.p1);
    busy.add(m.p2);
    live.push(m);
  }
  b.currentMatchIds = live.sort((x, y) => (x.arena ?? 0) - (y.arena ?? 0)).map((m) => m.id);
  return b;
}

/** 每次修改賽程後呼叫：淘汰賽晉級 → 最終排名 → 目前場次。 */
export function refreshBracket(b: BracketDoc, arenaCount: number): BracketDoc {
  return pickCurrent(resolveBracket(b), arenaCount);
}

/** 把指定場次設為目前場次（取代同一個戰鬥盤上尚未開打的場次）。 */
export function startMatchNow(input: BracketDoc, matchId: string, arenaCount: number): BracketDoc {
  const b: BracketDoc = { ...input, matches: input.matches.map((m) => ({ ...m })) };
  const target = b.matches.find((m) => m.id === matchId);
  if (!target || target.status !== 'pending' || !target.p1 || !target.p2) return input;
  const live = b.matches.filter((m) => m.status === 'live');
  // 與目標選手衝突、或為了騰出戰鬥盤而必須讓出的場次（只讓出還沒有逐局紀錄的）
  const conflicts = live.filter((m) => [m.p1, m.p2].some((p) => p === target.p1 || p === target.p2));
  let freed = conflicts;
  if (live.length - conflicts.length >= arenaCount) {
    const spare = live.filter((m) => !conflicts.includes(m) && m.battles.length === 0 && !m.manualScore).pop();
    freed = spare ? [...conflicts, spare] : conflicts;
  }
  if (freed.some((m) => m.battles.length > 0 || m.manualScore)) return input;
  if (live.length - freed.length >= arenaCount) return input;
  for (const m of freed) m.status = 'pending';
  const usedArenas = new Set(live.filter((m) => m.status === 'live').map((m) => m.arena));
  let arena = 1;
  while (usedArenas.has(arena)) arena++;
  target.status = 'live';
  target.arena = arena;
  return pickCurrent(b, arenaCount);
}

/** 修改這一場會不會影響已經開打的後續場次（重新開啟前用來警告）。 */
export function downstreamStarted(b: BracketDoc, matchId: string): boolean {
  const m = b.matches.find((x) => x.id === matchId);
  if (!m) return false;
  const started = (x: Match) => !x.isBye && (x.battles.length > 0 || x.manualScore || x.status === 'done');
  if (m.stage === 'group') {
    // 分組名次會影響整個淘汰賽
    return b.matches.some((x) => x.stage === 'knockout' && started(x));
  }
  const queue = [matchId];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    for (const x of b.matches) {
      if (seen.has(x.id)) continue;
      if ([x.p1Source, x.p2Source].some((s) => s && s.split(':')[1] === id)) {
        seen.add(x.id);
        if (started(x)) return true;
        queue.push(x.id);
      }
    }
  }
  return false;
}

export interface Podium {
  first?: string;
  second?: string;
  third: string[];
}

export function computePodium(b: BracketDoc): Podium | undefined {
  if (b.format === 'roundRobin') {
    const g = b.groups[0];
    const r = g && groupRanking(b, g.id);
    if (!r) return undefined;
    return { first: r[0], second: r[1], third: r[2] ? [r[2]] : [] };
  }
  const final = b.matches.find((m) => m.id === 'KO-F');
  if (!final || final.status !== 'done' || !final.winner) return undefined;
  const podium: Podium = { first: final.winner, second: loserOf(final), third: [] };
  const third = b.matches.find((m) => m.id === 'KO-3RD');
  if (third) {
    if (third.status !== 'done' || !third.winner) return undefined;
    podium.third = [third.winner];
  } else {
    podium.third = b.matches
      .filter((m) => m.id.startsWith('KO-SF'))
      .map((m) => loserOf(m))
      .filter((x): x is string => !!x);
  }
  return podium;
}

export function computeFinalRanking(b: BracketDoc): string[] | undefined {
  if (b.format === 'roundRobin') {
    const g = b.groups[0];
    return g ? groupRanking(b, g.id) : undefined;
  }
  const p = computePodium(b);
  if (!p) return undefined;
  return [p.first, p.second, ...p.third].filter((x): x is string => !!x);
}
