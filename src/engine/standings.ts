import type { Match } from '../types';

export interface StandingRow {
  id: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  rank: number;
  /** 依 §5.3 前 4 項仍無法分出名次，需要主辦手動決定。 */
  tied: boolean;
}

function sameStats(a: StandingRow, b: StandingRow): boolean {
  return a.wins === b.wins && a.diff === b.diff && a.pointsFor === b.pointsFor;
}

/**
 * 分組積分與排名（spec §5.3）：勝場 → 積分差 → 總得分 → 兩人對戰結果 → 主辦手動決定。
 * manualOrder：主辦手動排定的順序，只用來打破仍然相同的名次。
 */
export function computeStandings(playerIds: string[], matches: Match[], manualOrder?: string[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of playerIds) {
    rows.set(id, { id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, rank: 0, tied: false });
  }
  for (const m of matches) {
    if (m.status !== 'done' || m.isBye || !m.p1 || !m.p2) continue;
    const r1 = rows.get(m.p1);
    const r2 = rows.get(m.p2);
    if (!r1 || !r2) continue;
    r1.played++;
    r2.played++;
    r1.pointsFor += m.p1Score;
    r1.pointsAgainst += m.p2Score;
    r2.pointsFor += m.p2Score;
    r2.pointsAgainst += m.p1Score;
    if (m.winner === m.p1) {
      r1.wins++;
      r2.losses++;
    } else if (m.winner === m.p2) {
      r2.wins++;
      r1.losses++;
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.diff = r.pointsFor - r.pointsAgainst;
  const originalIndex = new Map(playerIds.map((id, i) => [id, i]));
  list.sort(
    (a, b) =>
      b.wins - a.wins || b.diff - a.diff || b.pointsFor - a.pointsFor || originalIndex.get(a.id)! - originalIndex.get(b.id)!,
  );

  // 把統計完全相同的人分成一群，再用兩人對戰結果或手動順序決定
  const result: StandingRow[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i + 1;
    while (j < list.length && sameStats(list[i], list[j])) j++;
    const cluster = list.slice(i, j);
    if (cluster.length === 2) {
      const [a, b] = cluster;
      const h2h = matches.find(
        (m) => m.status === 'done' && !m.isBye && ((m.p1 === a.id && m.p2 === b.id) || (m.p1 === b.id && m.p2 === a.id)),
      );
      if (h2h?.winner) {
        result.push(...(h2h.winner === a.id ? [a, b] : [b, a]));
        i = j;
        continue;
      }
    }
    if (cluster.length >= 2) {
      const manualIdx = (id: string) => manualOrder?.indexOf(id) ?? -1;
      const resolvedByManual = !!manualOrder && cluster.every((r) => manualIdx(r.id) >= 0);
      if (resolvedByManual) cluster.sort((x, y) => manualIdx(x.id) - manualIdx(y.id));
      else for (const r of cluster) r.tied = true;
    }
    result.push(...cluster);
    i = j;
  }
  result.forEach((r, idx) => (r.rank = idx + 1));
  return result;
}
