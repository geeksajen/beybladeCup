import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reloadToLatest, useUpdateAvailable } from '../lib/versionCheck';

/**
 * 使用中發現新版本：一般頁面顯示提示，讓使用者自己決定何時更新（避免打斷填表或計分）；
 * 大螢幕沒有人操作，直接重新載入。
 */
export function UpdateBanner() {
  const available = useUpdateAvailable();
  const { pathname } = useLocation();
  const isScreen = pathname === '/screen';

  useEffect(() => {
    if (available && isScreen) reloadToLatest();
  }, [available, isScreen]);

  if (!available || isScreen) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-2">
      <button
        type="button"
        onClick={reloadToLatest}
        className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on shadow-lg"
      >
        網站有新版本，點這裡更新 ↻
      </button>
    </div>
  );
}
