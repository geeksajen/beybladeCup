import { Card } from '../components/ui';
import { FINISH_LABELS, FINISH_TYPES } from '../lib/defaults';
import { useReadyEvent } from '../providers/EventProvider';

export default function Rules() {
  const { event: ev } = useReadyEvent();
  const r = ev.rules;
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-black">比賽規則</h1>
      <p className="text-sm text-slate-400">以 Beyblade X 官方規則為基礎，簡化給小朋友。</p>

      <Card>
        <h2 className="mb-2 font-bold text-cyan-300">得分方式</h2>
        <table className="w-full text-sm">
          <tbody>
            {FINISH_TYPES.map((f) => (
              <tr key={f} className="border-t border-slate-800 first:border-0">
                <td className="py-2 font-bold">{FINISH_LABELS[f].name} Finish</td>
                <td className="py-2 text-slate-300">{FINISH_LABELS[f].desc}</td>
                <td className="py-2 text-right font-mono text-lg font-black text-cyan-300">{r.finishPoints[f]}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-800">
              <td className="py-2 font-bold">平手</td>
              <td className="py-2 text-slate-300">同時停止／同時出場</td>
              <td className="py-2 text-right text-sm text-slate-400">重打</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm">
          一場對戰<b>先得 {r.pointsToWin} 分</b>的人獲勝。
        </p>
        {r.launchErrorPenalty && <p className="mt-1 text-sm text-slate-300">發射失誤：第一次警告，同一場第二次起每次判對方 +1 分。</p>}
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-fuchsia-300">賽制</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>• 4～6 人：單循環，每個人都會和其他每個人比一場。</li>
          <li>• 7 人以上：先分組循環（每組 3～4 人），每組前 2 名進入淘汰賽。</li>
          <li>• 每個人至少會比 2～3 場，不會一場就出局！</li>
          {r.thirdPlaceMatch && <li>• 準決賽輸的兩位再比一場季軍戰。</li>}
          <li>• 淘汰賽人數不足時，分組第一名可能輪空直接晉級。</li>
        </ul>
        <h3 className="mb-1 mt-3 text-sm font-bold">分組名次比較順序</h3>
        <ol className="list-inside list-decimal space-y-0.5 text-sm text-slate-300">
          <li>勝場數</li>
          <li>總得分 − 總失分</li>
          <li>總得分</li>
          <li>兩人對戰結果</li>
          <li>仍相同：現場加賽一局</li>
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-amber-300">獎項</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>🏆 冠軍、🥈 亞軍、🥉 季軍</li>
          <li>🔥 Xtreme 王：Xtreme Finish 次數最多</li>
          <li>💥 爆裂王：Burst Finish 次數最多</li>
          <li>🌀 最佳陀螺命名</li>
          <li>🎖️ 全員參加獎：每位參賽者都有！</li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold">注意事項</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>• 請準時報到，未報到的選手不會排入賽程。</li>
          <li>• 沒有陀螺或發射器的小朋友，報名時勾選「需要借」。</li>
          <li>• 友誼第一、比賽第二，輸了也要跟對手握手 🤝</li>
        </ul>
      </Card>
    </div>
  );
}
