/**
 * Titel und Beschreibung je Route.
 *
 * Die Menge deckt sich bewusst mit src/sitemap.xml: nur oeffentlich
 * erreichbare, statische Seiten. Routen dahinter (Guards, Parameter-Routen,
 * /404) fallen im SeoService auf den Standardtext zurueck - fuer die Suche
 * sind sie ohnehin nicht relevant.
 *
 * Die Titel kommen aus bereits vorhandenen Uebersetzungen (gimmicks.menu.*,
 * gimmicks.games.*), damit Seitenname und Menuepunkt nicht auseinanderlaufen.
 * Nur Eigennamen ohne Uebersetzung stehen als fester `title` drin.
 *
 * Beim Ergaenzen: der Pfad muss zu einer echten Route in app.routes.ts
 * gehoeren. Unbekannte Pfade liefern HTTP 200 mit der PageNotFoundComponent,
 * ein Tippfehler faellt hier also NICHT ueber den Statuscode auf.
 */
export interface SeoRoute {
  /** Absoluter Pfad, exakt wie in der Sitemap. */
  path: string;
  /** i18n-Schluessel des Seitennamens. */
  titleKey?: string;
  /** Fester Seitenname, wenn es keine Uebersetzung gibt (Eigenname). */
  title?: string;
  /** Schluessel unterhalb von `seo.description`. */
  descriptionKey: string;
}

export const SEO_ROUTES: SeoRoute[] = [
  // Startseite traegt den vollstaendigen Titel ohne Zusatz.
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
