/**
 * Wegverzeichnis der App fuer datengetriebene Tests.
 *
 * Die Liste spiegelt `src/app/app.routes.ts`. Kommt dort eine Route dazu,
 * gehoert sie auch hierher - dann deckt `navigation/routing.cy.ts` sie
 * automatisch mit ab.
 *
 * Achtung: Ein Tippfehler im Pfad faellt NICHT ueber den Statuscode auf.
 * Unbekannte Pfade liefern HTTP 200 mit der PageNotFoundComponent. Genau
 * deshalb prueft der Routing-Test zusaetzlich, dass die 404-Seite NICHT
 * erscheint.
 */

/** Alle Spiele unter /gimmicks/games. */
export const GAME_PATHS = [
  'tiktaktoe',
  'connect-four',
  'backgammon',
  'dame',
  'mill',
  'schach',
  'memo-quiz',
  'jigsaw',
  'knowledge-quiz',
  'moorhuhn',
  'yahtzee',
  'minesweeper',
  'flag-quiz',
  'ships',
  'ludo',
  'uno',
  'trivia-quiz',
] as const;

export const GAME_ROUTES = GAME_PATHS.map((game) => `/gimmicks/games/${game}`);

/** Routen, die ohne Anmeldung direkt aufrufbar sind. */
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/gimmicks',
  '/gimmicks/map',
  '/gimmicks/calendar',
  '/gimmicks/guestbook',
  '/gimmicks/charts',
  '/gimmicks/weather',
  '/gimmicks/imagegen',
  '/gimmicks/countries',
  '/gimmicks/recipes/list',
  '/gimmicks/recipes/add',
  '/gimmicks/movies/popular',
  '/gimmicks/movies/top-rated',
  '/gimmicks/movies/now-playing',
  '/gimmicks/movies/search',
  '/gimmicks/auth/login',
  '/gimmicks/telegram/login',
  ...GAME_ROUTES,
];

/** Umleitungen aus app.routes.ts: aufgerufener Pfad -> erwartetes Ziel. */
export const REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/gimmicks/auth', to: '/gimmicks/auth/login' },
  { from: '/gimmicks/games', to: '/gimmicks/games/connect-four' },
  { from: '/gimmicks/recipes', to: '/gimmicks/recipes/list' },
  { from: '/gimmicks/movies', to: '/gimmicks/movies/popular' },

];

/** Anker der Startseite, die der knownFragmentGuard durchlaesst. */
export const HOME_FRAGMENTS = [
  'header',
  'about',
  'skills',
  'portfolio',
  'contact',
  'footer',
];
