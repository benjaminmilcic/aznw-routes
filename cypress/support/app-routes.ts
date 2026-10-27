/**
 * Route directory of the app for data-driven tests.
 *
 * The list mirrors `src/app/app.routes.ts`. If a route is added there,
 * it belongs here too - then `navigation/routing.cy.ts` covers it
 * automatically.
 *
 * Caution: A typo in the path does NOT show up via the status code.
 * Unknown paths return HTTP 200 with the PageNotFoundComponent. Exactly
 * for that reason the routing test additionally checks that the 404 page does NOT
 * appear.
 */

/** All games under /gimmicks/games. */
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

/** Routes that can be opened directly without signing in. */
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
  '/chat',
  ...GAME_ROUTES,
];

/** Redirects from app.routes.ts: requested path -> expected target. */
export const REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/gimmicks/auth', to: '/gimmicks/auth/login' },
  { from: '/gimmicks/games', to: '/gimmicks/games/connect-four' },
  { from: '/gimmicks/recipes', to: '/gimmicks/recipes/list' },
  { from: '/gimmicks/movies', to: '/gimmicks/movies/popular' },

];

/** Anchors of the home page that the knownFragmentGuard lets through. */
export const HOME_FRAGMENTS = [
  'header',
  'about',
  'skills',
  'portfolio',
  'contact',
  'footer',
];
