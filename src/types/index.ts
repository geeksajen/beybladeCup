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
  /** 每人帶幾顆陀螺：3 = 3on3（預設），1 = 單顆。舊資料沒有這個欄位時視為 3。 */
  deckSize?: 1 | 3;
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

/** 一顆陀螺的零件組合（Beyblade X）。名稱存正規化後的英文名（見 lib/parts.ts）。 */
export interface Combo {
  blade: string;
  /** 只有 CX（Custom Line）才有。CX 的 blade 是 Main Blade（CXE 是 Metal Blade）。 */
  assistBlade?: string;
  /** 只有 CX，選填。 */
  lockChip?: string;
  /** 只有 CXE（擴充三片式）才有。 */
  overBlade?: string;
  ratchet: string;
  /** Ratchet 是融合型（Turbo、Operate 等，Ratchet 與 Bit 一體）時為空字串。 */
  bit: string;
}

export interface EntryInput {
  nickname: string;
  grade?: string;
  beyName?: string;
  emoji?: string;
  /** 3on3 的 Deck（選填，報名時或之後在「我的報名」登錄），陣列順序 = 預設出場順序。比賽開始前只有自己與主辦看得到（畫面上隱藏）。 */
  deck?: Combo[];
}

export interface EntryDoc extends EntryInput {
  id: string;
  ownerUid: string;
  status: 'active' | 'cancelled';
  checkedIn: boolean;
  /** 主辦報到時確認過的 Deck（deckSignature）；之後 Deck 被修改就不相符 = 需要重新確認。 */
  deckCheckedKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContactInput {
  parentName?: string;
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
  /** 這一場雙方的 Deck，依本場出場順序排列（開打時從報名資料複製，之後改 Deck 不影響）。 */
  p1Deck?: Combo[];
  p2Deck?: Combo[];
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
