import { matchLabel } from '../../lib/format';
import type { BracketDoc, EntryDoc, Match } from '../../types';

function Side({ entry, score, align, big }: { entry?: EntryDoc; score: number; align: 'left' | 'right'; big?: boolean }) {
  return (
    <div className={`flex flex-1 flex-col ${align === 'left' ? 'items-start text-left' : 'items-end text-right'} min-w-0`}>
      <div className={big ? 'text-7xl' : 'text-4xl'}>{entry?.emoji ?? '🌀'}</div>
      <div className={`mt-1 w-full truncate font-black ${big ? 'text-5xl' : 'text-xl'}`}>{entry?.nickname ?? '？'}</div>
      {entry?.beyName && <div className={`w-full truncate text-slate-400 ${big ? 'text-2xl' : 'text-xs'}`}>{entry.beyName}</div>}
      <div className={`font-display neon-text mt-2 ${big ? 'text-9xl' : 'text-5xl'} ${align === 'left' ? 'text-cyan-300' : 'text-fuchsia-300'}`}>{score}</div>
    </div>
  );
}

export function LiveMatchCard({ match, entryById, big }: { match: Match; entryById: Map<string, EntryDoc>; big?: boolean }) {
  return (
    <div className={`rounded-3xl border-2 border-fuchsia-500/70 bg-slate-900/90 shadow-[0_0_40px_rgba(217,70,239,0.3)] ${big ? 'p-8' : 'p-4'}`}>
      <div className={`mb-3 flex justify-between font-bold text-slate-400 ${big ? 'text-2xl' : 'text-xs'}`}>
        <span>{matchLabel(match.id)}</span>
        {match.arena && <span>{match.arena} 號戰鬥盤</span>}
      </div>
      <div className="flex items-center gap-3">
        <Side entry={match.p1 ? entryById.get(match.p1) : undefined} score={match.p1Score} align="left" big={big} />
        <div className={`font-display shrink-0 text-amber-300 ${big ? 'text-6xl' : 'text-2xl'}`}>VS</div>
        <Side entry={match.p2 ? entryById.get(match.p2) : undefined} score={match.p2Score} align="right" big={big} />
      </div>
    </div>
  );
}

export function LiveMatches({ bracket, entryById, big }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; big?: boolean }) {
  const live = bracket.currentMatchIds.map((id) => bracket.matches.find((m) => m.id === id)).filter((m): m is Match => !!m);
  if (live.length === 0) return null;
  return (
    <div className={`grid gap-4 ${live.length > 1 && big ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {live.map((m) => (
        <LiveMatchCard key={m.id} match={m} entryById={entryById} big={big} />
      ))}
    </div>
  );
}

export function upcomingMatches(bracket: BracketDoc, limit: number): Match[] {
  return bracket.matches
    .filter((m) => m.status === 'pending' && !m.isBye)
    .sort((a, b) => a.order - b.order)
    .slice(0, limit);
}
