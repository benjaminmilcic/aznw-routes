/// <reference types="cypress" />

/**
 * Eigene Befehle fuer aznw-routes.
 *
 * Zwei Dinge muessen in dieser App vor dem Start der Anwendung passieren und
 * lassen sich deshalb nicht nachtraeglich im Test erledigen:
 *
 *  1. Die Sprache. Der AppComponent liest im Konstruktor `navigator.language`
 *     und ruft damit `translate.use(..)`. Wer die Sprache eines Tests
 *     festnageln will, muss `navigator.language` VOR dem Bootstrap setzen.
 *  2. Der Zufall. Spiele ziehen teilweise schon im Konstruktor Zufallszahlen.
 *     Ein spaeter gesetzter Stub kaeme zu spaet.
 *
 * Beides erledigt `cy.visitApp()` in `onBeforeLoad`.
 */

export type AppLanguage = 'de' | 'en' | 'hr';

/** Browsersprache, die im AppComponent auf die jeweilige App-Sprache abbildet. */
const BROWSER_LOCALE: Record<AppLanguage, string> = {
  de: 'de-DE',
  en: 'en-US',
  hr: 'hr-HR',
};

export interface SeedAuthOptions {
  email?: string;
  id?: string;
  /** Gueltigkeit in Sekunden. Negativ = bereits abgelaufen. */
  expiresInSeconds?: number;
}

export interface VisitAppOptions {
  /** Sprache, in der die App startet. Standard: de. */
  lang?: AppLanguage;
  /** Legt vor dem Start einen angemeldeten Benutzer in den localStorage. */
  auth?: boolean | SeedAuthOptions;
  /** Ersetzt Math.random durch einen deterministischen Generator. */
  randomSeed?: number;
  /** Feste Folge von Zufallswerten, die zyklisch zurueckgegeben wird. */
  randomValues?: number[];
  /** Zusaetzliche Vorbereitung am Fenster, bevor die App startet. */
  onBeforeLoad?: (win: Cypress.AUTWindow) => void;
}

/** 1x1-Pixel-PNG als Antwort fuer Kartenkacheln und externe Bilder. */
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export function transparentPng() {
  return Cypress.Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
}

/**
 * Baut ein JWT mit gueltiger Struktur (Header.Payload.Signatur), aber ohne
 * echte Signatur. Reicht dem Frontend: `AuthService.setUserFromToken` liest
 * nur die Nutzdaten, geprueft wird die Signatur ausschliesslich im Backend.
 */
export function makeJwt(
  email = 'testuser@example.com',
  sub = 'test-user-id',
  expiresInSeconds = 3600,
): string {
  const base64url = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    email,
    sub,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return header + '.' + payload + '.testsignature';
}

/** Inhalt des localStorage-Schluessels `authUserData`, so wie AuthUser ihn ablegt. */
export function authUserData(options: SeedAuthOptions = {}) {
  const email = options.email ?? 'testuser@example.com';
  const id = options.id ?? 'test-user-id';
  const expiresIn = options.expiresInSeconds ?? 3600;

  return {
    email,
    id,
    _token: makeJwt(email, id, Math.abs(expiresIn)),
    _tokenExpirationDate: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Deterministischer Ersatz fuer Math.random (mulberry32). */
function installSeededRandom(win: Cypress.AUTWindow, seed: number): void {
  let state = seed >>> 0;
  win.Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gibt eine feste Folge von Werten zurueck und beginnt danach von vorn. */
function installFixedRandom(win: Cypress.AUTWindow, values: number[]): void {
  let index = 0;
  win.Math.random = () => values[index++ % values.length];
}

Cypress.Commands.add(
  'visitApp',
  (path: string, options: VisitAppOptions = {}) => {
    const lang = options.lang ?? 'de';

    cy.visit(path, {
      onBeforeLoad(win) {
        const locale = BROWSER_LOCALE[lang];
        Object.defineProperty(win.navigator, 'language', {
          value: locale,
          configurable: true,
        });
        Object.defineProperty(win.navigator, 'languages', {
          value: [locale],
          configurable: true,
        });

        if (options.auth) {
          const seed = options.auth === true ? {} : options.auth;
          win.localStorage.setItem(
            'authUserData',
            JSON.stringify(authUserData(seed)),
          );
        }

        if (options.randomValues) {
          installFixedRandom(win, options.randomValues);
        } else if (options.randomSeed !== undefined) {
          installSeededRandom(win, options.randomSeed);
        }

        options.onBeforeLoad?.(win);
      },
    });

    // Der Ladebildschirm aus index.html verschwindet erst, wenn die erste
    // Route samt Lazy-Chunk fertig ist. Vorher hat kein Test etwas zu suchen.
    cy.get('#appLoader', { timeout: 90000 }).should('not.exist');
  },
);

Cypress.Commands.add('byCy', (name: string) => cy.get('[data-cy="' + name + '"]'));

/**
 * Text eines Elements ohne umgebende Leerzeichen.
 *
 * Angular rendert Ausdruecke wie `{{ board[0][0] }}` samt der Zeilenumbrueche
 * aus dem Template; im DOM steht dann " X ". `have.text` schlaegt
 * dabei fehl, obwohl die Anzeige stimmt. Als Query ist der Befehl
 * wiederholbar - `should` wartet also weiterhin auf den erwarteten Wert.
 */
Cypress.Commands.addQuery('trimmedText', function trimmedText() {
  return (subject: JQuery<HTMLElement>) => subject.text().trim();
});

/**
 * Schaltet alles ab, was ein Test weder braucht noch beeinflussen kann:
 * Schriften, Icon-Kits, das Google-Maps-Skript, Kartenkacheln und die
 * Besucherstatistik. Laeuft global vor jedem Test.
 *
 * Wichtig: das Google-Maps-Skript wird bewusst durch eine LEERE Datei ersetzt.
 * Damit ruft es seinen Callback nie auf, `MapService.mapsReady` bleibt false
 * und die Seite verhaelt sich genau wie mit fehlendem API-Key - nur ohne
 * Netzwerkzugriff und ohne Kosten.
 */
Cypress.Commands.add('stubExternals', () => {
  const emptyScript = {
    statusCode: 200,
    headers: { 'content-type': 'application/javascript' },
    body: '',
  };

  cy.intercept({ hostname: 'maps.googleapis.com' }, emptyScript);
  cy.intercept({ hostname: 'kit.fontawesome.com' }, emptyScript);
  cy.intercept({ hostname: 'use.fontawesome.com' }, emptyScript);
  cy.intercept({ hostname: 'ka-f.fontawesome.com' }, emptyScript);

  cy.intercept(
    { hostname: 'fonts.googleapis.com' },
    { statusCode: 200, headers: { 'content-type': 'text/css' }, body: '' },
  );
  cy.intercept({ hostname: 'fonts.gstatic.com' }, { statusCode: 200, body: '' });

  // Kartenkacheln und externe Bilder: ein transparentes Pixel reicht.
  const pixel = {
    statusCode: 200,
    headers: { 'content-type': 'image/png' },
    body: transparentPng(),
  };
  cy.intercept({ hostname: /openstreetmap\.org$/ }, pixel);
  cy.intercept({ hostname: /maptiler\.com$/ }, pixel);
  cy.intercept({ hostname: 'image.tmdb.org' }, pixel);

  // Besucherstatistik: laeuft nur im Prod-Build, wird hier trotzdem
  // abgefangen, damit ein Testlauf niemals in der echten Auswertung landet.
  cy.intercept('POST', '**/analytics/**', { statusCode: 204, body: {} }).as(
    'analytics',
  );
});

/**
 * Faengt jede Anfrage an die eigene API ab, fuer die kein Test etwas
 * Spezifisches vorgibt, und beantwortet sie mit einer leeren Liste.
 * Verhindert, dass ein Test unbemerkt gegen ein laufendes lokales Backend
 * arbeitet und dadurch je nach Umgebung anders ausgeht.
 *
 * Spezifischere `cy.intercept`-Regeln, die ein Test SPAETER registriert,
 * gewinnen gegen diesen Auffangbehaelter - Cypress wertet die zuletzt
 * registrierte passende Regel zuerst aus.
 */
Cypress.Commands.add('stubBackend', () => {
  const fallback = { statusCode: 200, body: [] };
  cy.intercept({ hostname: 'localhost', port: 3000 }, fallback);
  cy.intercept({ hostname: 'api.benjamin-milcic.dev' }, fallback);
  cy.intercept({ hostname: 'api.themoviedb.org' }, { statusCode: 200, body: {} });
  cy.intercept({ hostname: 'api.mymemory.translated.net' }, {
    statusCode: 200,
    body: { responseData: { translatedText: '' }, responseStatus: 200 },
  });

  // Zusatzdaten der Laenderseite. Die Laenderliste selbst liegt als Asset im
  // Projekt (`assets/data/countries-v3.1.json`) und bleibt echt.
  cy.intercept({ hostname: /wikipedia\.org$/ }, { statusCode: 200, body: {} });
  cy.intercept({ hostname: 'api.open-meteo.com' }, { statusCode: 200, body: {} });
  cy.intercept({ hostname: 'api.worldbank.org' }, { statusCode: 200, body: [] });
});
