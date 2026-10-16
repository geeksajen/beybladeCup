import { playerNextUp } from '../engine/player';
import { displayName, matchLabel } from '../lib/format';
import { useReadyEvent } from '../providers/EventProvider';

/** 「下一場是你！」：選手目前的比賽狀態（只在比賽中、且這位選手有參賽時顯示）。 */
export function NextUpBanner({ entryId }: { entryId: string }) {
  const { event: ev, bracket, entryById } = useReadyEvent();
  if (!bracket || ev.status !== 'running' || !bracket.playerIds.includes(entryId)) return null;
  const n = playerNextUp(bracket, entryId, ev.rules);
  const opponentOf = (m: { p1?: string; p2?: string }) => {
    const opp = m.p1 === entryId ? m.p2 : m.p1;
    return opp ? displayName(entryById.get(opp)) : '待定';
  };

  if (n.kind === 'live') {
    return (
      <div className="animate-pulse rounded-xl bg-fuchsia-600 px-3 py-2 text-center font-bold text-white">
        ⚔️ 比賽中！{n.match.arena ? `${n.match.arena} 號戰鬥盤・` : ''}對手：{opponentOf(n.match)}
      </div>
    );
  }
  if (n.kind === 'next' && n.onDeck) {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-center">
        <div className="text-lg font-black text-amber-800">📣 下一場就是你！請到戰鬥盤旁準備</div>
        <div className="text-sm text-amber-900">
          {matchLabel(n.match.id)}・對手：{opponentOf(n.match)}
        </div>
      </div>
    );
  }
  if (n.kind === 'next') {
    return (
      <div className="rounded-xl bg-cyan-50 px-3 py-2 text-center text-sm text-cyan-900">
        <div>
          下一場：<b>{matchLabel(n.match.id)}</b>・對手：{opponentOf(n.match)}
        </div>
        <div>
          前面還有 <b>{n.ahead}</b> 場，大約 {n.etaMinutes} 分鐘後
        </div>
      </div>
    );
  }
  if (n.kind === 'waiting') {
    return <div className="rounded-xl bg-slate-100 px-3 py-2 text-center text-sm text-slate-700">⏳ 分組賽結束後，就知道有沒有晉級淘汰賽</div>;
  }
  return <div className="rounded-xl bg-slate-100 px-3 py-2 text-center text-sm text-slate-700">🎖️ 今天的比賽都打完了，辛苦了！</div>;
}
