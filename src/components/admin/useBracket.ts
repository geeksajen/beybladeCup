import { refreshBracket } from '../../engine/advance';
import { useReadyEvent } from '../../providers/EventProvider';
import type { BracketDoc } from '../../types';
import { useAction } from '../ui';

/**
 * 修改賽程的共用流程：transaction 讀最新版 → 套用純函式 → 重新計算晉級與目前場次 → 寫回。
 * 網路中斷時會顯示錯誤，主辦可以再按一次重試。
 */
export function useBracketMutation() {
  const { store, event } = useReadyEvent();
  const action = useAction();
  const mutate = (fn: (b: BracketDoc) => BracketDoc) =>
    action.run(() => store.mutateBracket((cur) => (cur ? refreshBracket(fn(cur), event.rules.arenaCount) : cur)));
  return { ...action, mutate };
}
