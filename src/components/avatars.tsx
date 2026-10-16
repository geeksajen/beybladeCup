import type { ReactNode } from 'react';
import { AVATAR_KEYS, type AvatarKey } from '../lib/defaults';
import type { EntryDoc } from '../types';

export { AVATAR_KEYS, type AvatarKey };

/*
 * 選手頭像：圓形徽章（各自的顏色）＋自製圖案，取代原本的 emoji。
 * 資料存在 EntryDoc.emoji（沿用欄位名稱），新資料存頭像代號（例如 'dragon'）；
 * 舊資料存的是 emoji，讀取時用 LEGACY 對應，不需要搬資料。
 */

const T = { fill: 'currentColor', fillOpacity: 0.25 } as const;
const DOT = { fill: 'currentColor', stroke: 'none' } as const;

type Tone = 'primary' | 'accent' | 'gold' | 'xtreme' | 'success' | 'danger' | 'silver' | 'bronze';

/** Tailwind 需要完整的 class 字串，不能動態組。 */
const TONE: Record<Tone, string> = {
  primary: 'text-primary bg-primary/15 ring-primary/60',
  accent: 'text-accent bg-accent/15 ring-accent/60',
  gold: 'text-gold bg-gold/15 ring-gold/60',
  xtreme: 'text-xtreme bg-xtreme/15 ring-xtreme/60',
  success: 'text-success bg-success/15 ring-success/60',
  danger: 'text-danger bg-danger/15 ring-danger/60',
  silver: 'text-silver bg-silver/15 ring-silver/60',
  bronze: 'text-bronze bg-bronze/15 ring-bronze/60',
};

const AVATARS = {
  bey: {
    name: '陀螺',
    tone: 'primary',
    glyph: (
      <>
        <circle cx="12" cy="12" r="9" {...T} />
        {[0, 120, 240].map((r) => (
          <path key={r} d="M12 8.5c0-2.8 1.7-5 4.9-5.7" transform={`rotate(${r} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  dragon: {
    name: '龍',
    tone: 'success',
    glyph: (
      <>
        <path d="M5 21v-6.5L6.5 10 3 4.5l6.2 3.3L13 7l7 2.6 1.6 1.7-5.4 1.4L19.5 15 13 17.5 10.5 21z" {...T} />
        <path d="M16.2 12.7 13.5 13" />
        <circle cx="13.3" cy="10" r="1.1" {...DOT} />
        <path d="M5 14.5 2.5 15.5M6 18l-2.5 1" />
      </>
    ),
  },
  eagle: {
    name: '老鷹',
    tone: 'bronze',
    glyph: (
      <>
        <path d="M12 10C9 6.5 5.5 5.2 1.5 5.8c1.8 1 3.2 2.4 3.8 4-1.3 0-2.4.5-3 1.6 2.5-.1 4.7.6 6.2 2.1L12 17l3.5-3.5c1.5-1.5 3.7-2.2 6.2-2.1-.6-1.1-1.7-1.6-3-1.6.6-1.6 2-3 3.8-4-4-.6-7.5.7-10.5 4.2z" {...T} />
        <circle cx="12" cy="7.3" r="2" />
        <path d="M10.3 17.2 12 21.5l1.7-4.3" />
      </>
    ),
  },
  lion: {
    name: '獅子',
    tone: 'gold',
    glyph: (
      <>
        <path d="M12 3.9Q15.16 1.55 16.54 5.23Q20.46 4.97 19.64 8.81Q23.09 10.71 20.31 13.5Q22.19 16.95 18.35 17.8Q18.06 21.72 14.37 20.36Q12 23.5 9.63 20.36Q5.94 21.72 5.65 17.8Q1.81 16.95 3.69 13.5Q0.91 10.71 4.36 8.81Q3.54 4.97 7.46 5.23Q8.84 1.55 12 3.9Z" {...T} />
        <path d="M12 7c3 0 5 2.2 5 5.2 0 3.3-2.3 5.6-5 5.6s-5-2.3-5-5.6C7 9.2 9 7 12 7z" />
        <circle cx="10.2" cy="11.2" r=".9" {...DOT} />
        <circle cx="13.8" cy="11.2" r=".9" {...DOT} />
        <path d="M10.9 13.4h2.2L12 14.6z" {...DOT} />
        <path d="M12 14.6v1M10.6 16.2c.8.5 2 .5 2.8 0" />
      </>
    ),
  },
  wolf: {
    name: '狼',
    tone: 'silver',
    glyph: (
      <>
        <path d="M4 3l4 5.5h8L20 3l1 8.5-4.5 4.5-2.5 5h-4l-2.5-5L3 11.5z" {...T} />
        <circle cx="9" cy="12" r="1.1" {...DOT} />
        <circle cx="15" cy="12" r="1.1" {...DOT} />
        <path d="M10.8 17.2h2.4" />
      </>
    ),
  },
  shark: {
    name: '鯊魚',
    tone: 'primary',
    glyph: (
      <>
        <path d="M5.5 15.5C7.5 10 11 5.8 17.5 4.5c-1.8 3.3-2 7.4-.8 11z" {...T} />
        <path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      </>
    ),
  },
  tiger: {
    name: '老虎',
    tone: 'accent',
    glyph: (
      <>
        <path d="M5.5 7.5 4.5 3l4.3 2.2A8 8 0 0 1 12 4.5a8 8 0 0 1 3.2.7L19.5 3l-1 4.5A8 8 0 1 1 5.5 7.5z" {...T} />
        <path d="M12 5v3M9.6 5.4l.6 2.3M14.4 5.4l-.6 2.3M3.8 13h3M4.3 16.2h2.5M20.2 13h-3M19.7 16.2h-2.5" />
        <circle cx="9.3" cy="12" r="1" {...DOT} />
        <circle cx="14.7" cy="12" r="1" {...DOT} />
        <path d="M11 15h2l-1 1.2z" {...DOT} />
      </>
    ),
  },
  unicorn: {
    name: '獨角獸',
    tone: 'xtreme',
    glyph: (
      <>
        <path d="M8 21c.4-3.6.3-6.8-.6-9.6C6.6 8 8.6 5 12.5 4.6L19 10.8c.9.9.4 2.4-.9 2.3l-3.6-.6-1.6 1.7c1 2 1.6 4.3 1.6 6.8z" {...T} />
        <path d="M13.5 4.8 18.5 1l-1.6 6" />
        <path d="M7.4 11.5C5.3 11.3 4 9.6 4 7.6M9 6.3C7.4 5.5 7 3.9 7.8 2.6" />
        <circle cx="13.6" cy="8.6" r="1" {...DOT} />
      </>
    ),
  },
  bolt: { name: '閃電', tone: 'gold', glyph: <path d="M13.5 2 4.5 13.5h7l-1 8.5 9-11.5h-7z" {...T} /> },
  flame: {
    name: '火焰',
    tone: 'accent',
    glyph: (
      <>
        <path d="M12 22c4 0 7-2.8 7-6.8 0-4.2-3-6.2-4.2-10.7C12.5 6.5 11.5 8.6 11.6 11 10.4 10.2 9.6 9 9.4 7.2 7.2 9.4 5 12.1 5 15.2 5 19.2 8 22 12 22z" {...T} />
        <path d="M12 22c-1.7 0-3-1.3-3-3 0-2 3-4.5 3-4.5s3 2.5 3 4.5c0 1.7-1.3 3-3 3z" />
      </>
    ),
  },
  drop: {
    name: '水滴',
    tone: 'primary',
    glyph: (
      <>
        <path d="M12 2.5c3.7 4.6 6.5 8.2 6.5 11.7a6.5 6.5 0 0 1-13 0c0-3.5 2.8-7.1 6.5-11.7z" {...T} />
        <path d="M9 14.5a3 3 0 0 0 2.5 3" />
      </>
    ),
  },
  tornado: { name: '龍捲風', tone: 'silver', glyph: <path d="M3 4.5h18M5 8.5h14.5M7.5 12.5h10M9.5 16.5h5.5M11 20.5h2" /> },
  rocket: {
    name: '火箭',
    tone: 'danger',
    glyph: (
      <>
        <path d="M13.5 17.5 6.5 10.5C9 5.5 13.5 3 21 3c0 7.5-2.5 12-7.5 14.5z" {...T} />
        <circle cx="15" cy="9" r="1.8" />
        <path d="M7.5 11.5 3.5 11l3-4.5h4.5M12.5 16.5l.5 4 4.5-3v-4.5M6.5 17.5 3 21" />
      </>
    ),
  },
  star: { name: '星星', tone: 'gold', glyph: <path d="M12 3.1l2.47 6.1 6.57.46-5.05 4.24 1.59 6.39L12 16.8l-5.58 3.49 1.59-6.39-5.05-4.24 6.57-.46z" {...T} /> },
  gem: {
    name: '寶石',
    tone: 'xtreme',
    glyph: (
      <>
        <path d="M6.5 3.5h11l4 5.5L12 21 2.5 9z" {...T} />
        <path d="M2.5 9h19M9.5 3.5 8 9l4 12 4-12-1.5-5.5" />
      </>
    ),
  },
  shield: {
    name: '盾牌',
    tone: 'success',
    glyph: (
      <>
        <path d="M12 2.5 20 5.5V12c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V5.5z" {...T} />
        <path d="M12 6.5v11M7.5 11h9" />
      </>
    ),
  },
  swords: {
    name: '雙劍',
    tone: 'silver',
    glyph: (
      <>
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
        <path d="M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />
      </>
    ),
  },
  crown: {
    name: '皇冠',
    tone: 'gold',
    glyph: (
      <>
        <path d="M3 8l4.5 4.5L12 5l4.5 7.5L21 8l-2 11H5z" {...T} />
        <circle cx="3" cy="8" r="1.3" {...DOT} />
        <circle cx="12" cy="5" r="1.3" {...DOT} />
        <circle cx="21" cy="8" r="1.3" {...DOT} />
      </>
    ),
  },
  rainbow: {
    name: '彩虹',
    tone: 'xtreme',
    glyph: (
      <>
        <path d="M2 18a10 10 0 0 1 20 0" className="text-accent" />
        <path d="M5.5 18a6.5 6.5 0 0 1 13 0" className="text-gold" />
        <path d="M9 18a3 3 0 0 1 6 0" className="text-primary" />
      </>
    ),
  },
  comet: {
    name: '彗星',
    tone: 'primary',
    glyph: (
      <>
        <circle cx="16" cy="8" r="4.5" {...T} />
        <path d="M12.6 11.4 3.5 20.5M11.8 7.2 6 13M16.8 12.4 11 18.2" />
      </>
    ),
  },
} satisfies Record<AvatarKey, { name: string; tone: Tone; glyph: ReactNode }>;

/** 舊資料的 emoji → 頭像代號。 */
const LEGACY: Record<string, AvatarKey> = {
  '🌀': 'bey',
  '⚡': 'bolt',
  '🔥': 'flame',
  '💧': 'drop',
  '🌪️': 'tornado',
  '🌪': 'tornado',
  '🐉': 'dragon',
  '🦅': 'eagle',
  '🦁': 'lion',
  '🐺': 'wolf',
  '🦈': 'shark',
  '🐯': 'tiger',
  '🦄': 'unicorn',
  '🚀': 'rocket',
  '⭐': 'star',
  '💎': 'gem',
  '🛡️': 'shield',
  '🛡': 'shield',
  '⚔️': 'swords',
  '⚔': 'swords',
  '👑': 'crown',
  '🌈': 'rainbow',
  '☄️': 'comet',
  '☄': 'comet',
};

/** 存在資料裡的值（頭像代號或舊的 emoji）→ 頭像代號；不認得的用陀螺。 */
export function avatarKey(value: string | undefined): AvatarKey {
  if (!value) return 'bey';
  if (value in AVATARS) return value as AvatarKey;
  return LEGACY[value] ?? 'bey';
}

export function avatarName(value: string | undefined): string {
  return AVATARS[avatarKey(value)].name;
}

/** 頭像徽章，大小跟著字級（約 1.2em）。 */
export function Avatar({ value, className = '' }: { value?: string; className?: string }) {
  const a = AVATARS[avatarKey(value)];
  return (
    <span
      className={`inline-flex h-[1.2em] w-[1.2em] shrink-0 items-center justify-center rounded-full align-[-0.25em] ring-[0.06em] ring-inset ${TONE[a.tone]} ${className}`}
      role="img"
      aria-label={a.name}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[0.78em] w-[0.78em]" aria-hidden>
        {a.glyph}
      </svg>
    </span>
  );
}

/** 頭像＋暱稱（取代原本「emoji 暱稱」的字串）。 */
export function PlayerName({ entry, className = '' }: { entry?: EntryDoc; className?: string }) {
  if (!entry) return <span className={className}>？</span>;
  return (
    <span className={className}>
      <Avatar value={entry.emoji} className="mr-[0.3em]" />
      {entry.nickname}
    </span>
  );
}
