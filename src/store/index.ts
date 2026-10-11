import { createFirebaseStore } from './firebaseAdapter';
import { createLocalStore } from './localAdapter';
import type { EventStore } from './types';

export const STORE_MODE: 'local' | 'firebase' = import.meta.env.VITE_STORE_MODE === 'firebase' ? 'firebase' : 'local';

let store: EventStore | undefined;

export function getStore(): EventStore {
  if (!store) store = STORE_MODE === 'firebase' ? createFirebaseStore() : createLocalStore();
  return store;
}

export type { EventStore } from './types';
