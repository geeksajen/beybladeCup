import { roundLabel } from '../../lib/format';
import type { BracketDoc, EntryDoc } from '../../types';
import { MatchCard } from './MatchCard';

export function KnockoutTree({ bracket, entryById, big }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; big?: boolean }) {
  const ko = bracket.matches.filter((m) => m.stage === 'knockout' && m.id !== 'KO-3RD');
  if (ko.length === 0) return null;
  const rounds = [...new Set(ko.map((m) => m.round))].sort((a, b) => a - b);
  const firstRoundSize = ko.filter((m) => m.round === rounds[0]).length * 2;
  const third = bracket.matches.find((m) => m.id === 'KO-3RD');
  return (
    <div className="overflow-x-auto pb-2">
      <div className={`flex gap-3 ${big ? 'min-w-full text-xl' : 'min-w-max'}`}>
        {rounds.map((r, idx) => {
          const ms = ko.filter((m) => m.round === r).sort((a, b) => a.order - b.order);
          return (
            <div key={r} className={`flex flex-col ${big ? 'flex-1' : 'w-48'}`}>
              <div className={`mb-2 text-center font-bold text-slate-600 ${big ? 'text-2xl' : 'text-xs'}`}>{roundLabel(firstRoundSize / 2 ** idx)}</div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {ms.map((m) => (
                  <MatchCard key={m.id} match={m} entryById={entryById} className={big ? 'text-xl' : ''} />
                ))}
                {r === rounds[rounds.length - 1] && third && (
                  <div>
                    <div className={`mb-1 mt-4 text-center font-bold text-slate-600 ${big ? 'text-2xl' : 'text-xs'}`}>季軍戰</div>
                    <MatchCard match={third} entryById={entryById} className={big ? 'text-xl' : ''} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
