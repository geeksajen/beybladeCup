import type { ReactNode } from 'react';

/*
 * 自製圖示（不用 emoji、不用圖示套件）。
 * 規格：24×24、線寬 2、圓角端點；部分圖示有 22% 透明的填色（雙色調）。
 * 顏色一律跟著文字色（currentColor），大小預設 1em，跟著字級走：
 *   <Icon name="trophy" className="text-gold" />        → 跟旁邊文字一樣大
 *   <Icon name="bey" className="text-6xl text-primary" /> → 大圖示
 * 全部圖示的預覽：開發模式打開 #/icons。
 */

const T = { fill: 'currentColor', fillOpacity: 0.22 } as const;
const DOT = { fill: 'currentColor', stroke: 'none' } as const;

const ICONS = {
  /* ── 陀螺與終結方式 ── */
  bey: (
    <>
      <circle cx="12" cy="12" r="9.5" {...T} />
      {[0, 120, 240].map((r) => (
        <path key={r} d="M12 8.5c0-3 1.8-5.4 5.2-6.1" transform={`rotate(${r} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  spin: <path d="M11 12a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0" />,
  over: (
    <>
      <path d="M2.5 13.5c1 4 5 6.5 9.5 6.5s8.5-2.5 9.5-6.5" />
      <path d="M2.5 13.5h6" />
      <circle cx="9" cy="10" r="2.5" {...T} />
      <path d="M11.5 8 19 3.5M14.5 3.5H19V8" />
    </>
  ),
  burst: (
    <>
      <path d="M12 2l1.76 5.75 4.04-1.55-1.92 4.19 6.62 1.61-6.07 1.84.94 3.53-3.72-1.4L12 21.6l-1.72-5.44-4.22 1.78 1.87-4.26L1.8 12l5.86-1.8-1.18-3.72 3.91 1.64z" {...T} />
      <circle cx="12" cy="12" r="1.2" {...DOT} />
    </>
  ),
  xtreme: (
    <>
      <path d="M9 4l11 16M20 4 9 20" strokeWidth={2.6} />
      <path d="M2 8h4M3 12h4M2 16h4" />
    </>
  ),
  battle: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
      <path d="M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />
    </>
  ),

  /* ── 導覽 ── */
  home: (
    <>
      <path d="M5 9.5V20h14V9.5" {...T} />
      <path d="M3 11 12 3.5 21 11M10 20v-5.5h4V20" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" {...T} />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  bracket: <path d="M3 5h5v6H3M3 13h5v6H3M8 8h5M8 16h5M13 8v8M13 12h8" />,
  rules: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3 4.5v14c4 0 7 .5 9 2 2-1.5 5-2 9-2v-14c-4 0-7 .5-9 2z" {...T} />
      <path d="M12 6.5v14" />
    </>
  ),
  clipboard: (
    <>
      <rect x="4.5" y="4" width="15" height="17.5" rx="2" {...T} />
      <path d="M9 2.5h6v3H9zM8.5 11h7M8.5 15h4.5" />
    </>
  ),
  settings: (
    <>
      <path d="M10.21 5.03 10.66 2.59h2.68l.45 2.44 1.88.77 2.03-1.4 1.9 1.9-1.4 2.03.77 1.88 2.44.45v2.68l-2.44.45-.77 1.88 1.4 2.03-1.9 1.9-2.03-1.4-1.88.77-.45 2.44h-2.68l-.45-2.44-1.88-.77-2.03 1.4-1.9-1.9 1.4-2.03-.77-1.88-2.44-.45v-2.68l2.44-.45.77-1.88-1.4-2.03 1.9-1.9 2.03 1.4z" {...T} />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  checkin: (
    <>
      <circle cx="12" cy="12" r="9.5" {...T} />
      <path d="M7.5 12.5 10.5 15.5 16.5 9" />
    </>
  ),
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" {...T} />
      <circle cx="8.5" cy="8.5" r="1.4" {...DOT} />
      <circle cx="12" cy="12" r="1.4" {...DOT} />
      <circle cx="15.5" cy="15.5" r="1.4" {...DOT} />
    </>
  ),
  scoreboard: (
    <>
      <rect x="2" y="6" width="20" height="14" rx="2.5" {...T} />
      <path d="M8 2.5 12 6l4-3.5M12 9.5v7M6.5 10l1.5-1v7M15.5 9.5h3v6.5h-3z" />
    </>
  ),
  tv: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2.5" {...T} />
      <path d="M8 2.5 12 6l4-3.5M8 21.5h8" />
    </>
  ),

  /* ── 獎項與成就 ── */
  trophy: (
    <>
      <path d="M7 3.5h10V9a5 5 0 0 1-10 0z" {...T} />
      <path d="M7 5.5H3.5v1A3.5 3.5 0 0 0 7 10M17 5.5h3.5v1A3.5 3.5 0 0 1 17 10M12 14v3.5M8 21h8v-3.5H8z" />
    </>
  ),
  medal: (
    <>
      <path d="M7.5 2.5 11 9.5M16.5 2.5 13 9.5" />
      <circle cx="12" cy="15" r="6.5" {...T} />
      <path d="M12 12.2l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z" {...DOT} />
    </>
  ),
  rosette: (
    <>
      <path d="M9 14.5 7.5 22l4.5-2.5 4.5 2.5L15 14.5" />
      <circle cx="12" cy="9" r="6.5" {...T} />
      <circle cx="12" cy="9" r="3" />
    </>
  ),
  crystal: (
    <>
      <circle cx="12" cy="10" r="7.5" {...T} />
      <path d="M8 19.5 6.5 21.5h11L16 19.5M9.5 7a3 3 0 0 1 2.5-1.5" />
      <path d="M14.5 10.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" {...DOT} />
    </>
  ),
  star: <path d="M12 3.1l2.47 6.1 6.57.46-5.05 4.24 1.59 6.39L12 16.8l-5.58 3.49 1.59-6.39-5.05-4.24 6.57-.46z" {...T} />,
  sparkle: (
    <>
      <path d="M11 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z" {...T} />
      <path d="M19 15.5v5M16.5 18h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 20 5.5V12c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V5.5z" {...T} />
      <path d="M8.5 12h7" />
    </>
  ),
  comeback: <path d="M4 12a8 8 0 0 1 14-5.3M18.5 2.5v4.5H14M20 12a8 8 0 0 1-14 5.3M5.5 21.5V17H10" />,
  bolt: <path d="M13.5 2 4.5 13.5h7l-1 8.5 9-11.5h-7z" {...T} />,
  gem: (
    <>
      <path d="M6.5 3.5h11l4 5.5L12 21 2.5 9z" {...T} />
      <path d="M2.5 9h19M9.5 3.5 8 9l4 12 4-12-1.5-5.5" />
    </>
  ),
  master: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" {...T} />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" {...T} />
    </>
  ),
  tag: (
    <>
      <path d="M3 12.5V4a1 1 0 0 1 1-1h8.5L21 11.5 12.5 20z" {...T} />
      <circle cx="7.5" cy="7.5" r="1.6" {...DOT} />
    </>
  ),
  party: (
    <>
      <path d="M3 21 8 7l9 9z" {...T} />
      <path d="M14 2.5v2.5M19.5 9H22M17 6l1.8-1.8M11.5 7.5c1.2-1.2 1.2-2.8 0-4M16.5 12.5c1.2-1.2 2.8-1.2 4 0" />
    </>
  ),
  fire: (
    <>
      <path d="M12 22c4 0 7-2.8 7-6.8 0-4.2-3-6.2-4.2-10.7C12.5 6.5 11.5 8.6 11.6 11 10.4 10.2 9.6 9 9.4 7.2 7.2 9.4 5 12.1 5 15.2 5 19.2 8 22 12 22z" {...T} />
      <path d="M12 22c-1.7 0-3-1.3-3-3 0-2 3-4.5 3-4.5s3 2.5 3 4.5c0 1.7-1.3 3-3 3z" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="10.5" width="16" height="11" rx="2.5" {...T} />
      <path d="M8 10.5V7a4 4 0 0 1 7.6-1.8M12 14.5v3" />
    </>
  ),

  /* ── 統計 ── */
  chart: <path d="M3.5 3.5v17h17M8 16.5v-4M12.5 16.5v-9M17 16.5V10" />,
  trend: <path d="M3.5 3.5v17h17M7 15.5l4-4.5 3 3 5.5-6.5M15.5 7.5h4v4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9.5" {...T} />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.6" {...DOT} />
    </>
  ),

  /* ── 狀態與提示 ── */
  megaphone: (
    <>
      <path d="M3 9.5h3.5L15 5v14l-8.5-4.5H3z" {...T} />
      <path d="M7 14.5 8.5 20h2.5l-1-5M18.5 9a4 4 0 0 1 0 6M20.8 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9a2 2 0 0 1 3.4 0l8 13.6a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3z" {...T} />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.2" r="1.2" {...DOT} />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: <path d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20.5 20.5l-5-5" />,
  hourglass: (
    <>
      <path d="M7 3.5c0 5 5 6 5 8.5s-5 3.5-5 8.5h10c0-5-5-6-5-8.5s5-3.5 5-8.5z" {...T} />
      <path d="M5.5 3.5h13M5.5 20.5h13" />
    </>
  ),
  flag: (
    <>
      <path d="M5 4h14l-2.5 4.5L19 13H5" {...T} />
      <path d="M5 21.5V3.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M13.5 17.5 6.5 10.5C9 5.5 13.5 3 21 3c0 7.5-2.5 12-7.5 14.5z" {...T} />
      <circle cx="15" cy="9" r="1.8" />
      <path d="M7.5 11.5 3.5 11l3-4.5h4.5M12.5 16.5l.5 4 4.5-3v-4.5M6.5 17.5 3 21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" {...T} />
      <path d="M3 10h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z" {...T} />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" {...T} />
      <path d="M10.5 18.5h3" />
    </>
  ),
  idcard: (
    <>
      <rect x="2" y="4.5" width="20" height="15" rx="2.5" {...T} />
      <circle cx="8" cy="11" r="2.5" />
      <path d="M4.8 16.5a3.5 3.5 0 0 1 6.4 0M14 10h4.5M14 14h3" />
    </>
  ),
  shuffle: <path d="M3 7h3.5L17 17h4M3 17h3.5l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 3.5V8h-4.5" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a6 6 0 0 1 0 12H11" />,
  soundOn: (
    <>
      <path d="M3.5 9v6h4l5 4.5v-15l-5 4.5z" {...T} />
      <path d="M16 9a4 4 0 0 1 0 6M18.8 6.2a8 8 0 0 1 0 11.6" />
    </>
  ),
  soundOff: (
    <>
      <path d="M3.5 9v6h4l5 4.5v-15l-5 4.5z" {...T} />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
    </>
  ),
  fullscreen: <path d="M3.5 9V3.5H9M20.5 9V3.5H15M3.5 15v5.5H9M20.5 15v5.5H15" />,
  handshake: (
    <>
      <path d="M2 11l4-4 3 1 3-2 4 1 4-1 2 5-4 4-4 4-3-2-3-1z" {...T} />
      <path d="M12 6 8.5 9.5a1.5 1.5 0 0 0 2 2.2L13 10l4.5 4.5M11 16.5l1.5 1.5M13.5 14.5 15 16" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, className = '', title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.15em] ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {ICONS[name]}
    </svg>
  );
}

/** 選手頭像：選手自己選的 emoji；沒選的用陀螺圖示。 */
export function Avatar({ emoji, className = '' }: { emoji?: string; className?: string }) {
  if (emoji) return <span className={className}>{emoji}</span>;
  return <Icon name="bey" className={`text-primary ${className}`} />;
}

/** 文字前面接一個圖示（標題、按鈕、列表常用）。 */
export function IconText({ icon, children, className = '', iconClass = '' }: { icon: IconName; children: ReactNode; className?: string; iconClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className}`}>
      <Icon name={icon} className={iconClass} />
      <span>{children}</span>
    </span>
  );
}
