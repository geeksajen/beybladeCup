import { awardIcon } from '../components/AwardTitle';
import { Icon } from '../components/icons';
import { Card } from '../components/ui';
import { FINISH_LABELS, FINISH_TYPES } from '../lib/defaults';
import { CATALOG_SOURCE } from '../lib/parts';
import { useReadyEvent } from '../providers/EventProvider';

export default function Rules() {
  const { event: ev } = useReadyEvent();
  const r = ev.rules;
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-black">比賽規則</h1>
      <p className="text-sm text-ink-muted">以 Beyblade X 官方規則為基礎，簡化給小朋友。</p>

      <Card>
        <h2 className="mb-2 font-bold text-primary">得分方式</h2>
        <table className="w-full text-sm">
          <tbody>
            {FINISH_TYPES.map((f) => (
              <tr key={f} className="border-t border-line first:border-0">
                <td className="py-2 font-bold">
                  <Icon name={f} className={`mr-1.5 ${FINISH_LABELS[f].text}`} />
                  {FINISH_LABELS[f].name} Finish
                </td>
                <td className="py-2 text-ink">{FINISH_LABELS[f].desc}</td>
                <td className="py-2 text-right font-mono text-lg font-black text-primary">{r.finishPoints[f]}</td>
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="py-2 font-bold">平手</td>
              <td className="py-2 text-ink">同時停止／同時出場</td>
              <td className="py-2 text-right text-sm text-ink-muted">重打</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm">
          一場對戰<b>先得 {r.pointsToWin} 分</b>的人獲勝。
        </p>
        {r.launchErrorPenalty && <p className="mt-1 text-sm text-ink">發射失誤：第一次警告，同一場第二次起每次判對方 +1 分。</p>}
      </Card>

      {(r.deckSize ?? 3) === 3 ? (
        <Card>
          <h2 className="mb-2 font-bold text-primary">3on3 對戰</h2>
          <ul className="space-y-1 text-sm text-ink">
            <li>• 每位選手帶 <b>3 顆</b>陀螺（一組 Deck），報到時登錄，比賽開始後整場固定。</li>
            <li>• 每場開打前，可以重新決定 3 顆的<b>出場順序</b>（小聲告訴主辦）。</li>
            <li>• 第 1 局雙方用第 1 顆、第 2 局用第 2 顆、第 3 局用第 3 顆；還沒分出勝負就從第 1 顆重新輪。</li>
            <li>• 平手、發射失誤重新發射時，用同一顆再打一次。</li>
            <li>• 正式規則同一組 Deck 的 Blade、Ratchet、Bit 不能重複；零件不夠的小朋友可以跟主辦說。</li>
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-bold text-accent">賽制</h2>
        <ul className="space-y-1 text-sm text-ink">
          <li>• 4～6 人：單循環，每個人都會和其他每個人比一場。</li>
          <li>• 7 人以上：先分組循環（每組 3～4 人），每組前 2 名進入淘汰賽。</li>
          <li>• 每個人至少會比 2～3 場，不會一場就出局！</li>
          {r.thirdPlaceMatch && <li>• 準決賽輸的兩位再比一場季軍戰。</li>}
          <li>• 淘汰賽人數不足時，分組第一名可能輪空直接晉級。</li>
        </ul>
        <h3 className="mb-1 mt-3 text-sm font-bold">分組名次比較順序</h3>
        <ol className="list-inside list-decimal space-y-0.5 text-sm text-ink">
          <li>勝場數</li>
          <li>總得分 − 總失分</li>
          <li>總得分</li>
          <li>兩人對戰結果</li>
          <li>仍相同：現場加賽一局</li>
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-gold">獎項</h2>
        <ul className="space-y-1.5 text-sm text-ink">
          {AWARD_LINES.map(([key, text]) => (
            <li key={key}>
              <Icon name={awardIcon(key).icon} className={`mr-1.5 ${awardIcon(key).color}`} />
              {text}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold">注意事項</h2>
        <ul className="space-y-1 text-sm text-ink">
          <li>• 請準時報到，未報到的選手不會排入賽程。</li>
          <li>• 沒有陀螺或發射器的小朋友，報名時勾選「需要借」。</li>
          <li>• 友誼第一、比賽第二，輸了也要跟對手握手 <Icon name="handshake" className="text-gold" /></li>
        </ul>
      </Card>
      <p className="pb-4 text-center text-[11px] text-ink-subtle">
        零件資料來源：
        <a href={CATALOG_SOURCE.url} target="_blank" rel="noreferrer" className="underline">
          Beydex
        </a>
        （{CATALOG_SOURCE.commitDate || CATALOG_SOURCE.syncedAt} 版）・中文名稱依台灣代理版（參考
        <a href="https://beybladehub.app/parts/blades" target="_blank" rel="noreferrer" className="underline">
          BeybladeHub
        </a>
        ），少數為暫譯
      </p>
    </div>
  );
}

const AWARD_LINES: [string, string][] = [
  ['champion', '冠軍'],
  ['runnerUp', '亞軍'],
  ['third', '季軍'],
  ['xtreme', 'Xtreme 王：Xtreme Finish 次數最多'],
  ['burst', '爆裂王：Burst Finish 次數最多'],
  ['bestName', '最佳陀螺命名'],
  ['participation', '全員參加獎：每位參賽者都有！'],
];
