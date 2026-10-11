import type { AuthUser, BracketDoc, ContactDoc, EntryDoc, EventDoc } from '../types';
import type { EventStore } from './types';

// 同網域（geeksajen.github.io）的其他 app 共用 localStorage，key 一律加前綴
const PREFIX = 'beybladeCup:';
const K = {
  event: `${PREFIX}event`,
  entries: `${PREFIX}entries`,
  contacts: `${PREFIX}contacts`,
  bracket: `${PREFIX}bracket`,
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

/** 開發用：清空本機所有資料。 */
export function resetLocalData(): void {
  for (const key of [K.event, K.entries, K.contacts, K.bracket]) write(key, null);
}
