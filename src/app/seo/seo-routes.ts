/**
 * Title and description per route.
 *
 * The set deliberately matches src/sitemap.xml: only publicly
 * reachable, static pages. Routes behind that (guards, parameter routes,
 * /404) fall back to the default text in the SeoService - they are
 * not relevant for search anyway.
 *
 * The titles come from existing translations (gimmicks.menu.*,
 * gimmicks.games.*), so that page name and menu item don't diverge.
 * Only proper names without a translation are in there as a fixed `title`.
 *
 * When adding: the path must belong to a real route in app.routes.ts.
 * Unknown paths return HTTP 200 with the PageNotFoundComponent,
 * so a typo does NOT show up here via the status code.
 */
export interface SeoRoute {
  /** Absolute path, exactly as in the sitemap. */
  path: string;
  /** i18n key of the page name. */
  titleKey?: string;
  /** Fixed page name if there is no translation (proper name). */
  title?: string;
  /** Key below `seo.description`. */
  descriptionKey: string;
}

export const SEO_ROUTES: SeoRoute[] = [
  // The home page carries the full title without a suffix.
  { path: '/', descriptionKey: 'home' },

  { path: '/gimmicks', titleKey: 'gimmicks.menu.overview', descriptionKey: 'gimmicks' },
  { path: '/gimmicks/map', titleKey: 'gimmicks.menu.map', descriptionKey: 'map' },
  { path: '/gimmicks/calendar', titleKey: 'gimmicks.menu.calendar', descriptionKey: 'calendar' },
  { path: '/gimmicks/guestbook', titleKey: 'gimmicks.menu.guestbook', descriptionKey: 'guestbook' },
  { path: '/gimmicks/charts', titleKey: 'gimmicks.menu.charts', descriptionKey: 'charts' },
  { path: '/gimmicks/weather', titleKey: 'gimmicks.menu.weather', descriptionKey: 'weather' },
  { path: '/gimmicks/imagegen', titleKey: 'gimmicks.menu.imagegen', descriptionKey: 'imagegen' },
  { path: '/gimmicks/countries', titleKey: 'gimmicks.menu.countries', descriptionKey: 'countries' },

  { path: '/gimmicks/recipes/list', titleKey: 'gimmicks.recipes.recipeList', descriptionKey: 'recipesList' },

  { path: '/gimmicks/movies/popular', titleKey: 'gimmicks.movies.tabs.popular', descriptionKey: 'moviesPopular' },
  { path: '/gimmicks/movies/top-rated', titleKey: 'gimmicks.movies.tabs.topRated', descriptionKey: 'moviesTopRated' },
  { path: '/gimmicks/movies/now-playing', titleKey: 'gimmicks.movies.tabs.nowPlaying', descriptionKey: 'moviesNowPlaying' },

  { path: '/gimmicks/games/connect-four', titleKey: 'gimmicks.games.connectFour', descriptionKey: 'gamesConnectFour' },
  { path: '/gimmicks/games/tiktaktoe', title: 'Tic-Tac-Toe', descriptionKey: 'gamesTiktaktoe' },
  { path: '/gimmicks/games/backgammon', titleKey: 'gimmicks.games.backgammon', descriptionKey: 'gamesBackgammon' },
  { path: '/gimmicks/games/dame', titleKey: 'gimmicks.games.dame', descriptionKey: 'gamesDame' },
  { path: '/gimmicks/games/mill', titleKey: 'gimmicks.games.mill', descriptionKey: 'gamesMill' },
  { path: '/gimmicks/games/schach', titleKey: 'gimmicks.games.chess', descriptionKey: 'gamesSchach' },
  { path: '/gimmicks/games/memo-quiz', titleKey: 'gimmicks.games.memoQuiz', descriptionKey: 'gamesMemoQuiz' },
  { path: '/gimmicks/games/jigsaw', titleKey: 'gimmicks.games.jigsaw', descriptionKey: 'gamesJigsaw' },
  { path: '/gimmicks/games/knowledge-quiz', titleKey: 'gimmicks.games.knowledgeQuiz', descriptionKey: 'gamesKnowledgeQuiz' },
  { path: '/gimmicks/games/moorhuhn', title: 'Moorhuhn', descriptionKey: 'gamesMoorhuhn' },
  { path: '/gimmicks/games/yahtzee', titleKey: 'gimmicks.games.yahtzee', descriptionKey: 'gamesYahtzee' },
  { path: '/gimmicks/games/minesweeper', title: 'Minesweeper', descriptionKey: 'gamesMinesweeper' },
  { path: '/gimmicks/games/flag-quiz', titleKey: 'gimmicks.games.flagQuiz.title', descriptionKey: 'gamesFlagQuiz' },
  { path: '/gimmicks/games/ships', titleKey: 'gimmicks.games.ships', descriptionKey: 'gamesShips' },
  { path: '/gimmicks/games/ludo', titleKey: 'gimmicks.games.ludo', descriptionKey: 'gamesLudo' },
  { path: '/gimmicks/games/uno', titleKey: 'gimmicks.games.uno', descriptionKey: 'gamesUno' },
  { path: '/gimmicks/games/trivia-quiz', titleKey: 'gimmicks.games.triviaQuiz', descriptionKey: 'gamesTriviaQuiz' },
];
