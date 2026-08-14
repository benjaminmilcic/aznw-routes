// =============================================================
//  Firebase-Konfiguration für die Online-Spiele (4 Gewinnt, Backgammon, …).
// =============================================================
// Diese Werte sind KEINE Geheimnisse – eine Web-Firebase-Config landet
// ohnehin im Browser-Bundle und darf öffentlich sein. Deshalb stehen sie
// hier direkt im Quelltext und nicht in der .env.
//
// Der Schutz kommt über die Datenbank-Regeln des Firebase-Projekts
// (Pfad "connect4" ist nur für angemeldete Clients les-/schreibbar) und
// die anonyme Anmeldung in firebase.ts.
//
// Projekt: "whiteboard-32486" – dasselbe Projekt, das auch die Whiteboard-App
// nutzt. Beide Apps teilen sich den Datenpfad "connect4/games", ein Spiel kann
// also auch geräteübergreifend zwischen beiden Apps gespielt werden.
//
// Die Werte stammen aus der Firebase-Konsole:
//   Projekt-Einstellungen (Zahnrad) → "Meine Apps" → Web-App </> → "Konfiguration".
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
