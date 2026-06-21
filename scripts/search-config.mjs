/**
 * Single Source of Truth für den semantischen Such-Index.
 *
 * Jede Route definiert:
 *   route      – Ziel-Pfad (Angular Router)
 *   fragment   – optionaler Anker (für Homepage-Sektionen)
 *   labelKey   – i18n-Key für die Anzeige (oder)
 *   label      – fester Anzeigetext (z. B. Eigennamen)
 *   icon       – FontAwesome-Klasse für die Trefferliste
 *   category   – i18n-Key der Kategorie (Gruppierung)
 *   prefixes   – i18n-Key-Präfixe; ALLE darunterliegenden Strings (de/en/hr)
 *                fließen automatisch in den Embedding-Text ein
 *   extra      – zusätzliche, mehrsprachige Synonyme/Stichwörter von Hand
 *
 * Hardcodierte Texte (z. B. die Tech-Stack-Listen in
 * src/app/pages/gimmicks/overview/overview.constants.ts) werden vom Build-Skript
 * automatisch anhand des `route`-Pfads (== goToPage) ergänzt.
 */
export const SEARCH_ROUTES = [
  // ── Homepage-Sektionen ───────────────────────────────────────────────
  {
    route: '/', fragment: 'header', labelKey: 'sidebar.home',
    icon: 'fa-solid fa-house', category: 'search.category.home',
    prefixes: ['header'],
    extra: 'Startseite Homepage Landing Page Willkommen Welcome Dobrodošli Hero Hauptseite. Benjamin Milčić Milcic Full Stack Developer Entwickler. Angular NestJS Ionic TypeScript Node.js Cypress Docker MySQL Tailwind Firebase RxJS NgRx',
  },
  {
    route: '/', fragment: 'about', labelKey: 'sidebar.aboutMe',
    icon: 'fa-solid fa-user', category: 'search.category.home',
    prefixes: ['about'],
    extra: 'Über mich About me O meni Lebenslauf CV Biographie Entwickler Developer Erfahrung experience iskustvo wer bin ich',
  },
  {
    route: '/', fragment: 'skills', labelKey: 'sidebar.skills',
    icon: 'fa-solid fa-screwdriver-wrench', category: 'search.category.home',
    prefixes: ['skills'],
    // Skill-Namen exakt wie in skills.component.html (große & kleine Version).
    extra: 'Fähigkeiten Skills Vještine Technologien Frameworks Frontend Backend Fullstack. HTML5 CSS3 JavaScript TypeScript Angular Ionic Cypress RxJs RxJS Tailwind MySQL Node.js NestJS npm NgRx Firebase Docker Bootstrap',
  },
  {
    route: '/', fragment: 'portfolio', label: 'Portfolio',
    icon: 'fa-solid fa-toolbox', category: 'search.category.home',
    prefixes: ['portfolio'],
    extra: 'Portfolio Projekte Projects Projekti Arbeiten Referenzen references Showcase Beispiele',
  },
  {
    route: '/', fragment: 'contact', labelKey: 'sidebar.contact',
    icon: 'fa-solid fa-id-card', category: 'search.category.home',
    prefixes: ['contact'],
    extra: 'Kontakt Contact Kontaktiraj Email Nachricht message poruka Anfrage erreichen schreiben',
  },

  // ── Gimmicks-Übersicht ───────────────────────────────────────────────
  {
    route: '/gimmicks', labelKey: 'gimmicks.menu.overview',
    icon: 'fa-solid fa-eye', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.overview', 'gimmicks.menu.overview'],
    extra: 'Gimmicks Spielwiese Playground Übersicht Overview Pregled alle Features Funktionen',
    // Die Overview-Seite zeigt ALLE Türen samt Tech-Stack -> alle Elemente aus
    // overview.constants.ts aggregieren (NestJS, Wikimedia, TMDB, Leaflet, …).
    aggregateAllElements: true,
  },

  // ── Einzelne Gimmicks ────────────────────────────────────────────────
  {
    route: '/gimmicks/weather', labelKey: 'gimmicks.menu.weather',
    icon: 'fa-solid fa-cloud', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.weather', 'gimmicks.menu.weather'],
    extra: 'Wie wird das Wetter wie warm ist es Temperatur Regen Sonne Vorhersage forecast vrijeme prognoza',
  },
  {
    route: '/gimmicks/map', labelKey: 'gimmicks.menu.map',
    icon: 'fa-solid fa-map', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.map', 'gimmicks.menu.map'],
    extra: 'Karte Map Karta Standort Städte cities gradovi Navigation Weltkarte',
  },
  {
    route: '/gimmicks/calendar', labelKey: 'gimmicks.menu.calendar',
    icon: 'fa-solid fa-calendar', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.calendar', 'gimmicks.menu.calendar'],
    extra: 'Kalender Calendar Kalendar Datum Feiertage holidays blagdani Termine Monat',
  },
  {
    route: '/gimmicks/guestbook', labelKey: 'gimmicks.menu.guestbook',
    icon: 'fa-solid fa-book', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.guestbook', 'gimmicks.menu.guestbook'],
    extra: 'Gästebuch Guestbook Knjiga gostiju Kommentar comment Nachricht hinterlassen Feedback',
  },
  {
    route: '/gimmicks/charts', labelKey: 'gimmicks.menu.charts',
    icon: 'fa-solid fa-chart-simple', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.charts', 'gimmicks.menu.charts'],
    extra: 'Diagramme Charts Grafikoni Statistik graph Balkendiagramm Kreisdiagramm Daten Visualisierung',
  },
  {
    route: '/gimmicks/auth/main', labelKey: 'gimmicks.menu.jokes',
    icon: 'fa-solid fa-face-smile', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.jokes', 'gimmicks.menu.jokes'],
    extra: 'Witze Jokes Vicevi Humor lustig funny Login Anmeldung Authentifizierung Buch bestellen',
  },
  {
    route: '/gimmicks/countries', labelKey: 'gimmicks.menu.countries',
    icon: 'fa-solid fa-earth-europe', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.countries', 'gimmicks.menu.countries'],
    extra: 'Länder Countries Zemlje Welt Hauptstadt Bevölkerung Flagge Kontinent Weltkarte',
  },
  {
    route: '/gimmicks/imagegen', labelKey: 'gimmicks.menu.imagegen',
    icon: 'fa-solid fa-wand-magic-sparkles', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.imagegen', 'gimmicks.menu.imagegen'],
    extra: 'KI Bildgenerator AI Image Generator Text zu Bild künstliche Intelligenz Kunst art umjetna inteligencija',
  },
  {
    route: '/gimmicks/telegram', label: 'Telegram',
    icon: 'fa-brands fa-telegram', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.telegram'],
    extra: 'Telegram Chat Messenger Nachrichten chatten Webchat poruke',
  },

  // ── Spiele ───────────────────────────────────────────────────────────
  {
    route: '/gimmicks/games', labelKey: 'gimmicks.menu.games',
    icon: 'fa-solid fa-gamepad', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.menu.games'],
    extra: 'Spiele Games Igre spielen play Vier Gewinnt Memory Puzzle Wissensquiz Flaggenquiz Yahtzee Kniffel Tic Tac Toe Moorhuhn Minesweeper',
  },
  {
    route: '/gimmicks/games/connect-four', labelKey: 'gimmicks.games.connectFour',
    icon: 'fa-solid fa-circle-dot', category: 'search.category.games',
    extra: 'Vier Gewinnt Connect Four 4 Gewinnt Četiri u nizu Brettspiel Strategie',
  },
  {
    route: '/gimmicks/games/memo-quiz', labelKey: 'gimmicks.games.memoQuiz',
    icon: 'fa-solid fa-brain', category: 'search.category.games',
    extra: 'Memo Memory Memorija Paare pairs Karten cards Gedächtnis pamćenje',
  },
  {
    route: '/gimmicks/games/jigsaw', labelKey: 'gimmicks.games.jigsaw',
    icon: 'fa-solid fa-puzzle-piece', category: 'search.category.games',
    extra: 'Puzzle Jigsaw Slagalica Teile zusammensetzen drag and drop',
  },
  {
    route: '/gimmicks/games/knowledge-quiz', labelKey: 'gimmicks.games.knowledgeQuiz',
    icon: 'fa-solid fa-question', category: 'search.category.games',
    extra: 'Wissensquiz Knowledge Quiz Kviz znanja Fragen questions Allgemeinwissen',
  },
  {
    route: '/gimmicks/games/flag-quiz', labelKey: 'gimmicks.games.flagQuiz.title',
    icon: 'fa-solid fa-flag', category: 'search.category.games',
    prefixes: ['gimmicks.games.flagQuiz'],
    extra: 'Flaggenquiz Flag Quiz Kviz zastava Länder erraten Geographie Flaggen',
  },
  {
    route: '/gimmicks/games/yahtzee', labelKey: 'gimmicks.games.yahtzee',
    icon: 'fa-solid fa-dice', category: 'search.category.games',
    extra: 'Yahtzee Kniffel Jamb Würfel dice kockice Würfelspiel',
  },
  {
    route: '/gimmicks/games/tiktaktoe', label: 'Tic-Tac-Toe',
    icon: 'fa-solid fa-xmark', category: 'search.category.games',
    extra: 'Tic Tac Toe Drei Gewinnt Iks Oks Kreuz Kreis X O noughts and crosses',
  },
  {
    route: '/gimmicks/games/moorhuhn', label: 'Moorhuhn',
    icon: 'fa-solid fa-crosshairs', category: 'search.category.games',
    extra: 'Moorhuhn Shooter schießen shoot Huhn chicken kokoš Arcade',
  },
  {
    route: '/gimmicks/games/minesweeper', label: 'Minesweeper',
    icon: 'fa-solid fa-bomb', category: 'search.category.games',
    extra: 'Minesweeper Minenräumer Minen mines Bomben bombs Logik',
  },

  // ── Rezepte ──────────────────────────────────────────────────────────
  {
    route: '/gimmicks/recipes', labelKey: 'gimmicks.menu.recipes',
    icon: 'fa-solid fa-utensils', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.recipes', 'gimmicks.menu.recipes'],
    extra: 'Rezepte Recipes Recepti kochen cooking Essen food Gerichte Zutaten',
  },
  {
    route: '/gimmicks/recipes/list', labelKey: 'gimmicks.recipes.recipeList',
    icon: 'fa-solid fa-list', category: 'search.category.recipes',
    extra: 'Rezeptliste Recipe List Popis recepata alle Rezepte durchsuchen',
  },
  {
    route: '/gimmicks/recipes/add', labelKey: 'gimmicks.recipes.addRecipe',
    icon: 'fa-solid fa-plus', category: 'search.category.recipes',
    extra: 'Rezept hinzufügen Add Recipe Dodaj recept neues Rezept erstellen',
  },

  // ── Filme ────────────────────────────────────────────────────────────
  {
    route: '/gimmicks/movies', labelKey: 'gimmicks.menu.movies',
    icon: 'fa-solid fa-film', category: 'search.category.gimmicks',
    prefixes: ['gimmicks.movies', 'gimmicks.menu.movies'],
    extra: 'Filme Movies Filmovi Kino cinema Schauspieler actors Trailer TMDB',
  },
  {
    route: '/gimmicks/movies/search', labelKey: 'gimmicks.movies.tabs.search',
    icon: 'fa-solid fa-magnifying-glass', category: 'search.category.movies',
    extra: 'Filmsuche Movie Search Pretraga filmova Filme suchen nach Titel',
  },
  {
    route: '/gimmicks/movies/popular', labelKey: 'gimmicks.movies.tabs.popular',
    icon: 'fa-solid fa-fire', category: 'search.category.movies',
    extra: 'Beliebte Filme Popular Movies Popularni Trending angesagt',
  },
  {
    route: '/gimmicks/movies/top-rated', labelKey: 'gimmicks.movies.tabs.topRated',
    icon: 'fa-solid fa-star', category: 'search.category.movies',
    extra: 'Bestbewertete Filme Top Rated beste Bewertungen Klassiker',
  },
  {
    route: '/gimmicks/movies/now-playing', labelKey: 'gimmicks.movies.tabs.nowPlaying',
    icon: 'fa-solid fa-clapperboard', category: 'search.category.movies',
    extra: 'Aktuell im Kino Now Playing neue Filme Neuerscheinungen Premiere',
  },
];
