import type { EntryDoc } from '../types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）${hh}:${mm}`;
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** <input type="datetime-local"> 用的值。 */
export function toLocalInput(ms: number | null): string {
  if (ms == null) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0 秒';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} 天 ${h} 小時 ${m} 分`;
  if (h > 0) return `${h} 小時 ${m} 分 ${sec} 秒`;
  return `${m} 分 ${sec} 秒`;
}

/** 純文字用的選手名稱（對話框、標題字串）；畫面上要帶頭像用 components/avatars 的 PlayerName。 */
export function displayName(e: EntryDoc | undefined): string {
  return e?.nickname ?? '？';
}

/** 尚未決定的淘汰賽位置：顯示來源說明。 */
export function describeSource(src: string | undefined): string {
  if (!src) return '輪空';
  const [kind, ref, n] = src.split(':');
  if (kind === 'group') return `${ref} 組第 ${n} 名`;
  if (kind === 'winner') return `${matchLabel(ref)} 勝者`;
  if (kind === 'loser') return `${matchLabel(ref)} 敗者`;
  return '待定';
}

export function matchLabel(id: string): string {
  if (id === 'KO-F') return '決賽';
  if (id === 'KO-3RD') return '季軍戰';
  const g = id.match(/^G-([A-Z])-(\d+)$/);
  if (g) return `${g[1]} 組 第 ${g[2]} 場`;
  const k = id.match(/^KO-(SF|QF|R\d+)-(\d+)$/);
  if (k) {
    const name = k[1] === 'SF' ? '準決賽' : k[1] === 'QF' ? '八強' : `${k[1].slice(1)} 強`;
    return `${name} ${k[2]}`;
  }
  return id;
}

export function roundLabel(size: number): string {
  if (size === 2) return '決賽';
  if (size === 4) return '準決賽';
  if (size === 8) return '八強';
  return `${size} 強`;
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent);
}
