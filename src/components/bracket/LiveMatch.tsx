import { isDecisive, nextBeys } from '../../engine/deck';
import { FINISH_LABELS } from '../../lib/defaults';
import { matchLabel } from '../../lib/format';
import { comboLabel } from '../../lib/parts';
import type { BracketDoc, Combo, EntryDoc, Match } from '../../types';
import { Avatar, Icon } from '../icons';

/** sm = 手機；lg = 電視上兩場並列；xl = 電視上單場（75 吋、在戰鬥盤旁邊抬頭看）。 */
export type CardSize = 'sm' | 'lg' | 'xl';

const S = {
  sm: { pad: 'p-4', head: 'text-xs', emoji: 'text-4xl', name: 'text-xl', bey: 'text-xs', score: 'text-5xl', vs: 'text-2xl' },
  lg: { pad: 'p-6', head: 'text-2xl', emoji: 'text-6xl', name: 'text-4xl', bey: 'text-2xl', score: 'text-8xl', vs: 'text-5xl' },
  xl: { pad: 'p-10', head: 'text-3xl', emoji: 'text-9xl', name: 'text-6xl', bey: 'text-3xl', score: 'text-[11rem] leading-none', vs: 'text-7xl' },
};

function Side({ entry, score, align, size, bey }: { entry?: EntryDoc; score: number; align: 'left' | 'right'; size: CardSize; bey?: Combo }) {
  const s = S[size];
  return (
    <div className={`flex flex-1 flex-col ${align === 'left' ? 'items-start text-left' : 'items-end text-right'} min-w-0`}>
      <Avatar emoji={entry?.emoji} className={s.emoji} />
      <div className={`mt-1 w-full truncate font-black ${s.name}`}>{entry?.nickname ?? '？'}</div>
      {bey ? (
        <div className={`mt-1 max-w-full truncate rounded-lg bg-gold/10 px-2 font-bold text-gold ${s.bey}`}>
          <Icon name="bey" className="mr-1" />
          {comboLabel(bey)}
        </div>
      ) : (
        entry?.beyName && <div className={`w-full truncate text-ink-muted ${s.bey}`}>{entry.beyName}</div>
      )}
      <div className={`font-display neon-text mt-2 ${s.score} ${align === 'left' ? 'text-primary' : 'text-accent'}`}>{score}</div>
    </div>
  );
}

/** 逐局紀錄：每一局誰贏、用什麼終結（電視版顯示，讓大家抬頭就知道剛剛發生什麼）。 */
function BattleLog({ match, size }: { match: Match; size: CardSize }) {
  const decisive = match.battles.filter(isDecisive);
  if (decisive.length === 0) return null;
  return (
    <div className={`mt-4 flex flex-wrap justify-center gap-2 ${size === 'xl' ? 'text-2xl' : 'text-lg'}`}>
      {decisive.map((b, i) => (
        <span
          key={i}
          className={`rounded-lg px-3 py-0.5 font-bold text-on ${FINISH_LABELS[b.finish].color} ${b.winner === 'p1' ? 'ring-4 ring-primary/40' : 'ring-4 ring-accent/40'}`}
        >
          {b.winner === 'p1' ? '◀ ' : ''}
          <Icon name={b.finish} className="mr-1" />
          {FINISH_LABELS[b.finish].name}
          {b.winner === 'p2' ? ' ▶' : ''}
        </span>
      ))}
    </div>
  );
}

export function LiveMatchCard({ match, entryById, big, size: sizeProp }: { match: Match; entryById: Map<string, EntryDoc>; big?: boolean; size?: CardSize }) {
  const size: CardSize = sizeProp ?? (big ? 'xl' : 'sm');
  const s = S[size];
  const beys = nextBeys(match);
  const tv = size !== 'sm';
  return (
    <div className={`rounded-3xl border-2 border-accent/70 bg-surface shadow-[0_0_32px_rgb(var(--accent)/0.18)] ${s.pad}`}>
      <div className={`mb-3 flex justify-between font-bold text-ink-muted ${s.head}`}>
        <span>{matchLabel(match.id)}</span>
        {tv && !match.manualScore && <span className="text-accent">第 {match.battles.filter(isDecisive).length + 1} 局</span>}
        {match.arena && <span>{match.arena} 號戰鬥盤</span>}
      </div>
      <div className="flex items-center gap-3">
        <Side entry={match.p1 ? entryById.get(match.p1) : undefined} score={match.p1Score} align="left" size={size} bey={beys.p1} />
        <div className={`font-display shrink-0 text-gold ${s.vs}`}>VS</div>
        <Side entry={match.p2 ? entryById.get(match.p2) : undefined} score={match.p2Score} align="right" size={size} bey={beys.p2} />
      </div>
      {tv && <BattleLog match={match} size={size} />}
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
