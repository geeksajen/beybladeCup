import { Link } from 'react-router-dom';
import { Confetti } from '../components/fx/Confetti';
import { Card } from '../components/ui';
import { displayName } from '../lib/format';
import { useReadyEvent } from '../providers/EventProvider';
import type { Award, BracketDoc, EntryDoc } from '../types';

export function ResultsView({ bracket, entryById, title, big }: { bracket: BracketDoc; entryById: Map<string, EntryDoc>; title: string; big?: boolean }) {
  const awards = bracket.awards ?? [];
  const find = (key: string) => awards.find((a) => a.key === key)?.entryIds ?? [];
  const podium = [
    { key: 'runnerUp', ids: find('runnerUp'), label: '🥈', h: big ? 'h-40' : 'h-24', color: 'from-slate-300 to-slate-500' },
    { key: 'champion', ids: find('champion'), label: '🏆', h: big ? 'h-56' : 'h-32', color: 'from-amber-300 to-amber-600' },
    { key: 'third', ids: find('third'), label: '🥉', h: big ? 'h-28' : 'h-16', color: 'from-orange-400 to-orange-700' },
  ];
  const others = awards.filter((a) => !['champion', 'runnerUp', 'third'].includes(a.key) && a.entryIds.length > 0);
  const participants = bracket.playerIds;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className={`neon-text font-black ${big ? 'text-6xl' : 'text-3xl'}`}>{title}</h1>
        <p className={`mt-1 text-slate-700 ${big ? 'text-2xl' : ''}`}>最終成績</p>
      </div>
      <div className="flex items-end justify-center gap-2">
        {podium.map((p) => (
          <div key={p.key} className="flex flex-1 flex-col items-center">
            <div className={`animate-pop mb-2 text-center ${big ? 'text-3xl' : 'text-base'}`}>
              {p.ids.map((id) => (
                <div key={id} className="font-black">
                  {displayName(entryById.get(id))}
                </div>
              ))}
            </div>
            <div className={`flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b pt-2 ${p.h} ${p.color} ${big ? 'text-6xl' : 'text-3xl'}`}>{p.label}</div>
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
      <Card>
        <h2 className={`mb-2 font-bold text-amber-700 ${big ? 'text-3xl' : ''}`}>🎖️ 全員參加獎</h2>
        <div className={`flex flex-wrap gap-2 ${big ? 'text-2xl' : 'text-sm'}`}>
          {participants.map((id) => (
            <span key={id} className="rounded-full bg-slate-200 px-3 py-1 font-semibold">
              {displayName(entryById.get(id))}
            </span>
          ))}
        </div>
        <p className={`mt-3 text-slate-600 ${big ? 'text-xl' : 'text-xs'}`}>謝謝每一位勇敢上場的選手！</p>
      </Card>
    </div>
  );
}

function AwardCard({ award, entryById, big }: { award: Award; entryById: Map<string, EntryDoc>; big?: boolean }) {
  return (
    <Card className="text-center">
      <div className={`font-bold text-fuchsia-700 ${big ? 'text-3xl' : 'text-lg'}`}>{award.label}</div>
      {award.entryIds.map((id) => (
        <div key={id} className={`mt-1 font-black ${big ? 'text-3xl' : 'text-xl'}`}>
          {displayName(entryById.get(id))}
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
        <div className="text-5xl">🏆</div>
        <p className="mt-3 text-slate-700">比賽結束後會在這裡公布結果。</p>
        <Link to="/bracket" className="mt-3 inline-block text-cyan-700 underline">
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
