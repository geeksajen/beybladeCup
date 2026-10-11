import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStore, type EventStore } from '../store';
import type { AuthUser, BracketDoc, EntryDoc, EventDoc } from '../types';

interface EventContextValue {
  store: EventStore;
  user: AuthUser | null;
  isFamily: boolean;
  /** undefined = 載入中；null = 尚未完成初次設定 */
  event: EventDoc | null | undefined;
  entries: EntryDoc[];
  entriesLoaded: boolean;
  bracket: BracketDoc | null | undefined;
  error?: string;
  entryById: Map<string, EntryDoc>;
}

const EventContext = createContext<EventContextValue | null>(null);

/** ★ 全 app 只有這裡建立 3 個監聽：events/current、entries、state/bracket（spec §2.2）。 */
export function EventProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [event, setEvent] = useState<EventDoc | null | undefined>(undefined);
  const [entries, setEntries] = useState<EntryDoc[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [bracket, setBracket] = useState<BracketDoc | null | undefined>(undefined);
  const [error, setError] = useState<string>();

  useEffect(() => store.onAuth(setUser, setError), [store]);

  useEffect(() => {
    const u1 = store.subscribeEvent(setEvent, setError);
    const u2 = store.subscribeEntries((list) => {
      setEntries(list);
      setEntriesLoaded(true);
    }, setError);
    const u3 = store.subscribeBracket(setBracket, setError);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [store]);

  const familyUid = store.mode === 'local' ? store.localFamilyUid : import.meta.env.VITE_FAMILY_UID;
  // 前端只用來決定要不要顯示後台；真正的權限由 Firestore 規則判斷
  const isFamily = !!user && !user.isAnonymous && (!familyUid || user.uid === familyUid);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const value: EventContextValue = { store, user, isFamily, event, entries, entriesLoaded, bracket, error, entryById };
  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used inside EventProvider');
  return ctx;
}

/** 已完成設定的頁面使用（SetupGate 保證 event 存在）。 */
export function useReadyEvent(): EventContextValue & { event: EventDoc } {
  const ctx = useEvent();
  if (!ctx.event) throw new Error('event not ready');
  return ctx as EventContextValue & { event: EventDoc };
}
