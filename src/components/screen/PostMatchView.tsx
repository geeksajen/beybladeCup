import { groupRanking, isGroupComplete } from '../../engine/advance';
import { nextMatchOf, standingsChange } from '../../engine/screen';
import { displayName, matchLabel } from '../../lib/format';
import type { BracketDoc, EntryDoc } from '../../types';
import { advanceCount } from '../bracket/GroupTable';
import { KnockoutTree } from '../bracket/KnockoutTree';

/** 一場剛結束：顯示這場造成的變化（分組名次升降／淘汰賽晉級到哪裡）。 */
export function PostMatchView({ bracket, matchId, entryById }: { bracket: BracketDoc; matchId: string; entryById: Map<string, EntryDoc> }) {
  const m = bracket.matches.find((x) => x.id === matchId);
  if (!m || !m.winner) return null;
  const loser = m.winner === m.p1 ? m.p2 : m.p1;
  const ws = m.winner === m.p1 ? m.p1Score : m.p2Score;
  const ls = m.winner === m.p1 ? m.p2Score : m.p1Score;
  const winner = displayName(entryById.get(m.winner));

  if (m.stage === 'knockout') {
    const next = nextMatchOf(bracket, m.id);
    const headline =
      m.id === 'KO-F' ? `🏆 ${winner} 奪得冠軍！` : m.id === 'KO-3RD' ? `🥉 ${winner} 獲得季軍！` : `🎉 ${winner} 晉級${next ? ` ${matchLabel(next.id)}` : ''}！`;
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="neon-text text-7xl font-black">{headline}</div>
          <div className="font-display mt-3 text-5xl text-slate-600">
            {ws} : {ls}
          </div>
        </div>
        <KnockoutTree bracket={bracket} entryById={entryById} big />
      </div>
    );
  }

  const group = bracket.groups.find((g) => g.id === m.groupId);
  if (!group) return null;
  const rows = standingsChange(bracket, m.id);
  const adv = bracket.format === 'groupsThenKnockout' ? advanceCount(bracket, group.id) : 0;
  const complete = isGroupComplete(bracket, group.id);
  const decided = !!groupRanking(bracket, group.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center">
        <div className="text-4xl font-bold text-slate-600">
          🎉 {winner} 獲勝 <span className="font-display">{ws} : {ls}</span>
        </div>
        <h2 className="neon-text mt-3 text-7xl font-black">
          {group.name} {complete ? '最終名次' : '積分更新'}
        </h2>
      </div>
      <table className="w-full text-4xl">
        <thead>
          <tr className="text-left text-2xl text-slate-500">
            <th className="w-20 pb-2 font-normal">名次</th>
            <th className="pb-2 font-normal">選手</th>
            <th className="w-28 pb-2 text-center font-normal">勝</th>
            <th className="w-28 pb-2 text-center font-normal">敗</th>
            <th className="w-32 pb-2 text-center font-normal">分差</th>
            <th className="w-32 pb-2 text-center font-normal">變化</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const inZone = adv > 0 && r.rank <= adv;
            const isPlayer = r.id === m.winner || r.id === loser;
            return (
              <tr key={r.id} className={`border-t-2 border-slate-200 ${inZone ? 'bg-cyan-50' : ''} ${isPlayer ? 'font-black' : ''}`}>
                <td className="py-3 font-mono text-slate-600">{complete && r.tied ? '=' : r.rank}</td>
                <td className="truncate py-3">
                  {displayName(entryById.get(r.id))}
                  {r.id === m.winner && <span className="ml-3 rounded-full bg-amber-400 px-3 text-2xl text-amber-950">勝</span>}
                  {inZone && decided && <span className="ml-3 rounded-full bg-cyan-600 px-3 text-2xl text-white">✓ 晉級</span>}
                </td>
                <td className="py-3 text-center font-mono">{r.wins}</td>
                <td className="py-3 text-center font-mono">{r.losses}</td>
                <td className="py-3 text-center font-mono">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td className={`py-3 text-center font-black ${r.delta > 0 ? 'text-emerald-600' : r.delta < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                  {r.delta > 0 ? `▲${r.delta}` : r.delta < 0 ? `▼${-r.delta}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {adv > 0 && !decided && <p className="text-center text-2xl text-cyan-700">藍色底 = 目前在晉級區（前 {adv} 名進淘汰賽）</p>}
      {complete && !decided && <p className="text-center text-2xl text-amber-700">有同分，由主辦現場加賽決定名次</p>}
    </div>
  );
}
