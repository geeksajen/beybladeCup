import { tallyPredictions } from '../engine/predictions';
import type { EntryDoc, PredictionDoc } from '../types';
import { PlayerName } from './avatars';

/** 猜冠軍的人氣排行長條。 */
export function PopularityBars({
  preds,
  playerIds,
  entryById,
  limit,
  big,
}: {
  preds: PredictionDoc[];
  playerIds: string[];
  entryById: Map<string, EntryDoc>;
  limit: number;
  big?: boolean;
}) {
  const rows = tallyPredictions(preds, playerIds).slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.votes));
  return (
    <div className={big ? 'space-y-4' : 'space-y-1.5'}>
      {rows.map((r) => (
        <div key={r.id} className={`flex items-center gap-3 ${big ? 'text-3xl' : 'text-sm'}`}>
          <span className={`shrink-0 truncate font-bold ${big ? 'w-80' : 'w-28'}`}><PlayerName entry={entryById.get(r.id)} /></span>
          <div className={`flex-1 overflow-hidden rounded-full bg-raised ${big ? 'h-10' : 'h-4'}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-700" style={{ width: `${(r.votes / max) * 100}%` }} />
          </div>
          <span className={`shrink-0 text-right font-mono font-black ${big ? 'w-24' : 'w-10'}`}>{r.votes} 票</span>
        </div>
      ))}
    </div>
  );
}
