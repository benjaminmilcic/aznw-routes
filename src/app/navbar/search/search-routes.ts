export interface SearchableRoute {
  labelKey: string;
  label?: string;       // Static label override (for entries without i18n key)
  keywords: string[];
  route: string;
  icon: string;
  category: string;
  fragment?: string;
}

export const SEARCHABLE_ROUTES: SearchableRoute[] = [
  // Home Sections
  {
    labelKey: 'sidebar.home',
    keywords: ['home', 'start', 'startseite', 'početna'],
    route: '/',
    icon: 'fa-solid fa-house',
    category: 'Home',
    fragment: 'header',
  },
  {
    labelKey: 'sidebar.aboutMe',
    keywords: ['about', 'über mich', 'o meni', 'info', 'person', 'lebenslauf', 'cv'],
    route: '/',
    icon: 'fa-solid fa-user',
    category: 'Home',
    fragment: 'about',
  },
  {
    labelKey: 'sidebar.skills',
    keywords: ['skills', 'fähigkeiten', 'vještine', 'technik', 'technologie', 'angular', 'typescript'],
    route: '/',
    icon: 'fa-solid fa-screwdriver-wrench',
    category: 'Home',
    fragment: 'skills',
  },
  {
    labelKey: 'sidebar.contact',
    keywords: ['kontakt', 'contact', 'email', 'nachricht', 'message', 'poruka'],
    route: '/',
    icon: 'fa-solid fa-id-card',
    category: 'Home',
    fragment: 'contact',
  },
  {
    labelKey: '',
    label: 'Portfolio',
    keywords: ['portfolio', 'projekte', 'projects', 'projekti', 'work'],
    route: '/',
    icon: 'fa-solid fa-toolbox',
    category: 'Home',
    fragment: 'portfolio',
  },

  // Gimmicks
  {
    labelKey: 'gimmicks.menu.overview',
    keywords: ['overview', 'übersicht', 'pregled', 'gimmicks'],
    route: '/gimmicks',
    icon: 'fa-solid fa-eye',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.weather',
    keywords: ['weather', 'wetter', 'vrijeme', 'temperature', 'temperatur', 'regen', 'rain', 'forecast', 'vorhersage'],
    route: '/gimmicks/weather',
    icon: 'fa-solid fa-cloud',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.map',
    keywords: ['map', 'karte', 'karta', 'standort', 'location', 'maptiler', 'leaflet', 'cities', 'städte'],
    route: '/gimmicks/map',
    icon: 'fa-solid fa-map',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.calendar',
    keywords: ['calendar', 'kalender', 'kalendar', 'datum', 'date', 'feiertage', 'holidays', 'blagdani'],
    route: '/gimmicks/calendar',
    icon: 'fa-solid fa-calendar',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.guestbook',
    keywords: ['guestbook', 'gästebuch', 'knjiga gostiju', 'kommentar', 'comment'],
    route: '/gimmicks/guestbook',
    icon: 'fa-solid fa-book',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.charts',
    keywords: ['charts', 'diagramme', 'grafikon', 'statistik', 'statistics', 'graph'],
    route: '/gimmicks/charts',
    icon: 'fa-solid fa-chart-simple',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.jokes',
    keywords: ['jokes', 'witze', 'vicevi', 'humor', 'funny', 'lustig', 'auth', 'login'],
    route: '/gimmicks/auth/main',
    icon: 'fa-solid fa-face-smile',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.games',
    keywords: ['games', 'spiele', 'igre', 'spielen', 'play'],
    route: '/gimmicks/games',
    icon: 'fa-solid fa-gamepad',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.recipes',
    keywords: ['recipes', 'rezepte', 'recepti', 'kochen', 'cooking', 'essen', 'food'],
    route: '/gimmicks/recipes',
    icon: 'fa-solid fa-utensils',
    category: 'Gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.movies',
    keywords: ['movies', 'filme', 'filmovi', 'kino', 'cinema', 'tmdb'],
    route: '/gimmicks/movies',
    icon: 'fa-solid fa-film',
    category: 'Gimmicks',
  },

  // Games
  {
    labelKey: 'gimmicks.games.connectFour',
    keywords: ['connect four', 'vier gewinnt', 'connect 4', 'vier', '4 gewinnt'],
    route: '/gimmicks/games/connect-four',
    icon: 'fa-solid fa-circle-dot',
    category: 'Games',
  },
  {
    labelKey: 'gimmicks.games.memoQuiz',
    keywords: ['memo', 'memory', 'paare', 'pairs', 'karten', 'cards'],
    route: '/gimmicks/games/memo-quiz',
    icon: 'fa-solid fa-brain',
    category: 'Games',
  },
  {
    labelKey: 'gimmicks.games.jigsaw',
    keywords: ['jigsaw', 'puzzle', 'slagalica'],
    route: '/gimmicks/games/jigsaw',
    icon: 'fa-solid fa-puzzle-piece',
    category: 'Games',
  },
  {
    labelKey: 'gimmicks.games.knowledgeQuiz',
    keywords: ['knowledge', 'quiz', 'wissen', 'fragen', 'questions', 'znanje'],
    route: '/gimmicks/games/knowledge-quiz',
    icon: 'fa-solid fa-question',
    category: 'Games',
  },
  {
    labelKey: 'gimmicks.games.flagQuiz.title',
    keywords: ['flag', 'flagge', 'zastava', 'country', 'land', 'länder'],
    route: '/gimmicks/games/flag-quiz',
    icon: 'fa-solid fa-flag',
    category: 'Games',
  },
  {
    labelKey: 'gimmicks.games.yahtzee',
    keywords: ['yahtzee', 'kniffel', 'würfel', 'dice', 'kockice'],
    route: '/gimmicks/games/yahtzee',
    icon: 'fa-solid fa-dice',
    category: 'Games',
  },
  {
    labelKey: '',
    label: 'Tic-Tac-Toe',
    keywords: ['tic tac toe', 'tiktaktoe', 'kreuz', 'kreis', 'x o', 'noughts', 'crosses'],
    route: '/gimmicks/games/tiktaktoe',
    icon: 'fa-solid fa-xmark',
    category: 'Games',
  },
  {
    labelKey: '',
    label: 'Moorhuhn',
    keywords: ['moorhuhn', 'shooter', 'schießen', 'chicken', 'huhn'],
    route: '/gimmicks/games/moorhuhn',
    icon: 'fa-solid fa-crosshairs',
    category: 'Games',
  },
  {
    labelKey: '',
    label: 'Minesweeper',
    keywords: ['minesweeper', 'minen', 'bomben', 'mines', 'bombs'],
    route: '/gimmicks/games/minesweeper',
    icon: 'fa-solid fa-bomb',
    category: 'Games',
  },

  // Recipes Sub-Pages
  {
    labelKey: 'gimmicks.recipes.recipeList',
    keywords: ['recipe list', 'rezeptliste', 'popis recepata', 'alle rezepte', 'all recipes'],
    route: '/gimmicks/recipes/list',
    icon: 'fa-solid fa-list',
    category: 'Recipes',
  },
  {
    labelKey: 'gimmicks.recipes.addRecipe',
    keywords: ['add recipe', 'rezept hinzufügen', 'dodaj recept', 'neues rezept', 'new recipe', 'erstellen', 'create'],
    route: '/gimmicks/recipes/add',
    icon: 'fa-solid fa-plus',
    category: 'Recipes',
  },

  // Movies Sub-Pages
  {
    labelKey: 'gimmicks.movies.tabs.search',
    keywords: ['movie search', 'filmsuche', 'pretraži filmove', 'suchen'],
    route: '/gimmicks/movies/search',
    icon: 'fa-solid fa-magnifying-glass',
    category: 'Movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.popular',
    keywords: ['popular', 'beliebt', 'popularno', 'trending'],
    route: '/gimmicks/movies/popular',
    icon: 'fa-solid fa-fire',
    category: 'Movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.topRated',
    keywords: ['top rated', 'bestbewertet', 'najbolje ocijenjeno', 'best', 'rating'],
    route: '/gimmicks/movies/top-rated',
    icon: 'fa-solid fa-star',
    category: 'Movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.nowPlaying',
    keywords: ['now playing', 'aktuell', 'trenutno', 'jetzt im kino', 'neu'],
    route: '/gimmicks/movies/now-playing',
    icon: 'fa-solid fa-clapperboard',
    category: 'Movies',
  },
];
