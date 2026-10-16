import type { EventDoc, EventStatus, FinishType, Format, RuleConfig } from '../types';

/** 只有一場比賽，eventId 固定。 */
export const EVENT_ID = 'current';

export const DEFAULT_TITLE = '哥哥盃戰鬥陀螺大賽';
export const DEFAULT_LOCATION_HINT = '主辦家（地址另於 LINE 群組提供）';

export const DEFAULT_RULES: RuleConfig = {
  pointsToWin: 4,
  finishPoints: { spin: 1, over: 2, burst: 2, xtreme: 3 },
  launchErrorPenalty: true,
  format: 'groupsThenKnockout',
  advancePerGroup: 2,
  thirdPlaceMatch: true,
  arenaCount: 1,
  minutesPerMatch: 3,
  deckSize: 3,
};

export const FINISH_TYPES: FinishType[] = ['spin', 'over', 'burst', 'xtreme'];

/** color：實心底（上面用 text-on）；text：深色底上的文字／圖示色。圖示名稱與 FinishType 相同。 */
export const FINISH_LABELS: Record<FinishType, { name: string; desc: string; color: string; text: string }> = {
  spin: { name: 'Spin', desc: '對方先停止旋轉', color: 'bg-primary', text: 'text-primary' },
  over: { name: 'Over', desc: '把對方打出場外', color: 'bg-gold', text: 'text-gold' },
  burst: { name: 'Burst', desc: '把對方陀螺打到解體', color: 'bg-accent', text: 'text-accent' },
  xtreme: { name: 'Xtreme', desc: '把對方打進 Xtreme Zone', color: 'bg-xtreme', text: 'text-xtreme' },
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: '準備中',
  open: '開放報名',
  closed: '報名截止',
  running: '比賽中',
  finished: '已結束',
};

export const STATUS_FLOW: EventStatus[] = ['draft', 'open', 'closed', 'running', 'finished'];

export const FORMAT_LABELS: Record<Format, string> = {
  roundRobin: '單循環（每人都打每人）',
  groupsThenKnockout: '分組循環 → 單淘汰',
  knockout: '單淘汰',
};

export const EMOJIS = ['🌀', '⚡', '🔥', '💧', '🌪️', '🐉', '🦅', '🦁', '🐺', '🦈', '🐯', '🦄', '🚀', '⭐', '💎', '🛡️', '⚔️', '👑', '🌈', '☄️'];

export interface SetupValues {
  title: string;
  startAt: number | null;
  registerDeadline: number | null;
  capacity: number;
  waitlistCapacity: number;
  arenaCount: number;
}

export type SetupErrors = Partial<Record<keyof SetupValues, string>>;

export function defaultSetupValues(): SetupValues {
  return {
    title: DEFAULT_TITLE,
    startAt: null,
    registerDeadline: null,
    capacity: 16,
    waitlistCapacity: 4,
    arenaCount: 1,
  };
}

/** 預設報名截止：比賽前一天 21:00。 */
export function defaultDeadlineFor(startAt: number): number {
  const d = new Date(startAt);
  d.setDate(d.getDate() - 1);
  d.setHours(21, 0, 0, 0);
  return d.getTime();
}

/**
 * 驗證設定值。初次設定時 requireFuture = true（時間必須晚於現在）；
 * 之後在活動設定修改時不檢查「晚於現在」，避免比賽當天改不了其他欄位。
 */
export function validateSetup(v: SetupValues, now: number, requireFuture: boolean): SetupErrors {
  const e: SetupErrors = {};
  const title = v.title.trim();
  if (title.length < 1 || title.length > 30) e.title = '比賽名稱需要 1～30 字';
  if (v.startAt == null || Number.isNaN(v.startAt)) e.startAt = '請選擇比賽日期與開始時間';
  else if (requireFuture && v.startAt <= now) e.startAt = '比賽時間必須晚於現在';
  if (v.registerDeadline == null || Number.isNaN(v.registerDeadline)) e.registerDeadline = '請選擇報名截止時間';
  else {
    if (v.startAt != null && v.registerDeadline >= v.startAt) e.registerDeadline = '報名截止必須早於比賽開始時間';
    else if (requireFuture && v.registerDeadline <= now) e.registerDeadline = '報名截止必須晚於現在';
  }
  if (!Number.isInteger(v.capacity) || v.capacity < 4 || v.capacity > 24) e.capacity = '正取名額需要 4～24 人';
  if (!Number.isInteger(v.waitlistCapacity) || v.waitlistCapacity < 0 || v.waitlistCapacity > 10)
    e.waitlistCapacity = '候補名額需要 0～10 人';
  if (v.arenaCount !== 1 && v.arenaCount !== 2) e.arenaCount = '戰鬥盤數量只能是 1 或 2';
  return e;
}

export function buildEventDoc(v: SetupValues, now: number): EventDoc {
  return {
    title: v.title.trim(),
    startAt: v.startAt!,
    registerDeadline: v.registerDeadline!,
    locationHint: DEFAULT_LOCATION_HINT,
    capacity: v.capacity,
    waitlistCapacity: v.waitlistCapacity,
    maxEntriesPerOwner: 3,
    status: 'draft',
    rules: { ...DEFAULT_RULES, arenaCount: v.arenaCount },
    updatedAt: now,
  };
}
