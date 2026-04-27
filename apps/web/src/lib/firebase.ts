import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Web SDK init. Singleton — reusa app existente se já houver.
 *
 * Config vem de env vars `NEXT_PUBLIC_FIREBASE_*` (públicas, vão pro
 * bundle do browser). Não há informação secreta aqui — segurança real
 * é via Security Rules + Authorized Domains no Firebase Console.
 */

function readConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      'Firebase config faltando. Defina NEXT_PUBLIC_FIREBASE_API_KEY, ' +
        '_AUTH_DOMAIN, _PROJECT_ID e _APP_ID em apps/web/.env.local',
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket,
    messagingSenderId,
  };
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  const existing = getApps()[0];
  _app = existing ?? initializeApp(readConfig());
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
}
