import { groupStandings, isGroupComplete } from '../../engine/advance';
import { displayName } from '../../lib/format';
import type { BracketDoc, EntryDoc, Group } from '../../types';

export function advanceCount(b: BracketDoc, groupId: string): number {
  let max = 0;
  for (const m of b.matches) {
    for (const s of [m.p1Source, m.p2Source]) {
      const [kind, g, n] = (s ?? '').split(':');
      if (kind === 'group' && g === groupId) max = Math.max(max, Number(n));
    }
  }
  return max;
}

export function GroupTable({ bracket, group, entryById, big }: { bracket: BracketDoc; group: Group; entryById: Map<string, EntryDoc>; big?: boolean }) {
  const rows = groupStandings(bracket, group.id);
  const complete = isGroupComplete(bracket, group.id);
  const adv = advanceCount(bracket, group.id);
  const played = bracket.matches.filter((m) => m.groupId === group.id && m.status === 'done').length;
  const total = bracket.matches.filter((m) => m.groupId === group.id).length;
  const text = big ? 'text-2xl' : 'text-sm';
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className={`font-black text-fuchsia-300 ${big ? 'text-3xl' : 'text-lg'}`}>{group.name}</h3>
        <span className={`text-slate-400 ${big ? 'text-lg' : 'text-xs'}`}>{complete ? '已完成' : `${played}/${total} 場`}</span>
      </div>
      <table className={`w-full ${text}`}>
        <thead>
          <tr className="text-left text-slate-500">
            <th className="w-8 font-normal">#</th>
            <th className="font-normal">選手</th>
            <th className="w-12 text-center font-normal">勝</th>
            <th className="w-12 text-center font-normal">敗</th>
            <th className="w-14 text-center font-normal">分差</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const advancing = complete && i < adv && !r.tied;
            return (
              <tr key={r.id} className={`border-t border-slate-800 ${advancing ? 'text-cyan-200' : ''}`}>
                <td className="py-1 font-mono text-slate-400">{complete && r.tied ? '=' : r.rank}</td>
                <td className="truncate py-1 font-semibold">
                  {displayName(entryById.get(r.id))}
                  {advancing && <span className="ml-1 text-xs text-cyan-400">晉級</span>}
                </td>
                <td className="py-1 text-center font-mono">{r.wins}</td>
                <td className="py-1 text-center font-mono">{r.losses}</td>
                <td className="py-1 text-center font-mono">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {complete && rows.some((r) => r.tied) && <p className="mt-2 text-xs text-amber-300">同分，由主辦現場加賽決定名次</p>}
    </div>
  );
}
