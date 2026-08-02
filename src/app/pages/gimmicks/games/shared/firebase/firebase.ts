// =============================================================
//  Firebase-Anbindung für die Online-Spiele (4 Gewinnt, Memo-Quiz).
// =============================================================
// Die Konfiguration steht in firebase-config.ts (keine Geheimnisse, siehe dort).
// Der Schutz kommt über die Datenbank-Regeln des Projekts (`auth != null`)
// und die anonyme Anmeldung unten.
//
// Eigene, BENANNTE Firebase-App, damit es nicht mit einer eventuellen
// [DEFAULT]-App (z. B. über @angular/fire) kollidiert.
// =============================================================
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig } from './firebase-config';

const APP_NAME = 'aznw-games';

const config = firebaseConfig;

/** Ohne gültige databaseURL kann das SDK nicht verbinden – Anfragen würden hängen. */
export const databaseConfigured =
  !!config.apiKey && !!config.databaseURL && config.databaseURL.startsWith('https://');

let app: FirebaseApp | null = null;
let database: Database | null = null;

if (databaseConfigured) {
  app = getApps().some((a) => a.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp(config, APP_NAME);
  try {
    database = getDatabase(app);
  } catch {
    database = null;
  }
}

/** Nur gültig, wenn `databaseConfigured === true` ist (vorher prüfen!). */
export const db = database as Database;

/**
 * Anonyme Anmeldung – die Datenbank-Regeln verlangen `auth != null`.
 * Erst wenn dieses Promise erfüllt ist, dürfen DB-Zugriffe erfolgen.
 */
export const authReady: Promise<void> =
  databaseConfigured && app ? ensureAnonAuth(app) : Promise.resolve();

function ensureAnonAuth(firebaseApp: FirebaseApp): Promise<void> {
  const auth = getAuth(firebaseApp);
  return new Promise<void>((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve();
      }
    });
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        unsub();
        reject(err);
      });
    }
  });
}
