import { describeSource, displayName, matchLabel } from '../../lib/format';
import type { EntryDoc, Match } from '../../types';

export function PlayerSlot({
  id,
  source,
  entryById,
  winner,
  score,
  showScore,
}: {
  id?: string;
  source?: string;
  entryById: Map<string, EntryDoc>;
  winner?: boolean;
  score?: number;
  showScore?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${winner ? 'bg-cyan-500/20 text-cyan-900' : ''}`}>
      <span className={`truncate ${id ? 'font-semibold' : 'italic text-slate-500'}`}>
        {id ? displayName(entryById.get(id)) : describeSource(source)}
      </span>
      {showScore && <span className={`font-mono font-black ${winner ? 'text-cyan-700' : 'text-slate-600'}`}>{score}</span>}
    </div>
  );
}

export function MatchCard({ match, entryById, className = '' }: { match: Match; entryById: Map<string, EntryDoc>; className?: string }) {
  const showScore = match.status !== 'pending' && !match.isBye;
  const border =
    match.status === 'live' ? 'border-fuchsia-600 shadow-[0_0_16px_rgba(217,70,239,0.4)]' : match.status === 'done' ? 'border-slate-300' : 'border-slate-200';
  return (
    <div className={`rounded-xl border bg-white p-1.5 text-sm ${border} ${className}`}>
      <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-slate-500">
        <span>
          #{match.order} {matchLabel(match.id)}
        </span>
        {match.status === 'live' && <span className="font-bold text-fuchsia-700">● 進行中{match.arena ? `（${match.arena} 號盤）` : ''}</span>}
        {match.isBye && <span>輪空晉級</span>}
      </div>
      <PlayerSlot id={match.p1} source={match.p1Source} entryById={entryById} winner={!!match.winner && match.winner === match.p1} score={match.p1Score} showScore={showScore} />
      {!(match.isBye && !match.p2) && (
        <PlayerSlot id={match.p2} source={match.p2Source} entryById={entryById} winner={!!match.winner && match.winner === match.p2} score={match.p2Score} showScore={showScore} />
      )}
    </div>
  );
}
