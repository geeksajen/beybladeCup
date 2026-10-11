import { useEffect, useState } from 'react';

/**
 * 新版本偵測。
 * GitHub Pages 對所有檔案都回 Cache-Control: max-age=600 且無法修改，
 * 部署後瀏覽器可能還拿著舊的 index.html。這裡用不經快取的方式抓最新的 index.html，
 * 比對它引用的主程式檔名（含內容雜湊）和目前執行中的是否相同。
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** 目前執行中的主程式檔名，例如 index-D9G8jhRw.js（開發模式為 undefined）。 */
function currentBundle(): string | undefined {
  if (import.meta.env.DEV) return undefined;
  return import.meta.url.match(/assets\/(index-[^/?#]+\.js)/)?.[1];
}

async function latestBundle(): Promise<string | undefined> {
  const res = await fetch(`${import.meta.env.BASE_URL}index.html?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return undefined;
  return (await res.text()).match(/assets\/(index-[^"']+\.js)/)?.[1];
}

const RELOADED_AT_KEY = 'beybladeCup:reloadedAt';

/** 用新網址載入，確保拿到最新的 index.html（查詢字串讓 CDN 與瀏覽器快取都失效）。 */
export function reloadToLatest(): void {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}

/** 一分鐘內才自動重新載入過：不要再自動載入，避免部署進行中時無限重整。 */
function reloadedRecently(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0) < 60_000;
  } catch {
    return false;
  }
}

/** 重新載入後把網址上的 ?v= 拿掉，保持網址乾淨（分享出去也不會帶著）。 */
function cleanVersionParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('v')) return;
  url.searchParams.delete('v');
  window.history.replaceState(window.history.state, '', url.toString());
}

/** 有新版本時回傳 true。剛打開或切回分頁時發現新版本會直接重新載入。 */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    cleanVersionParam();
    const running = currentBundle();
    if (!running) return;
    let stopped = false;

    const check = async (reloadNow: boolean) => {
      try {
        const latest = await latestBundle();
        if (stopped || !latest || latest === running) return;
        if (reloadNow && !reloadedRecently()) reloadToLatest();
        else setAvailable(true);
      } catch {
        // 離線或網路錯誤時略過，下次再檢查
      }
    };

    void check(true);
    const timer = setInterval(() => void check(false), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return available;
}
