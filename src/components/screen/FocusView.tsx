import { liveMatches, nextMatchOf } from '../../engine/screen';
import { describeSource, displayName, matchLabel } from '../../lib/format';
import type { BracketDoc, EntryDoc, Match } from '../../types';
import { GroupTable } from '../bracket/GroupTable';
import { LiveMatchCard, upcomingMatches } from '../bracket/LiveMatch';

/**
 * 大螢幕主版面：左邊固定是目前場次（大字比分），右邊是跟這場有關的資訊
 * （這一組的積分／淘汰賽的下一關）與「下一場請準備」。
 */
export function FocusView({ bracket, entryById, arenaCount }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; arenaCount: number }) {
  const live = liveMatches(bracket);
  const notStarted = live.length > 0 && live.every((m) => m.battles.length === 0 && !m.manualScore);
  return (
    <div className="grid h-full grid-cols-[2fr_1fr] gap-6">
      <div className="flex min-w-0 flex-col justify-center gap-6">
        {live.length === 0 ? (
          <div className="text-center">
            <div className="animate-spin-slow inline-block text-9xl">🌀</div>
            <p className="mt-6 text-5xl font-black text-ink-muted">等待下一場…</p>
          </div>
        ) : (
          <>
            {notStarted && <div className="animate-pulse text-center text-5xl font-black text-gold">📣 請選手上場準備！</div>}
            {live.map((m) => (
              <LiveMatchCard key={m.id} match={m} entryById={entryById} size={live.length > 1 ? 'lg' : 'xl'} />
            ))}
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {live[0] && <MatchContext bracket={bracket} match={live[0]} entryById={entryById} />}
        <OnDeck bracket={bracket} entryById={entryById} arenaCount={arenaCount} />
      </div>
    </div>
  );
}

/** 跟目前這場最有關的資訊：分組賽 → 這一組的積分；淘汰賽 → 勝者晉級到哪裡。 */
function MatchContext({ bracket, match, entryById }: { bracket: BracketDoc; match: Match; entryById: Map<string, EntryDoc> }) {
  const group = match.stage === 'group' ? bracket.groups.find((g) => g.id === match.groupId) : undefined;
  if (group) return <GroupTable bracket={bracket} group={group} entryById={entryById} big highlight={[match.p1 ?? '', match.p2 ?? '']} />;

  const next = nextMatchOf(bracket, match.id);
  let headline = '淘汰賽';
  let detail = '';
  if (match.id === 'KO-F') headline = '🏆 冠軍戰！';
  else if (match.id === 'KO-3RD') headline = '🥉 季軍戰';
  else if (next) {
    headline = `勝者晉級 ${matchLabel(next.id)}`;
    const otherSrc = next.p1Source === `winner:${match.id}` ? next.p2Source : next.p1Source;
    const other = next.p1Source === `winner:${match.id}` ? next.p2 : next.p1;
    detail = `對手：${other ? displayName(entryById.get(other)) : describeSource(otherSrc)}`;
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="text-2xl font-bold text-ink-muted">{matchLabel(match.id)}</div>
      <div className="mt-2 text-4xl font-black text-accent">{headline}</div>
      {detail && <div className="mt-3 truncate text-3xl text-ink">{detail}</div>}
    </div>
  );
}

/** 下一場請準備（每個戰鬥盤一場，選手已確定的），再列之後的 2 場。 */
function OnDeck({ bracket, entryById, arenaCount }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; arenaCount: number }) {
  const upcoming = upcomingMatches(bracket, 6);
  const ready = upcoming.filter((m) => m.p1 && m.p2).slice(0, arenaCount);
  const later = upcoming.filter((m) => !ready.includes(m)).slice(0, 2);
  if (upcoming.length === 0) return null;
  const name = (id: string | undefined, src: string | undefined) => (id ? displayName(entryById.get(id)) : describeSource(src));
  return (
    <div className="space-y-3">
      {ready.map((m) => (
        <div key={m.id} className="rounded-2xl border-4 border-gold bg-gold/10 p-4">
          <div className="text-2xl font-black text-gold">📣 下一場請準備</div>
          <div className="mt-2 truncate text-4xl font-black">{name(m.p1, m.p1Source)}</div>
          <div className="text-2xl font-bold text-ink-muted">vs</div>
          <div className="truncate text-4xl font-black">{name(m.p2, m.p2Source)}</div>
        </div>
      ))}
      {later.length > 0 && (
        <div className="rounded-2xl bg-surface/70 p-4">
          <div className="text-xl font-bold text-ink-muted">之後</div>
          {later.map((m) => (
            <div key={m.id} className="mt-1 truncate text-2xl font-semibold text-ink">
              {name(m.p1, m.p1Source)} vs {name(m.p2, m.p2Source)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
