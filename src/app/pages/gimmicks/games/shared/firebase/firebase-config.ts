// =============================================================
//  Firebase configuration for the online games (Connect Four, Backgammon, …).
// =============================================================
// These values are NOT secrets – a web Firebase config ends up in the
// browser bundle anyway and may be public. That's why they are
// right here in the source code and not in the .env.
//
// Protection comes from the database rules of the Firebase project
// (path "connect4" is only readable/writable for signed-in clients) and
// the anonymous sign-in in firebase.ts.
//
// Project: "whiteboard-32486" – the same project the whiteboard app
// uses. Both apps share the data path "connect4/games", so a game can
// even be played across devices between both apps.
//
// The values come from the Firebase console:
//   Project settings (gear) → "Your apps" → Web app </> → "Config".
// =============================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyBY_UOdWb45qbnm8QWyoGqryVJhccGw3Hs',
  authDomain: 'whiteboard-32486.firebaseapp.com',
  databaseURL: 'https://whiteboard-32486-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'whiteboard-32486',
  storageBucket: 'whiteboard-32486.firebasestorage.app',
  messagingSenderId: '542282633974',
  appId: '1:542282633974:web:b1362d9803caac8ae292d7',
};
