import { AVATAR_KEYS } from '../lib/defaults';
import { STOCK_BEYS } from '../lib/parts';
import type { AuthUser, BracketDoc, Combo, ContactDoc, EntryDoc, EventDoc, PredictionDoc } from '../types';
import type { EventStore } from './types';

// 同網域（geeksajen.github.io）的其他 app 共用 localStorage，key 一律加前綴
const PREFIX = 'beybladeCup:';
const K = {
  event: `${PREFIX}event`,
  entries: `${PREFIX}entries`,
  contacts: `${PREFIX}contacts`,
  bracket: `${PREFIX}bracket`,
  predictions: `${PREFIX}predictions`,
  uid: `${PREFIX}uid`,
  family: `${PREFIX}family`,
};

export const LOCAL_FAMILY_UID = 'local-family';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
  emit(key);
}

const listeners = new Map<string, Set<() => void>>();
function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}
function listen(key: string, fn: () => void): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  // 其他分頁的修改透過 storage 事件同步
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) fn();
  };
  window.addEventListener('storage', onStorage);
  fn();
  return () => {
    listeners.get(key)!.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function anonUid(): string {
  let uid = read<string | null>(K.uid, null);
  if (!uid) {
    uid = `anon-${randomId()}`;
    localStorage.setItem(K.uid, JSON.stringify(uid));
  }
  return uid;
}

/** 家庭帳號登入只存在 sessionStorage：同一個瀏覽器的不同分頁可以一個是主辦、一個是訪客。 */
function currentUser(): AuthUser {
  try {
    if (sessionStorage.getItem(K.family) === '1') return { uid: LOCAL_FAMILY_UID, isAnonymous: false, email: 'local@family' };
  } catch {
    /* ignore */
  }
  return { uid: anonUid(), isAnonymous: true };
}

const authListeners = new Set<() => void>();

const delay = () => new Promise((r) => setTimeout(r, 120));

export function createLocalStore(): EventStore {
  return {
    mode: 'local',
    localFamilyUid: LOCAL_FAMILY_UID,

    onAuth(cb) {
      const fn = () => cb(currentUser());
      authListeners.add(fn);
      fn();
      return () => authListeners.delete(fn);
    },
    async signInFamily(email, password) {
      await delay();
      if (!email || !password) throw new Error('請輸入 Email 與密碼');
      sessionStorage.setItem(K.family, '1');
      authListeners.forEach((fn) => fn());
    },
    async signOut() {
      sessionStorage.removeItem(K.family);
      authListeners.forEach((fn) => fn());
    },

    subscribeEvent(cb) {
      return listen(K.event, () => cb(read<EventDoc | null>(K.event, null)));
    },
    subscribeEntries(cb) {
      return listen(K.entries, () => cb(Object.values(read<Record<string, EntryDoc>>(K.entries, {}))));
    },
    subscribeBracket(cb) {
      return listen(K.bracket, () => cb(read<BracketDoc | null>(K.bracket, null)));
    },

    async createEvent(ev) {
      await delay();
      write(K.event, { ...ev, updatedAt: Date.now() });
    },
    async updateEvent(patch) {
      await delay();
      const cur = read<EventDoc | null>(K.event, null);
      if (!cur) throw new Error('活動尚未設定');
      write(K.event, { ...cur, ...patch, updatedAt: Date.now() });
    },

    async addEntry(ownerUid, entry, contact) {
      await delay();
      const id = randomId();
      const now = Date.now();
      const entries = read<Record<string, EntryDoc>>(K.entries, {});
      entries[id] = { ...entry, id, ownerUid, status: 'active', checkedIn: false, createdAt: now, updatedAt: now };
      const contacts = read<Record<string, ContactDoc>>(K.contacts, {});
      contacts[id] = { ...contact, ownerUid };
      localStorage.setItem(K.contacts, JSON.stringify(contacts));
      write(K.entries, entries);
      return id;
    },
    async updateEntry(id, patch) {
      await delay();
      const entries = read<Record<string, EntryDoc>>(K.entries, {});
      if (!entries[id]) throw new Error('找不到這筆報名');
      entries[id] = { ...entries[id], ...patch, updatedAt: Date.now() };
      write(K.entries, entries);
    },
    async deleteEntry(id) {
      await delay();
      const entries = read<Record<string, EntryDoc>>(K.entries, {});
      delete entries[id];
      const contacts = read<Record<string, ContactDoc>>(K.contacts, {});
      delete contacts[id];
      localStorage.setItem(K.contacts, JSON.stringify(contacts));
      write(K.entries, entries);
    },

    async getContact(id) {
      return read<Record<string, ContactDoc>>(K.contacts, {})[id] ?? null;
    },
    async saveContact(id, contact) {
      await delay();
      const contacts = read<Record<string, ContactDoc>>(K.contacts, {});
      contacts[id] = contact;
      write(K.contacts, contacts);
    },
    async listContacts() {
      await delay();
      return read<Record<string, ContactDoc>>(K.contacts, {});
    },
    async clearContacts() {
      await delay();
      const n = Object.keys(read<Record<string, ContactDoc>>(K.contacts, {})).length;
      write(K.contacts, {});
      return n;
    },

    subscribePredictions(cb) {
      return listen(K.predictions, () => cb(Object.values(read<Record<string, PredictionDoc>>(K.predictions, {}))));
    },
    async savePrediction(voterId, pickId, ownerUid) {
      await delay();
      const list = read<Record<string, PredictionDoc>>(K.predictions, {});
      list[voterId] = { voterId, pickId, ownerUid, updatedAt: Date.now() };
      write(K.predictions, list);
    },

    async mutateBracket(fn) {
      const cur = read<BracketDoc | null>(K.bracket, null);
      const next = fn(cur);
      if (next === null) {
        write(K.bracket, null);
        return null;
      }
      const saved = { ...next, version: (cur?.version ?? 0) + 1 };
      write(K.bracket, saved);
      return saved;
    },
  };
}

const SEED_NAMES = ['閃電小明', '火焰阿傑', '旋風小美', '鋼鐵阿翔', '疾風小宇', '雷霆阿凱', '冰龍小晴', '烈日阿豪', '神鷹小安', '黑豹阿哲', '星光小芸', '颶風阿睿'];
const pick = <T>(list: readonly T[], i: number): T => list[i % list.length];
/** 測試用 Deck：從原廠組合挑（Meta 統計才有東西看），集中在前 15 款常見陀螺。 */
function seedDeck(i: number, size: number): Combo[] {
  const pool = STOCK_BEYS.slice(0, 15);
  return Array.from({ length: size }, (_, k) => ({ ...pool[(i * 2 + k * 5) % pool.length].combo }));
}
/**
 * 開發用：一次產生 n 筆測試報名（每筆不同的假 ownerUid，依序報名）。
 * 暱稱接在現有報名之後編號，不會跟已有的重複。
 */
export function seedLocalEntries(n: number, checkedIn: boolean): void {
  const entries = read<Record<string, EntryDoc>>(K.entries, {});
  const contacts = read<Record<string, ContactDoc>>(K.contacts, {});
  const offset = Object.keys(entries).length;
  const deckSize = read<EventDoc | null>(K.event, null)?.rules.deckSize ?? 3;
  const now = Date.now();
  for (let k = 0; k < n; k++) {
    const i = offset + k;
    const id = randomId();
    const ownerUid = `seed-${randomId()}`;
    const round = Math.floor(i / SEED_NAMES.length);
    entries[id] = {
      id,
      ownerUid,
      // 跟現在的報名表一樣只有暱稱＋頭像（年級、陀螺名稱已不再詢問）
      nickname: round === 0 ? pick(SEED_NAMES, i) : `${pick(SEED_NAMES, i)}${round + 1}`,
      emoji: AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)],
      status: 'active',
      checkedIn,
      // 每 5 人有 1 人沒登錄 Deck（測試報到補登錄、計分時的提醒）
      deck: i % 5 === 4 ? undefined : seedDeck(i, deckSize),
      // 每筆差 1ms，維持報名順序（正取／候補依 createdAt 排序）
      createdAt: now + k,
      updatedAt: now + k,
    };
    // 聯絡資料都是選填：每 3 人只有 1 人填家長稱呼（測試「沒有填聯絡資料」的顯示）
    contacts[id] = { ownerUid, ...(i % 3 === 0 ? { parentName: `測試家長 ${i + 1}` } : {}), needsBorrowBey: i % 5 === 0 };
  }
  localStorage.setItem(K.contacts, JSON.stringify(contacts));
  write(K.entries, entries);
}

/** 開發用：清空所有報名（連同聯絡資料、賽程、猜冠軍，因為它們都指向報名），保留活動設定。 */
export function clearLocalEntries(): void {
  for (const key of [K.entries, K.contacts, K.bracket, K.predictions]) write(key, null);
}

/** 開發用：清空本機所有資料。 */
export function resetLocalData(): void {
  for (const key of [K.event, K.entries, K.contacts, K.bracket, K.predictions]) write(key, null);
}
