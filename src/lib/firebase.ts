import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import type { AuthUser } from '../types';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function firebaseApp(): FirebaseApp {
  if (!app) {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    if (!config.apiKey || !config.projectId) {
      throw new Error('缺少 Firebase 設定（VITE_FIREBASE_*），請檢查 .env.local 或 GitHub Secrets');
    }
    app = initializeApp(config);
  }
  return app;
}

export function firebaseAuth(): Auth {
  if (!auth) auth = getAuth(firebaseApp());
  return auth;
}

/**
 * 監聽登入狀態。只在 currentUser == null 時匿名登入，
 * 絕不覆蓋已登入的家庭帳號。
 */
export function watchAuth(cb: (user: AuthUser | null) => void, onError: (message: string) => void): () => void {
  const a = firebaseAuth();
  return onAuthStateChanged(a, (u) => {
    if (!u) {
      cb(null);
      signInAnonymously(a).catch((err: { code?: string; message?: string }) => {
        onError(
          err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation'
            ? 'Firebase 尚未啟用「匿名」登入（Authentication → Sign-in method）'
            : `匿名登入失敗：${err.message ?? err.code}`,
        );
      });
      return;
    }
    cb({ uid: u.uid, isAnonymous: u.isAnonymous, email: u.email });
  });
}
