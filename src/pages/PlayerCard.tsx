import { Link, useParams } from 'react-router-dom';
import { BadgeGrid, useAchievements } from '../components/Achievements';
import { MatchCard } from '../components/bracket/MatchCard';
import { DeckView, useCanSeeDeck } from '../components/Deck';
import { AwardTitle } from '../components/AwardTitle';
import { Avatar } from '../components/avatars';
import { Icon } from '../components/icons';
import { NextUpBanner } from '../components/NextUp';
import { Card } from '../components/ui';
import { ACHIEVEMENTS } from '../engine/achievements';
import { playerSummary } from '../engine/player';
import { FINISH_LABELS, FINISH_TYPES } from '../lib/defaults';
import { useReadyEvent } from '../providers/EventProvider';

/** 選手卡：卡片風格的個人頁，可以截圖留念（只有暱稱與戰績，沒有照片）。 */
export default function PlayerCard() {
  const { id = '' } = useParams();
  const { event: ev, bracket, entryById, entriesLoaded } = useReadyEvent();
  const achievements = useAchievements();
  const canSeeDeck = useCanSeeDeck();
  const entry = entryById.get(id);

  if (entriesLoaded && (!entry || entry.status === 'cancelled')) {
    return (
      <div className="pt-10 text-center">
        <Icon name="bey" className="text-5xl text-primary" />
        <p className="mt-3 text-ink">找不到這位選手。</p>
        <Link to="/players" className="mt-3 inline-block text-primary underline">
          回參賽名單
        </Link>
      </div>
    );
  }
  if (!entry) return null;

  const playing = !!bracket?.playerIds.includes(id);
  const s = bracket && playing ? playerSummary(bracket, id) : undefined;
  const rankIdx = ev.status === 'finished' ? (bracket?.finalRanking?.indexOf(id) ?? -1) : -1;
  const awards = ev.status === 'finished' ? (bracket?.awards ?? []).filter((a) => a.entryIds.includes(id)) : [];
  const played = s?.matches.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-[2rem] bg-gradient-to-br from-accent via-xtreme to-primary p-1.5 shadow-[0_8px_30px_rgb(var(--accent)/0.3)]">
        <div className="rounded-[1.6rem] bg-surface px-5 pb-5 pt-4">
          <div className="flex items-center justify-between text-[11px] font-bold tracking-widest text-ink-subtle">
            <span>BEYBLADE CUP</span>
            <span className="truncate pl-2">{ev.title}</span>
          </div>
          <div className="mt-2 text-center">
            <Avatar value={entry.emoji} className="text-8xl leading-none" />
            <h1 className="neon-text mt-2 text-3xl font-black">{entry.nickname}</h1>
            {entry.beyName && (
              <div className="mt-1 font-bold text-accent">
                <Icon name="bey" className="mr-1" />
                {entry.beyName}
              </div>
            )}
            {entry.grade && <div className="text-sm text-ink-muted">{entry.grade}</div>}
          </div>

          {canSeeDeck(entry) && entry.deck?.length ? (
            <div className="mt-3">
              <div className="mb-1 text-center text-[11px] font-bold tracking-widest text-ink-subtle">DECK</div>
              <DeckView deck={entry.deck} className="text-sm" />
            </div>
          ) : null}

          {(rankIdx >= 0 || awards.length > 0) && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {rankIdx >= 0 && <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">第 {rankIdx + 1} 名</span>}
              {awards.map((a) => (
                <span key={a.key} className="rounded-full bg-gold/10 px-3 py-1 text-sm font-black text-gold">
                  <AwardTitle award={a} />
                </span>
              ))}
            </div>
          )}

          {s ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="勝" value={s.wins} className="text-primary" />
                <Stat label="敗" value={s.losses} className="text-accent" />
                <Stat label="得分" value={s.pointsFor} className="text-gold" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {FINISH_TYPES.map((f) => (
                  <div key={f} className={`rounded-lg py-1.5 text-on ${FINISH_LABELS[f].color}`}>
                    <div className="font-display text-xl">{s.finishes[f]}</div>
                    <div className="text-[10px] font-bold">
                      <Icon name={f} className="mr-0.5" />
                      {FINISH_LABELS[f].name}
                    </div>
                  </div>
                ))}
              </div>
              <h2 className="mb-2 mt-4 text-sm font-bold text-ink-muted">成就徽章（{achievements[id]?.length ?? 0} / {ACHIEVEMENTS.length}）</h2>
              <BadgeGrid keys={achievements[id] ?? []} />
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-ink-muted">比賽開始後，這裡會出現戰績與成就徽章。</p>
          )}
        </div>
      </div>

      <NextUpBanner entryId={id} />

      {played.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-bold text-ink-muted">對戰紀錄</h2>
          <div className="space-y-2">
            {played.map((m) => (
              <MatchCard key={m.id} match={m} entryById={entryById} />
            ))}
          </div>
        </Card>
      )}

      <div className="text-center">
        <Link to="/players" className="text-sm text-primary underline">
          ← 參賽名單
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl bg-raised py-2">
      <div className={`font-display text-3xl ${className}`}>{value}</div>
      <div className="text-xs font-bold text-ink-muted">{label}</div>
    </div>
  );
}
