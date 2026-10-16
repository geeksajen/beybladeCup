import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GroupTable } from '../components/bracket/GroupTable';
import { KnockoutTree } from '../components/bracket/KnockoutTree';
import { LiveMatches, upcomingMatches } from '../components/bracket/LiveMatch';
import { MatchCard } from '../components/bracket/MatchCard';
import { Card } from '../components/ui';
import { useReadyEvent } from '../providers/EventProvider';

export default function BracketPage() {
  const { bracket, entryById, event: ev } = useReadyEvent();
  const [showAll, setShowAll] = useState(false);

  if (!bracket) {
    return (
      <div className="pt-10 text-center">
        <div className="text-5xl">⚔️</div>
        <p className="mt-3 text-slate-700">比賽當天報到完成後，主辦會抽籤產生對戰表。</p>
      </div>
    );
  }

  const upcoming = upcomingMatches(bracket, 4);
  const hasKo = bracket.matches.some((m) => m.stage === 'knockout');
  const all = [...bracket.matches].filter((m) => !m.isBye).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-2xl font-black">對戰表</h1>
      <Link to="/meta" className="block rounded-xl bg-cyan-50 px-3 py-2 text-center text-sm font-bold text-cyan-800">
        📊 Meta 強勢榜：大家都用什麼零件？ →
      </Link>
      {ev.predictionsOpen && (
        <Link to="/predict" className="block rounded-xl bg-fuchsia-50 px-3 py-2 text-center text-sm font-bold text-fuchsia-800">
          🔮 猜冠軍投票開放中 →
        </Link>
      )}
      {bracket.currentMatchIds.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-fuchsia-700">● 目前場次</h2>
          <LiveMatches bracket={bracket} entryById={entryById} />
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-600">接下來</h2>
          <div className="grid grid-cols-2 gap-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} entryById={entryById} />
            ))}
          </div>
        </section>
      )}
      {bracket.groups.length > 0 && bracket.format !== 'knockout' && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-600">{bracket.format === 'roundRobin' ? '積分表' : '分組積分'}</h2>
          {bracket.groups.map((g) => (
            <GroupTable key={g.id} bracket={bracket} group={g} entryById={entryById} />
          ))}
        </section>
      )}
      {hasKo && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-600">淘汰賽</h2>
          <KnockoutTree bracket={bracket} entryById={entryById} />
        </section>
      )}
      <Card>
        <button type="button" className="w-full text-left font-bold" onClick={() => setShowAll(!showAll)}>
          全部場次（{all.filter((m) => m.status === 'done').length}/{all.length}）{showAll ? '▲' : '▼'}
        </button>
        {showAll && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {all.map((m) => (
              <MatchCard key={m.id} match={m} entryById={entryById} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
