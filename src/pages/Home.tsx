import { Link, Navigate } from 'react-router-dom';
import { LiveMatches } from '../components/bracket/LiveMatch';
import { Button, Card } from '../components/ui';
import { classifyEntries, isRegistrationOpen } from '../engine/registration';
import { estimateMatchCount } from '../engine/scheduler';
import { FINISH_LABELS, FINISH_TYPES, STATUS_LABELS } from '../lib/defaults';
import { formatCountdown, formatDateTime, formatTime } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';

export default function Home() {
  const { event: ev, entries, bracket, entryById } = useReadyEvent();
  const now = useNow();
  if (ev.status === 'finished') return <Navigate to="/results" replace />;

  const c = classifyEntries(entries, ev.capacity, ev.waitlistCapacity);
  const regOpen = isRegistrationOpen(ev, now);
  const full = c.confirmed.length + c.waitlist.length >= ev.capacity + ev.waitlistCapacity;

  // 預計結束時間：賽程產生後依實際場數；之前報名中以正取名額估計，截止後以實際正取人數估計
  const expected = ev.status === 'draft' || ev.status === 'open' ? ev.capacity : c.confirmed.length;
  const matchCount = bracket ? bracket.matches.filter((m) => !m.isBye).length : estimateMatchCount(Math.max(expected, 2));
  const endAt = ev.startAt + Math.ceil(matchCount / ev.rules.arenaCount) * ev.rules.minutesPerMatch * 60000;

  return (
    <div className="space-y-4">
      <section className="pt-6 text-center">
        <div className="animate-spin-slow inline-block text-6xl">🌀</div>
        <h1 className="neon-text mt-3 text-3xl font-black leading-tight">{ev.title}</h1>
        {ev.subtitle && <p className="mt-1 text-slate-300">{ev.subtitle}</p>}
        <div className="mt-2 inline-block rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold text-fuchsia-200">{STATUS_LABELS[ev.status]}</div>
      </section>

      {ev.announcement && (
        <Card className="border-amber-500/50 bg-amber-950/40">
          <div className="text-xs font-bold text-amber-300">📢 公告</div>
          <p className="mt-1 whitespace-pre-wrap text-amber-50">{ev.announcement}</p>
        </Card>
      )}

      {ev.status === 'running' && bracket && (
        <div className="space-y-2">
          <LiveMatches bracket={bracket} entryById={entryById} />
          <Link to="/bracket">
            <Button variant="neon" className="mt-2 w-full">
              看完整對戰表 ⚔️
            </Button>
          </Link>
        </div>
      )}

      <Card className="space-y-2">
        <InfoRow icon="📅" label="比賽時間" value={formatDateTime(ev.startAt)} />
        <InfoRow icon="⏱️" label="預計結束" value={`約 ${formatTime(endAt)}`} />
        <InfoRow icon="📍" label="地點" value={ev.locationHint} />
        <InfoRow icon="🧒" label="報名資格" value="不限同學、不限年級，兄弟姊妹也歡迎" />
      </Card>

      {(ev.status === 'open' || ev.status === 'draft') && (
        <Card className="text-center">
          {regOpen ? (
            <>
              <div className="text-sm text-slate-400">報名截止倒數</div>
              <div className="font-display neon-text mt-1 text-2xl text-cyan-200">{formatCountdown(ev.registerDeadline - now)}</div>
              <div className="mt-1 text-xs text-slate-500">截止：{formatDateTime(ev.registerDeadline)}</div>
            </>
          ) : (
            <div className="text-slate-300">{ev.status === 'draft' ? '即將開放報名，敬請期待！' : '報名已截止'}</div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="正取" value={`${c.confirmed.length} / ${ev.capacity}`} />
            <Stat label="候補" value={`${c.waitlist.length} / ${ev.waitlistCapacity}`} />
          </div>
          {regOpen && (
            <Link to="/register">
              <Button variant="neon" className="mt-4 w-full py-4 text-lg" disabled={full}>
                {full ? '名額已滿' : c.confirmed.length >= ev.capacity ? '我要報名（候補）' : '我要報名 🚀'}
              </Button>
            </Link>
          )}
        </Card>
      )}

      {ev.status === 'closed' && (
        <Card className="text-center">
          <div className="text-lg font-bold">報名已截止，比賽當天見！</div>
          <div className="mt-1 text-sm text-slate-400">正取 {c.confirmed.length} 位選手</div>
          <div className="font-display neon-text mt-2 text-xl text-cyan-200">開賽倒數 {formatCountdown(ev.startAt - now)}</div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-bold">比賽規則摘要（Beyblade X）</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>• 先得 {ev.rules.pointsToWin} 分的人獲勝</li>
          {FINISH_TYPES.map((f) => (
            <li key={f}>
              • {FINISH_LABELS[f].name} Finish（{FINISH_LABELS[f].desc}）：{ev.rules.finishPoints[f]} 分
            </li>
          ))}
        </ul>
        <Link to="/rules" className="mt-2 inline-block text-sm text-cyan-300 underline">
          完整規則 →
        </Link>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/80 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-mono text-xl font-black">{value}</div>
    </div>
  );
}
