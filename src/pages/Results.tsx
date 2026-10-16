import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { BadgeIcons, useAchievements } from '../components/Achievements';
import { AwardTitle } from '../components/AwardTitle';
import { Confetti } from '../components/fx/Confetti';
import { Icon, type IconName } from '../components/icons';
import { MetaHighlights } from '../components/MetaHighlights';
import { computeMeta } from '../engine/meta';
import { Card } from '../components/ui';
import { useReadyEvent } from '../providers/EventProvider';
import type { Award, BracketDoc, EntryDoc } from '../types';
import { PlayerName } from '../components/avatars';

export function ResultsView({ bracket, entryById, title, big }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; title: string; big?: boolean }) {
  const awards = bracket.awards ?? [];
  const find = (key: string) => awards.find((a) => a.key === key)?.entryIds ?? [];
  const podium: { key: string; ids: string[]; icon: IconName; h: string; color: string }[] = [
    { key: 'runnerUp', ids: find('runnerUp'), icon: 'medal', h: big ? 'h-40' : 'h-24', color: 'from-silver to-silver/40' },
    { key: 'champion', ids: find('champion'), icon: 'trophy', h: big ? 'h-56' : 'h-32', color: 'from-gold to-gold/40' },
    { key: 'third', ids: find('third'), icon: 'medal', h: big ? 'h-28' : 'h-16', color: 'from-bronze to-bronze/40' },
  ];
  const others = awards.filter((a) => !['champion', 'runnerUp', 'third'].includes(a.key) && a.entryIds.length > 0);
  const participants = bracket.playerIds;
  const achievements = useAchievements();
  const meta = useMemo(() => computeMeta(bracket), [bracket]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className={`neon-text font-black ${big ? 'text-6xl' : 'text-3xl'}`}>{title}</h1>
        <p className={`mt-1 text-ink ${big ? 'text-2xl' : ''}`}>最終成績</p>
      </div>
      <div className="flex items-end justify-center gap-2">
        {podium.map((p) => (
          <div key={p.key} className="flex flex-1 flex-col items-center">
            <div className={`animate-pop mb-2 text-center ${big ? 'text-3xl' : 'text-base'}`}>
              {p.ids.map((id) => (
                <div key={id} className="font-black">
                  <PlayerName entry={entryById.get(id)} />
                </div>
              ))}
            </div>
            <div className={`flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-2 ${p.h} ${p.color} text-on ${big ? 'text-6xl' : 'text-3xl'}`}>
              <Icon name={p.icon} />
            </div>
          </div>
        ))}
      </div>
      {others.length > 0 && (
        <div className={`grid gap-3 ${big ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {others.map((a) => (
            <AwardCard key={a.key} award={a} entryById={entryById} big={big} />
          ))}
        </div>
      )}
      {!big && meta.battles > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-primary">
            <Icon name="chart" className="mr-1" />
            本次大賽 Meta
          </h2>
          <MetaHighlights meta={meta} entryById={entryById} />
          <Link to="/meta" className="mt-2 inline-block text-sm text-primary underline">
            看完整 Meta 強勢榜 →
          </Link>
        </Card>
      )}
      <Card>
        <h2 className={`mb-2 font-bold text-gold ${big ? 'text-3xl' : ''}`}>
          <Icon name="rosette" className="mr-1" />
          全員參加獎
        </h2>
        <div className={`flex flex-wrap gap-2 ${big ? 'text-2xl' : 'text-sm'}`}>
          {participants.map((id) =>
            big ? (
              <span key={id} className="rounded-full bg-raised px-3 py-1 font-semibold">
                <PlayerName entry={entryById.get(id)} /> <BadgeIcons keys={achievements[id]} />
              </span>
            ) : (
              <Link key={id} to={`/player/${id}`} className="rounded-full bg-raised px-3 py-1 font-semibold active:bg-line">
                <PlayerName entry={entryById.get(id)} /> <BadgeIcons keys={achievements[id]} />
              </Link>
            ),
          )}
        </div>
        <p className={`mt-3 text-ink-muted ${big ? 'text-xl' : 'text-xs'}`}>謝謝每一位勇敢上場的選手！{!big && '點名字可以看自己的選手卡。'}</p>
      </Card>
    </div>
  );
}

function AwardCard({ award, entryById, big }: { award: Award; entryById: Map<string, EntryDoc>; big?: boolean }) {
  return (
    <Card className="text-center">
      <AwardTitle award={award} className={`font-bold text-ink ${big ? 'text-3xl' : 'text-lg'}`} />
      {award.entryIds.map((id) => (
        <div key={id} className={`mt-1 font-black ${big ? 'text-3xl' : 'text-xl'}`}>
          <PlayerName entry={entryById.get(id)} />
        </div>
      ))}
    </Card>
  );
}

export default function Results() {
  const { event: ev, bracket, entryById } = useReadyEvent();
  if (ev.status !== 'finished' || !bracket?.awards) {
    return (
      <div className="pt-10 text-center">
        <Icon name="trophy" className="text-5xl text-gold" />
        <p className="mt-3 text-ink">比賽結束後會在這裡公布結果。</p>
        <Link to="/bracket" className="mt-3 inline-block text-primary underline">
          看對戰表
        </Link>
      </div>
    );
  }
  return (
    <div className="pt-4">
      <Confetti />
      <ResultsView bracket={bracket} entryById={entryById} title={ev.title} />
    </div>
  );
}
