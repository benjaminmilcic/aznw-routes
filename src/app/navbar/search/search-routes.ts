export interface SearchableRoute {
  labelKey: string;
  label?: string;
  keywords: string[];
  description: string;
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
    description:
      'Startseite Homepage Landing Page Willkommen Welcome Dobrodošli Hauptseite main page hero section introduction Einführung',
    route: '/',
    icon: 'fa-solid fa-house',
    category: 'search.category.home',
    fragment: 'header',
  },
  {
    labelKey: 'sidebar.aboutMe',
    keywords: ['about', 'über mich', 'o meni', 'info', 'person', 'lebenslauf', 'cv'],
    description:
      'Über mich About me O meni Wer bin ich Who am I persönliche Informationen personal information osobne informacije Lebenslauf curriculum vitae Biographie biography biografija Entwickler Developer programer Erfahrung experience iskustvo',
    route: '/',
    icon: 'fa-solid fa-user',
    category: 'search.category.home',
    fragment: 'about',
  },
  {
    labelKey: 'sidebar.skills',
    keywords: ['skills', 'fähigkeiten', 'vještine', 'technik', 'technologie', 'angular', 'javascript', 'typescript', 'nestjs', 'ionic', 'html', 'css', 'cypress', 'bootstrap', 'tailwind', 'firebase', 'mysql', 'node', 'npm', 'docker'],
    description:
      'Fähigkeiten Skills Vještine Technologien Technologies Tehnologije HTML5 CSS3 JavaScript Angular Ionic Cypress Bootstrap Tailwind Firebase MySQL Node.js NestJS npm Docker Programmiersprachen programming languages programski jezici Frameworks Frontend Backend Fullstack Mobile Testing E2E Datenbank database baza podataka Container Kenntnisse knowledge znanje',
    route: '/',
    icon: 'fa-solid fa-screwdriver-wrench',
    category: 'search.category.home',
    fragment: 'skills',
  },
  {
    labelKey: 'sidebar.contact',
    keywords: ['kontakt', 'contact', 'email', 'nachricht', 'message', 'poruka'],
    description:
      'Kontakt Contact Kontaktiraj Nachricht senden Send message Pošalji poruku E-Mail Formular form obrazac Kontaktformular contact form kontakt obrazac Anfrage inquiry upit erreichen reach doći',
    route: '/',
    icon: 'fa-solid fa-id-card',
    category: 'search.category.home',
    fragment: 'contact',
  },
  {
    labelKey: '',
    label: 'Portfolio',
    keywords: ['portfolio', 'projekte', 'projects', 'projekti', 'work'],
    description:
      'Portfolio Projekte Projects Projekti Arbeiten Works Radovi Beispiele Examples Primjeri Referenzen references Reference Showcase Galerie Gallery Galerija abgeschlossene Projekte completed projects završeni projekti',
    route: '/',
    icon: 'fa-solid fa-toolbox',
    category: 'search.category.home',
    fragment: 'portfolio',
  },

  // Gimmicks
  {
    labelKey: 'gimmicks.menu.overview',
    keywords: ['overview', 'übersicht', 'pregled', 'gimmicks'],
    description:
      'Gimmicks Übersicht Overview Pregled alle Features all features sve značajke Funktionen functions funkcije interaktive Elemente interactive elements interaktivni elementi',
    route: '/gimmicks',
    icon: 'fa-solid fa-eye',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.weather',
    keywords: ['weather', 'wetter', 'vrijeme', 'temperature', 'temperatur', 'regen', 'rain', 'forecast', 'vorhersage'],
    description:
      'Wetter Weather Vrijeme aktuelle Temperatur current temperature trenutna temperatura Wettervorhersage weather forecast vremenska prognoza Regen rain kiša Sonne sun sunce Wind wind vjetar Luftfeuchtigkeit humidity vlažnost Grad Celsius Stadt city grad',
    route: '/gimmicks/weather',
    icon: 'fa-solid fa-cloud',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.map',
    keywords: ['map', 'karte', 'karta', 'standort', 'location', 'maptiler', 'leaflet', 'cities', 'städte'],
    description:
      'Karte Map Karta interaktive Karte interactive map interaktivna karta Leaflet MapTiler Standort location lokacija Städte cities gradovi Marker Navigation Weltkarte world map karta svijeta zoomen zoom zumirati',
    route: '/gimmicks/map',
    icon: 'fa-solid fa-map',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.calendar',
    keywords: ['calendar', 'kalender', 'kalendar', 'datum', 'date', 'feiertage', 'holidays', 'blagdani'],
    description:
      'Kalender Calendar Kalendar Termine appointments termini Datum date datum Feiertage holidays blagdani Monatsansicht month view mjesečni prikaz Tag day dan Woche week tjedan Jahr year godina Ereignisse events događaji',
    route: '/gimmicks/calendar',
    icon: 'fa-solid fa-calendar',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.guestbook',
    keywords: ['guestbook', 'gästebuch', 'knjiga gostiju', 'kommentar', 'comment'],
    description:
      'Gästebuch Guestbook Knjiga gostiju Kommentare comments komentari Einträge entries unosi Nachricht hinterlassen leave a message ostaviti poruku Besucher visitors posjetitelji schreiben write pisati Feedback Rückmeldung povratna informacija',
    route: '/gimmicks/guestbook',
    icon: 'fa-solid fa-book',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.charts',
    keywords: ['charts', 'diagramme', 'grafikon', 'statistik', 'statistics', 'graph'],
    description:
      'Diagramme Charts Grafikoni Statistiken statistics statistike Balkendiagramm bar chart stupčasti grafikon Kreisdiagramm pie chart tortni grafikon Liniendiagramm line chart linijski grafikon Daten data podaci Visualisierung visualization vizualizacija ng2-charts',
    route: '/gimmicks/charts',
    icon: 'fa-solid fa-chart-simple',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.jokes',
    keywords: ['jokes', 'witze', 'vicevi', 'humor', 'funny', 'lustig', 'auth', 'login'],
    description:
      'Witze Jokes Vicevi lustig funny smiješno Humor humor Spaß fun zabava zufällige Witze random jokes nasumični vicevi lachen laugh smijati se Authentifizierung authentication autentifikacija Login Anmeldung prijava',
    route: '/gimmicks/auth/main',
    icon: 'fa-solid fa-face-smile',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.games',
    keywords: ['games', 'spiele', 'igre', 'spielen', 'play'],
    description:
      'Spiele Games Igre spielen play igrati Spieleübersicht games overview pregled igara alle Spiele all games sve igre Unterhaltung entertainment zabava Browser-Spiele browser games igre u pregledniku',
    route: '/gimmicks/games',
    icon: 'fa-solid fa-gamepad',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.recipes',
    keywords: ['recipes', 'rezepte', 'recepti', 'kochen', 'cooking', 'essen', 'food'],
    description:
      'Rezepte Recipes Recepti kochen cooking kuhanje Essen food hrana Gerichte dishes jela Zutaten ingredients sastojci Anleitung instructions upute Mahlzeit meal obrok lecker delicious ukusno',
    route: '/gimmicks/recipes',
    icon: 'fa-solid fa-utensils',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.movies',
    keywords: ['movies', 'filme', 'filmovi', 'kino', 'cinema', 'tmdb'],
    description:
      'Filme Movies Filmovi Kino cinema kino Filmdatenbank movie database baza filmova TMDB Schauspieler actors glumci Bewertungen ratings ocjene Filmsuche movie search pretraga filmova Trailer trailers najave',
    route: '/gimmicks/movies',
    icon: 'fa-solid fa-film',
    category: 'search.category.gimmicks',
  },
  {
    labelKey: 'gimmicks.menu.imagegen',
    keywords: ['ai', 'ki', 'image', 'bild', 'slika', 'generator', 'cloudflare', 'text to image', 'stable diffusion', 'sdxl', 'flux', 'kunst', 'art'],
    description:
      'KI Bildgenerator AI Image Generator AI generator slika Text zu Bild text to image tekst u sliku künstliche Intelligenz artificial intelligence umjetna inteligencija Cloudflare Workers AI Stable Diffusion SDXL Flux Bilder erstellen create images stvaranje slika Kunst art umjetnost Prompt generieren generate generiraj',
    route: '/gimmicks/imagegen',
    icon: 'fa-solid fa-wand-magic-sparkles',
    category: 'search.category.gimmicks',
  },

  // Games
  {
    labelKey: 'gimmicks.games.connectFour',
    keywords: ['connect four', 'vier gewinnt', 'connect 4', 'vier', '4 gewinnt'],
    description:
      'Vier Gewinnt Connect Four Četiri u nizu Brettspiel board game društvena igra zwei Spieler two players dva igrača Strategie strategy strategija Chips einwerfen drop chips ubaci žetone vertikal horizontal diagonal Reihe row red',
    route: '/gimmicks/games/connect-four',
    icon: 'fa-solid fa-circle-dot',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.backgammon',
    keywords: ['backgammon', 'würfel', 'dice', 'steine', 'checkers', 'tavla', 'backgamon'],
    description:
      'Backgammon Brettspiel board game društvena igra Würfel dice kocke Steine checkers pločice Bar bar šipka Heim home kuća herausspielen bear off iznijeti gegen den Computer against the computer protiv računala online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/backgammon',
    icon: 'fa-solid fa-dice',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.dame',
    keywords: ['dame', 'checkers', 'dama', 'steine', 'schlagen'],
    description:
      'Dame Checkers Dama Brettspiel board game društvena igra Steine checkers pločice schlagen capture skočiti Dame king kraljica gegen den Computer against the computer protiv računala online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/dame',
    icon: 'fa-solid fa-chess-pawn',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.mill',
    keywords: ['mühle', 'mill', 'muehle', 'nine mens morris', 'mlin', 'dreierreihe'],
    description:
      'Mühle Nine Mens Morris Mlin Brettspiel board game društvena igra Mühle mill mlin Steine setzen place pieces postavi pločice Dreierreihe row of three tri u nizu gegen den Computer against the computer protiv računala online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/mill',
    icon: 'fa-solid fa-circle-nodes',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.chess',
    keywords: ['schach', 'chess', 'šah', 'sah', 'matt', 'checkmate', 'könig'],
    description:
      'Schach Chess Šah Brettspiel board game društvena igra Matt checkmate šah-mat König king kralj gegen den Computer against the computer protiv računala online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/schach',
    icon: 'fa-solid fa-chess',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.memoQuiz',
    keywords: ['memo', 'memory', 'paare', 'pairs', 'karten', 'cards'],
    description:
      'Memo Quiz Memory Memorija Gedächtnisspiel memory game igra pamćenja Karten aufdecken flip cards otkrij karte Paare finden find pairs pronađi parove Konzentration concentration koncentracija merken remember zapamtiti',
    route: '/gimmicks/games/memo-quiz',
    icon: 'fa-solid fa-brain',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.jigsaw',
    keywords: ['jigsaw', 'puzzle', 'slagalica'],
    description:
      'Puzzle Jigsaw Slagalica Teile zusammensetzen assemble pieces složiti dijelove Bild picture slika ziehen und ablegen drag and drop povuci i ispusti Geduld patience strpljenje zusammenfügen piece together sastaviti',
    route: '/gimmicks/games/jigsaw',
    icon: 'fa-solid fa-puzzle-piece',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.knowledgeQuiz',
    keywords: ['knowledge', 'quiz', 'wissen', 'fragen', 'questions', 'znanje'],
    description:
      'Wissensquiz Knowledge Quiz Kviz znanja Fragen beantworten answer questions odgovaraj na pitanja Allgemeinwissen general knowledge opće znanje Multiple Choice richtig falsch right wrong točno netočno Punkte points bodovi',
    route: '/gimmicks/games/knowledge-quiz',
    icon: 'fa-solid fa-question',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.flagQuiz.title',
    keywords: ['flag', 'flagge', 'zastava', 'country', 'land', 'länder'],
    description:
      'Flaggenquiz Flag Quiz Kviz zastava Länder erraten guess countries pogodi zemlje Flaggen erkennen recognize flags prepoznaj zastave Geographie geography geografija Welt world svijet Nation nation nacija',
    route: '/gimmicks/games/flag-quiz',
    icon: 'fa-solid fa-flag',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.ships',
    keywords: ['ships', 'schiffe', 'battleship', 'schiffe versenken', 'brodovi', 'potapanje'],
    description:
      'Schiffe versenken Battleship Potapanje brodova Flotte fleet flota Seeschlacht naval battle pomorska bitka Raster grid mreža schießen shoot pucaj Treffer hit pogodak versenken sink potopiti gegen den Computer against the computer protiv računala online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/ships',
    icon: 'fa-solid fa-ship',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.ludo',
    keywords: ['ludo', 'mensch ärgere dich nicht', 'mensch aergere dich nicht', 'čovječe ne ljuti se', 'covjece ne ljuti se'],
    description:
      'Mensch ärgere dich nicht Ludo Čovječe ne ljuti se Brettspiel board game društvena igra Würfel dice kocka würfeln roll baci Figuren pieces figure Garage home base kućica Ziel goal cilj schlagen capture pojesti rauswerfen knock out izbaciti online zu zweit two players dva igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/ludo',
    icon: 'fa-solid fa-dice-six',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.uno',
    keywords: ['uno', 'karten', 'cards', 'karte', 'kartenspiel', 'karte', 'karti', 'jednom'],
    description:
      'UNO Kartenspiel card game igra karata Karten cards karte Farbe color boja ablegen play odloži ziehen draw vuci Joker wild joker Zieh Vier draw four plus vier Aussetzen skip preskoči Richtungswechsel reverse promjena smjera gegen den Computer against the computer protiv računala online zu mehreren several players više igrača Spiel-Code game code kod igre',
    route: '/gimmicks/games/uno',
    icon: 'fa-solid fa-clone',
    category: 'search.category.games',
  },
  {
    labelKey: 'gimmicks.games.yahtzee',
    keywords: ['yahtzee', 'kniffel', 'würfel', 'dice', 'kockice'],
    description:
      'Yahtzee Kniffel Jamb Würfelspiel dice game igra s kockicama würfeln roll dice baci kockice Punkte sammeln collect points skupljaj bodove Full House Straße straight ulica Chance chance šansa Kombination combination kombinacija',
    route: '/gimmicks/games/yahtzee',
    icon: 'fa-solid fa-dice',
    category: 'search.category.games',
  },
  {
    labelKey: '',
    label: 'Tic-Tac-Toe',
    keywords: ['tic tac toe', 'tiktaktoe', 'kreuz', 'kreis', 'x o', 'noughts', 'crosses'],
    description:
      'Tic-Tac-Toe Drei Gewinnt Iks-Oks Kreuz und Kreis noughts and crosses križić kružić X und O drei in einer Reihe three in a row tri u nizu einfaches Spiel simple game jednostavna igra Strategie strategy strategija',
    route: '/gimmicks/games/tiktaktoe',
    icon: 'fa-solid fa-xmark',
    category: 'search.category.games',
  },
  {
    labelKey: '',
    label: 'Moorhuhn',
    keywords: ['moorhuhn', 'shooter', 'schießen', 'chicken', 'huhn'],
    description:
      'Moorhuhn Shoot Chicken Pucaj Kokoši Schießspiel shooting game igra pucanja Hühner abschießen shoot chickens pucaj kokoši Punkte sammeln collect points skupljaj bodove Klassiker classic klasik Retro Arcade zielen aim ciljati',
    route: '/gimmicks/games/moorhuhn',
    icon: 'fa-solid fa-crosshairs',
    category: 'search.category.games',
  },
  {
    labelKey: '',
    label: 'Minesweeper',
    keywords: ['minesweeper', 'minen', 'bomben', 'mines', 'bombs'],
    description:
      'Minesweeper Minenräumer Minobacač Minen finden find mines pronađi mine Bomben vermeiden avoid bombs izbjegni bombe Felder aufdecken reveal fields otkrij polja Zahlen numbers brojevi markieren mark označi Logik logic logika Rätsel puzzle zagonetka',
    route: '/gimmicks/games/minesweeper',
    icon: 'fa-solid fa-bomb',
    category: 'search.category.games',
  },

  // Recipes Sub-Pages
  {
    labelKey: 'gimmicks.recipes.recipeList',
    keywords: ['recipe list', 'rezeptliste', 'popis recepata', 'alle rezepte', 'all recipes'],
    description:
      'Rezeptliste Recipe List Popis Recepata alle Rezepte anzeigen show all recipes prikaži sve recepte durchsuchen browse pregledaj Sammlung collection kolekcija Übersicht overview pregled filtern filter filtriraj',
    route: '/gimmicks/recipes/list',
    icon: 'fa-solid fa-list',
    category: 'search.category.recipes',
  },
  {
    labelKey: 'gimmicks.recipes.addRecipe',
    keywords: ['add recipe', 'rezept hinzufügen', 'dodaj recept', 'neues rezept', 'new recipe', 'erstellen', 'create'],
    description:
      'Rezept hinzufügen Add Recipe Dodaj Recept neues Rezept erstellen create new recipe kreiraj novi recept Zutaten eingeben enter ingredients unesi sastojke Anleitung schreiben write instructions napiši upute speichern save spremi',
    route: '/gimmicks/recipes/add',
    icon: 'fa-solid fa-plus',
    category: 'search.category.recipes',
  },

  // Movies Sub-Pages
  {
    labelKey: 'gimmicks.movies.tabs.search',
    keywords: ['movie search', 'filmsuche', 'pretraži filmove', 'suchen'],
    description:
      'Filmsuche Movie Search Pretraga Filmova Filme suchen search movies traži filmove nach Titel suchen search by title traži po naslovu TMDB Datenbank database baza podataka Ergebnisse results rezultati',
    route: '/gimmicks/movies/search',
    icon: 'fa-solid fa-magnifying-glass',
    category: 'search.category.movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.popular',
    keywords: ['popular', 'beliebt', 'popularno', 'trending'],
    description:
      'Beliebte Filme Popular Movies Popularni Filmovi Trending angesagt u trendu meistgesehene Filme most watched movies najgledaniji filmovi aktuell current trenutno Top Charts',
    route: '/gimmicks/movies/popular',
    icon: 'fa-solid fa-fire',
    category: 'search.category.movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.topRated',
    keywords: ['top rated', 'bestbewertet', 'najbolje ocijenjeno', 'best', 'rating'],
    description:
      'Bestbewertete Filme Top Rated Movies Najbolje Ocijenjeni Filmovi beste Bewertungen best ratings najbolje ocjene Klassiker classics klasici Empfehlungen recommendations preporuke hochbewertet highly rated visoko ocijenjeno',
    route: '/gimmicks/movies/top-rated',
    icon: 'fa-solid fa-star',
    category: 'search.category.movies',
  },
  {
    labelKey: 'gimmicks.movies.tabs.nowPlaying',
    keywords: ['now playing', 'aktuell', 'trenutno', 'jetzt im kino', 'neu'],
    description:
      'Aktuell im Kino Now Playing Trenutno u Kinu neue Filme new movies novi filmovi jetzt im Kino now in cinema sada u kinu Neuerscheinungen new releases nova izdanja Premiere premiere premijera',
    route: '/gimmicks/movies/now-playing',
    icon: 'fa-solid fa-clapperboard',
    category: 'search.category.movies',
  },
];
