import { Link } from 'react-router-dom';
import { BadgeIcons, useAchievements } from '../components/Achievements';
import { Badge, Card, Spinner } from '../components/ui';
import { classifyEntries } from '../engine/registration';
import { useReadyEvent } from '../providers/EventProvider';
import type { EntryDoc } from '../types';

export default function Players() {
  const { event: ev, entries, entriesLoaded } = useReadyEvent();
  if (!entriesLoaded) return <Spinner />;
  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const showCheckIn = ev.status === 'running' || ev.status === 'finished';
  const checked = c.confirmed.filter((e) => e.checkedIn).length;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-black">參賽名單</h1>
      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-bold text-cyan-700">正取（{c.confirmed.length} / {ev.capacity}）</h2>
          {showCheckIn && <span className="text-xs text-slate-600">已報到 {checked}</span>}
        </div>
        {c.confirmed.length === 0 ? <p className="text-sm text-slate-500">還沒有人報名，快來當第一位！</p> : <PlayerList list={c.confirmed} showCheckIn={showCheckIn} />}
      </Card>
      {ev.waitlistCapacity > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-amber-700">候補（{c.waitlist.length} / {ev.waitlistCapacity}）</h2>
          {c.waitlist.length === 0 ? <p className="text-sm text-slate-500">目前沒有候補</p> : <PlayerList list={c.waitlist} showCheckIn={showCheckIn} />}
        </Card>
      )}
    </div>
  );
}

function PlayerList({ list, showCheckIn }: { list: EntryDoc[]; showCheckIn: boolean }) {
  const achievements = useAchievements();
  return (
    <ol className="space-y-1.5">
      {list.map((e, i) => (
        <li key={e.id}>
          <Link to={`/player/${e.id}`} className="flex items-center gap-3 rounded-xl bg-slate-200/60 px-3 py-2 active:bg-slate-300/60">
            <span className="w-6 text-right font-mono text-sm text-slate-500">{i + 1}</span>
            <span className="text-2xl">{e.emoji ?? '🌀'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-bold">{e.nickname}</span>
                <BadgeIcons keys={achievements[e.id]} className="shrink-0 text-sm" />
              </div>
              <div className="truncate text-xs text-slate-600">{[e.grade, e.beyName].filter(Boolean).join('・')}</div>
            </div>
            {showCheckIn && (e.checkedIn ? <Badge className="bg-emerald-500/20 text-emerald-700">已報到</Badge> : <Badge>未到</Badge>)}
            <span className="text-slate-400">›</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
