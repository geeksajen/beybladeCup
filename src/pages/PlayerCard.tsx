import { Link, useParams } from 'react-router-dom';
import { BadgeGrid, useAchievements } from '../components/Achievements';
import { MatchCard } from '../components/bracket/MatchCard';
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
  const entry = entryById.get(id);

  if (entriesLoaded && (!entry || entry.status === 'cancelled')) {
    return (
      <div className="pt-10 text-center">
        <div className="text-5xl">🌀</div>
        <p className="mt-3 text-slate-700">找不到這位選手。</p>
        <Link to="/players" className="mt-3 inline-block text-cyan-700 underline">
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
      <div className="rounded-[2rem] bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 p-1.5 shadow-[0_8px_30px_rgba(217,70,239,0.3)]">
        <div className="rounded-[1.6rem] bg-white px-5 pb-5 pt-4">
          <div className="flex items-center justify-between text-[11px] font-bold tracking-widest text-slate-400">
            <span>BEYBLADE CUP</span>
            <span className="truncate pl-2">{ev.title}</span>
          </div>
          <div className="mt-2 text-center">
            <div className="text-8xl leading-none">{entry.emoji ?? '🌀'}</div>
            <h1 className="neon-text mt-2 text-3xl font-black">{entry.nickname}</h1>
            {entry.beyName && <div className="mt-1 font-bold text-fuchsia-700">🌀 {entry.beyName}</div>}
            {entry.grade && <div className="text-sm text-slate-500">{entry.grade}</div>}
          </div>

          {(rankIdx >= 0 || awards.length > 0) && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {rankIdx >= 0 && <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-black text-cyan-900">第 {rankIdx + 1} 名</span>}
              {awards.map((a) => (
                <span key={a.key} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">
                  {a.label}
                </span>
              ))}
            </div>
          )}

          {s ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="勝" value={s.wins} className="text-cyan-700" />
                <Stat label="敗" value={s.losses} className="text-fuchsia-700" />
                <Stat label="得分" value={s.pointsFor} className="text-amber-600" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {FINISH_TYPES.map((f) => (
                  <div key={f} className={`rounded-lg py-1.5 text-white ${FINISH_LABELS[f].color}`}>
                    <div className="font-display text-xl">{s.finishes[f]}</div>
                    <div className="text-[10px] font-bold">{FINISH_LABELS[f].name}</div>
                  </div>
                ))}
              </div>
              <h2 className="mb-2 mt-4 text-sm font-bold text-slate-600">成就徽章（{achievements[id]?.length ?? 0} / {ACHIEVEMENTS.length}）</h2>
              <BadgeGrid keys={achievements[id] ?? []} />
            </>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-500">比賽開始後，這裡會出現戰績與成就徽章。</p>
          )}
        </div>
      </div>

      <NextUpBanner entryId={id} />

      {played.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-bold text-slate-600">對戰紀錄</h2>
          <div className="space-y-2">
            {played.map((m) => (
              <MatchCard key={m.id} match={m} entryById={entryById} />
            ))}
          </div>
        </Card>
      )}

      <div className="text-center">
        <Link to="/players" className="text-sm text-cyan-700 underline">
          ← 參賽名單
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl bg-slate-100 py-2">
      <div className={`font-display text-3xl ${className}`}>{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
