import { groupStandings, isGroupComplete } from '../../engine/advance';
import type { BracketDoc, EntryDoc, Group } from '../../types';
import { PlayerName } from '../avatars';

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

export function GroupTable({
  bracket,
  group,
  entryById,
  big,
  highlight = [],
}: {
  bracket: BracketDoc;
  group: Group;
  entryById: Map<string, EntryDoc>;
  big?: boolean;
  /** 正在比賽的選手（大螢幕標示）。 */
  highlight?: string[];
}) {
  const rows = groupStandings(bracket, group.id);
  const complete = isGroupComplete(bracket, group.id);
  const adv = advanceCount(bracket, group.id);
  const played = bracket.matches.filter((m) => m.groupId === group.id && m.status === 'done').length;
  const total = bracket.matches.filter((m) => m.groupId === group.id).length;
  const text = big ? 'text-2xl' : 'text-sm';
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className={`font-black text-accent ${big ? 'text-3xl' : 'text-lg'}`}>{group.name}</h3>
        <span className={`text-ink-muted ${big ? 'text-lg' : 'text-xs'}`}>{complete ? '已完成' : `${played}/${total} 場`}</span>
      </div>
      <table className={`w-full ${text}`}>
        <thead>
          <tr className="text-left text-ink-muted">
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
              <tr key={r.id} className={`border-t border-line ${advancing ? 'text-primary' : ''} ${highlight.includes(r.id) ? 'bg-gold/10' : ''}`}>
                <td className="py-1 font-mono text-ink-muted">{complete && r.tied ? '=' : r.rank}</td>
                <td className="truncate py-1 font-semibold">
                  <PlayerName entry={entryById.get(r.id)} />
                  {advancing && <span className="ml-1 text-xs text-primary">晉級</span>}
                </td>
                <td className="py-1 text-center font-mono">{r.wins}</td>
                <td className="py-1 text-center font-mono">{r.losses}</td>
                <td className="py-1 text-center font-mono">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {complete && rows.some((r) => r.tied) && <p className="mt-2 text-xs text-gold">同分，由主辦現場加賽決定名次</p>}
    </div>
  );
}
