import { byWinRate, topByFinish, winRate, type MetaRow, type MetaStats } from '../engine/meta';
import { displayName } from '../lib/format';
import type { EntryDoc } from '../types';
import { DeckView } from './Deck';
import { Icon, type IconName } from './icons';

const pct = (r: MetaRow) => `${Math.round(winRate(r) * 100)}%`;

/** Meta 亮點卡：冠軍 Deck、最高勝率 Bit、Xtreme／Burst 製造機、最多人用的 Blade。 */
export function MetaHighlights({ meta, entryById, big }: { meta: MetaStats; entryById: Map<string, EntryDoc>; big?: boolean }) {
  const bestBit = byWinRate(meta.rows.bit)[0];
  const bestBlade = byWinRate(meta.rows.blade)[0];
  const xtreme = topByFinish(meta.rows.combo, 'xtreme');
  const burst = topByFinish(meta.rows.blade, 'burst');
  const popular = meta.rows.blade[0];

  const cards: { icon: IconName; color: string; title: string; main: string; sub: string }[] = [];
  if (bestBlade) cards.push({ icon: 'trend', color: 'text-success', title: '最高勝率 Blade', main: bestBlade.label, sub: `${bestBlade.battles} 局 ${bestBlade.wins} 勝・${pct(bestBlade)}` });
  if (bestBit) cards.push({ icon: 'target', color: 'text-primary', title: '最高勝率 Bit', main: bestBit.label, sub: `${bestBit.battles} 局 ${bestBit.wins} 勝・${pct(bestBit)}` });
  if (xtreme) cards.push({ icon: 'xtreme', color: 'text-xtreme', title: 'Xtreme 製造機', main: xtreme.label, sub: `打出 ${xtreme.finishes.xtreme} 次 Xtreme` });
  if (burst) cards.push({ icon: 'burst', color: 'text-accent', title: 'Burst 製造機', main: burst.label, sub: `打出 ${burst.finishes.burst} 次 Burst` });
  if (popular) cards.push({ icon: 'users', color: 'text-gold', title: '最多人用的 Blade', main: popular.label, sub: `${popular.players} 位選手` });

  return (
    <div className={big ? 'space-y-6' : 'space-y-3'}>
      {meta.championDeck?.length ? (
        <div className={`rounded-2xl border-2 border-gold bg-gold/10 ${big ? 'p-6' : 'p-3'}`}>
          <div className={`font-bold text-gold ${big ? 'text-3xl' : 'text-sm'}`}>
            <Icon name="trophy" className="mr-1" />
            冠軍 Deck・{displayName(entryById.get(meta.championId ?? ''))}
          </div>
          <DeckView deck={meta.championDeck} className={`mt-2 ${big ? 'text-3xl' : 'text-sm'}`} />
        </div>
      ) : null}
      <div className={`grid gap-2 ${big ? 'grid-cols-3 gap-4' : 'grid-cols-2'}`}>
        {cards.map((c) => (
          <div key={c.title} className={`rounded-2xl border border-line bg-surface ${big ? 'p-5' : 'p-2.5'}`}>
            <div className={`font-bold text-ink-muted ${big ? 'text-2xl' : 'text-[11px]'}`}>
              <Icon name={c.icon} className={`mr-1 ${c.color}`} />
              {c.title}
            </div>
            <div className={`truncate font-black ${big ? 'text-4xl' : 'text-base'}`}>{c.main}</div>
            <div className={`text-ink-muted ${big ? 'text-2xl' : 'text-xs'}`}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
