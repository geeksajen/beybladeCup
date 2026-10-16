import type { AuthUser, BracketDoc, ContactDoc, ContactInput, EntryDoc, EntryInput, EventDoc, PredictionDoc } from '../types';

export type Unsub = () => void;

export type EntryPatch = Partial<Omit<EntryDoc, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>;

/** 所有資料存取都經過這個介面；只有 store/ 可以 import firebase/firestore。 */
export interface EventStore {
  mode: 'local' | 'firebase';
  /** 本機模式的家庭帳號 uid；firebase 模式為 undefined。 */
  localFamilyUid?: string;

  /** 監聽登入狀態；沒有登入時自動匿名登入（只在 currentUser == null 時）。 */
  onAuth(cb: (user: AuthUser | null) => void, onError: (message: string) => void): Unsub;
  signInFamily(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  subscribeEvent(cb: (ev: EventDoc | null) => void, onError: (message: string) => void): Unsub;
  subscribeEntries(cb: (list: EntryDoc[]) => void, onError: (message: string) => void): Unsub;
  subscribeBracket(cb: (b: BracketDoc | null) => void, onError: (message: string) => void): Unsub;

  createEvent(ev: EventDoc): Promise<void>;
  updateEvent(patch: Partial<EventDoc>): Promise<void>;

  addEntry(ownerUid: string, entry: EntryInput, contact: ContactInput): Promise<string>;
  updateEntry(id: string, patch: EntryPatch): Promise<void>;
  deleteEntry(id: string): Promise<void>;

  getContact(id: string): Promise<ContactDoc | null>;
  saveContact(id: string, contact: ContactDoc): Promise<void>;
  /** 只有主辦能讀全部聯絡資料（一次性讀取，不建立監聽）。 */
  listContacts(): Promise<Record<string, ContactDoc>>;
  clearContacts(): Promise<number>;

  /** 猜冠軍的票（只在需要的頁面監聽，不放在 EventProvider）。 */
  subscribePredictions(cb: (list: PredictionDoc[]) => void, onError: (message: string) => void): Unsub;
  savePrediction(voterId: string, pickId: string, ownerUid: string): Promise<void>;

  /** 讀最新版 → 套用純函式 → 寫回（firebase 模式用 transaction）。fn 回傳 null 代表刪除賽程。 */
  mutateBracket(fn: (cur: BracketDoc | null) => BracketDoc | null): Promise<BracketDoc | null>;
}
