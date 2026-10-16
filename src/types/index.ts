// 所有時間在前端一律用毫秒數（number）；firebaseAdapter 負責與 Firestore Timestamp 互轉。

export type EventStatus = 'draft' | 'open' | 'closed' | 'running' | 'finished';

export type FinishType = 'spin' | 'over' | 'burst' | 'xtreme';

export type Format = 'roundRobin' | 'groupsThenKnockout' | 'knockout';

export interface RuleConfig {
  pointsToWin: number;
  finishPoints: Record<FinishType, number>;
  launchErrorPenalty: boolean;
  format: Format;
  groupCount?: number;
  advancePerGroup?: number;
  thirdPlaceMatch: boolean;
  arenaCount: number;
  minutesPerMatch: number;
}

export interface EventDoc {
  title: string;
  subtitle?: string;
  startAt: number;
  registerDeadline: number;
  locationHint: string;
  capacity: number;
  waitlistCapacity: number;
  maxEntriesPerOwner: number;
  status: EventStatus;
  rules: RuleConfig;
  announcement?: string;
  /** 猜冠軍開放投票中（主辦在計分分頁開關）。 */
  predictionsOpen?: boolean;
  updatedAt: number;
}

export interface EntryInput {
  nickname: string;
  grade?: string;
  beyName?: string;
  emoji?: string;
}

export interface EntryDoc extends EntryInput {
  id: string;
  ownerUid: string;
  status: 'active' | 'cancelled';
  checkedIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ContactInput {
  parentName: string;
  phone?: string;
  childRealName?: string;
  note?: string;
  needsBorrowBey: boolean;
}

export interface ContactDoc extends ContactInput {
  ownerUid: string;
}

export interface Battle {
  winner: 'p1' | 'p2' | 'draw';
  finish?: FinishType | 'launchError';
  at: number;
}

export interface Match {
  id: string;
  stage: 'group' | 'knockout';
  groupId?: string;
  round: number;
  order: number;
  slot?: number;
  arena?: number;
  p1?: string;
  p2?: string;
  p1Source?: string;
  p2Source?: string;
  battles: Battle[];
  p1Score: number;
  p2Score: number;
  manualScore?: boolean;
  status: 'pending' | 'live' | 'done';
  winner?: string;
  isBye?: boolean;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
}

export interface Award {
  key: string;
  label: string;
  entryIds: string[];
  manual?: boolean;
}

export interface BracketDoc {
  version: number;
  generatedAt: number;
  format: Format;
  playerIds: string[];
  groups: Group[];
  matches: Match[];
  currentMatchIds: string[];
  manualOrder?: Record<string, string[]>;
  drawAt?: number;
  countdownAt?: number;
  awards?: Award[];
  finalRanking?: string[];
}

/** 猜冠軍：每位參賽小孩（voterId = 報名 id）投一票。 */
export interface PredictionDoc {
  voterId: string;
  pickId: string;
  /** 寫入者的 auth uid（報名的家長，或主辦代投）。 */
  ownerUid: string;
  updatedAt: number;
}

export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
  email?: string | null;
}
