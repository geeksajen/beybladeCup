import { signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { EVENT_ID } from '../lib/defaults';
import { firebaseApp, firebaseAuth, watchAuth } from '../lib/firebase';
import type { BracketDoc, ContactDoc, EntryDoc, EventDoc } from '../types';
import type { EventStore } from './types';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') return (v as Timestamp).toMillis();
  return Date.now();
}

function eventFromData(d: DocumentData): EventDoc {
  return {
    ...(d as EventDoc),
    startAt: toMillis(d.startAt),
    registerDeadline: toMillis(d.registerDeadline),
    updatedAt: toMillis(d.updatedAt),
  };
}

function eventToData(patch: Partial<EventDoc>): DocumentData {
  const out: DocumentData = { ...patch, updatedAt: serverTimestamp() };
  if (patch.startAt != null) out.startAt = Timestamp.fromMillis(patch.startAt);
  if (patch.registerDeadline != null) out.registerDeadline = Timestamp.fromMillis(patch.registerDeadline);
  return out;
}

function entryFromData(id: string, d: DocumentData): EntryDoc {
  return { ...(d as EntryDoc), id, createdAt: toMillis(d.createdAt), updatedAt: toMillis(d.updatedAt) };
}

function message(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e.code === 'permission-denied') return '沒有權限（可能報名已截止，或不是主辦帳號）';
  if (e.code === 'unavailable') return '網路連線中斷，請稍後再試';
  return e.message ?? String(err);
}

export function createFirebaseStore(): EventStore {
  const app = firebaseApp();
  const db: Firestore = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const eventRef = doc(db, 'events', EVENT_ID);
  const entriesCol = collection(db, 'events', EVENT_ID, 'entries');
  const contactsCol = collection(db, 'events', EVENT_ID, 'contacts');
  const bracketRef = doc(db, 'events', EVENT_ID, 'state', 'bracket');

  const wrap = async <T>(p: Promise<T>): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      throw new Error(message(err));
    }
  };

  return {
    mode: 'firebase',

    onAuth(cb, onError) {
      return watchAuth(cb, onError);
    },
    async signInFamily(email, password) {
      try {
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
          throw new Error('Email 或密碼錯誤');
        if (code === 'auth/too-many-requests') throw new Error('嘗試太多次，請稍後再試');
        throw new Error(message(err));
      }
    },
    async signOut() {
      // 登出後 onAuthStateChanged 收到 null，會自動重新匿名登入
      await fbSignOut(firebaseAuth());
    },

    subscribeEvent(cb, onError) {
      return onSnapshot(
        eventRef,
        (s) => cb(s.exists() ? eventFromData(s.data({ serverTimestamps: 'estimate' })) : null),
        (err) => onError(message(err)),
      );
    },
    subscribeEntries(cb, onError) {
      return onSnapshot(
        entriesCol,
        (s) => cb(s.docs.map((d) => entryFromData(d.id, d.data({ serverTimestamps: 'estimate' })))),
        (err) => onError(message(err)),
      );
    },
    subscribeBracket(cb, onError) {
      return onSnapshot(
        bracketRef,
        (s) => cb(s.exists() ? (s.data() as BracketDoc) : null),
        (err) => onError(message(err)),
      );
    },

    createEvent(ev) {
      return wrap(setDoc(eventRef, eventToData(ev)));
    },
    updateEvent(patch) {
      return wrap(updateDoc(eventRef, eventToData(patch)));
    },

    async addEntry(ownerUid, entry, contact) {
      const ref = doc(entriesCol);
      const batch = writeBatch(db);
      batch.set(ref, {
        ...entry,
        ownerUid,
        status: 'active',
        checkedIn: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(contactsCol, ref.id), { ...contact, ownerUid });
      await wrap(batch.commit());
      return ref.id;
    },
    updateEntry(id, patch) {
      return wrap(updateDoc(doc(entriesCol, id), { ...patch, updatedAt: serverTimestamp() }));
    },
    async deleteEntry(id) {
      const batch = writeBatch(db);
      batch.delete(doc(entriesCol, id));
      batch.delete(doc(contactsCol, id));
      await wrap(batch.commit());
    },

    async getContact(id) {
      const s = await wrap(getDoc(doc(contactsCol, id)));
      return s.exists() ? (s.data() as ContactDoc) : null;
    },
    saveContact(id, contact) {
      return wrap(setDoc(doc(contactsCol, id), contact));
    },
    async listContacts() {
      const s = await wrap(getDocs(contactsCol));
      const out: Record<string, ContactDoc> = {};
      s.docs.forEach((d) => (out[d.id] = d.data() as ContactDoc));
      return out;
    },
    async clearContacts() {
      const s = await wrap(getDocs(contactsCol));
      // 一個 batch 最多 500 筆；一場比賽遠少於此
      const batch = writeBatch(db);
      s.docs.forEach((d) => batch.delete(d.ref));
      await wrap(batch.commit());
      return s.size;
    },

    mutateBracket(fn) {
      return wrap(
        runTransaction(db, async (tx) => {
          const s = await tx.get(bracketRef);
          const cur = s.exists() ? (s.data() as BracketDoc) : null;
          const next = fn(cur);
          if (next === null) {
            tx.delete(bracketRef);
            return null;
          }
          const saved = { ...next, version: (cur?.version ?? 0) + 1 };
          tx.set(bracketRef, saved);
          return saved;
        }),
      );
    },
  };
}
