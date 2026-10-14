import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'];

export const missingConfigKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);
export const isFirebaseConfigured = missingConfigKeys.length === 0;

let db = null;

// Lazily initialised so the app can render a setup screen when .env is empty.
export function getDb() {
  if (!isFirebaseConfigured) {
    throw new Error(`Firebase is not configured. Missing: ${missingConfigKeys.join(', ')}`);
  }
  if (!db) {
    const app = initializeApp(firebaseConfig);
    // IndexedDB cache: data shows instantly after reload and works offline;
    // multi-tab manager keeps several open tabs in sync.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return db;
}
