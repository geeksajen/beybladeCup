import { playerNextUp } from '../engine/player';
import { displayName, matchLabel } from '../lib/format';
import { useReadyEvent } from '../providers/EventProvider';
import { Icon } from './icons';

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
      <div className="animate-pulse rounded-xl bg-accent px-3 py-2 text-center font-bold text-on">
        <Icon name="battle" className="mr-1" />
        比賽中！{n.match.arena ? `${n.match.arena} 號戰鬥盤・` : ''}對手：{opponentOf(n.match)}
      </div>
    );
  }
  if (n.kind === 'next' && n.onDeck) {
    return (
      <div className="rounded-xl border-2 border-gold bg-gold/10 px-3 py-2 text-center">
        <div className="text-lg font-black text-gold">
          <Icon name="megaphone" className="mr-1" />
          下一場就是你！請到戰鬥盤旁準備
        </div>
        <div className="text-sm text-gold">
          {matchLabel(n.match.id)}・對手：{opponentOf(n.match)}
        </div>
      </div>
    );
  }
  if (n.kind === 'next') {
    return (
      <div className="rounded-xl bg-primary/10 px-3 py-2 text-center text-sm text-primary">
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
    return (
      <div className="rounded-xl bg-raised px-3 py-2 text-center text-sm text-ink">
        <Icon name="hourglass" className="mr-1 text-ink-muted" />
        分組賽結束後，就知道有沒有晉級淘汰賽
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-raised px-3 py-2 text-center text-sm text-ink">
      <Icon name="rosette" className="mr-1 text-gold" />
      今天的比賽都打完了，辛苦了！
    </div>
  );
}
