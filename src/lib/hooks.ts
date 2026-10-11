import { useEffect, useState } from 'react';

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** 記住使用者偏好（例如後台目前分頁）；storage 不可用時退回預設值。 */
export function usePersistentState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const fullKey = `beybladeCup:pref:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(fullKey) as T | null) ?? initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(fullKey, v);
    } catch {
      /* ignore */
    }
  };
  return [value, set];
}
