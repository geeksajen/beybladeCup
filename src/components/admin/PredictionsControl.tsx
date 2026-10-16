import { validPredictions } from '../../engine/predictions';
import { usePredictions, useReadyEvent } from '../../providers/EventProvider';
import { Button, Card, ErrorText, useAction } from '../ui';

/** 計分分頁上方：開放／截止猜冠軍投票。 */
export function PredictionsControl() {
  const { event: ev, bracket, store } = useReadyEvent();
  const preds = usePredictions();
  const { busy, error, run } = useAction();
  const open = !!ev.predictionsOpen;
  const count = bracket ? validPredictions(preds, bracket.playerIds).length : preds.length;
  if (ev.status === 'finished') return null;

  return (
    <Card className={open ? 'border-fuchsia-400' : ''}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔮</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">猜冠軍：{open ? <span className="text-fuchsia-700">投票開放中</span> : '未開放'}</div>
          <div className="text-xs text-slate-600">已有 {count} 票・建議抽籤後開放，淘汰賽開打前截止</div>
        </div>
        <Button
          variant={open ? 'secondary' : 'primary'}
          className="shrink-0 text-sm"
          disabled={busy}
          onClick={() => {
            if (open && !confirm('截止猜冠軍投票？之後選手就不能再改票。')) return;
            void run(() => store.updateEvent({ predictionsOpen: !open }));
          }}
        >
          {open ? '截止投票' : '開放投票'}
        </Button>
      </div>
      <a href="#/predict" target="_blank" rel="noreferrer" className="mt-2 block text-xs text-cyan-700 underline">
        開啟投票頁（可以在這台裝置替小孩代投）
      </a>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
