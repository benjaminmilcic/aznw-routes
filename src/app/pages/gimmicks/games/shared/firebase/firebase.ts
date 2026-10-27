// =============================================================
//  Firebase connection for the online games (Connect Four, Memo quiz, Backgammon, …).
// =============================================================
// The configuration is in firebase-config.ts (no secrets, see there).
// Protection comes from the project's database rules (`auth != null`)
// and the anonymous sign-in below.
//
// Own, NAMED Firebase app, so that it does not collide with a possible
// [DEFAULT] app (e.g. via @angular/fire).
// =============================================================
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

const APP_NAME = 'aznw-games';

const config = firebaseConfig;

/** Without a valid databaseURL the SDK cannot connect – requests would hang. */
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

/** Only valid if `databaseConfigured === true` (check first!). */
export const db = database as Database;

// ---- Firestore -------------------------------------------------------
// "Battleship" lives in Firestore (collection "games") instead of the
// Realtime Database – just like in the whiteboard app. That way a
// game can even be played across devices between both apps.
let firestore: Firestore | null = null;

if (app) {
  try {
    firestore = getFirestore(app);
  } catch {
    firestore = null;
  }
}

export const firestoreConfigured = !!firestore;

/** Only valid if `firestoreConfigured === true` (check first!). */
export const firestoreDb = firestore as Firestore;

/**
 * Anonymous sign-in – the database rules require `auth != null`.
 * DB access may only happen once this promise is fulfilled.
 */
export const authReady: Promise<void> =
  databaseConfigured && app ? ensureAnonAuth(app) : Promise.resolve();

function ensureAnonAuth(firebaseApp: FirebaseApp): Promise<void> {
  const auth = getAuth(firebaseApp);
  const ready = new Promise<void>((resolve, reject) => {
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
  void ready.then(() => watchAuth(auth)).catch(() => {
    /* The caller reports errors – here only no unhandled rejection */
  });
  return ready;
}

/**
 * Keeps the anonymous sign-in alive.
 *
 * If the user drops out while running (e.g. because the token could not
 * be renewed), open listeners lose their read permission –
 * Firebase cancels them and NEVER reattaches them, the game then stays
 * silently stuck. That's why we sign in again right away here.
 */
function watchAuth(auth: Auth): void {
  let retries = 0;
  let signingIn = false;
  const MAX_RETRIES = 5;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      retries = 0;
      return;
    }
    if (signingIn || retries >= MAX_RETRIES) return;
    signingIn = true;
    retries++;
    console.warn(`[sync] Anmeldung verloren – melde neu an (Versuch ${retries}).`);
    signInAnonymously(auth)
      .catch((err) => console.warn('[sync] Erneute Anmeldung fehlgeschlagen:', err))
      .finally(() => {
        signingIn = false;
      });
  });
}
