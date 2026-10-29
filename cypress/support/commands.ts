/// <reference types="cypress" />

/**
 * Custom commands for aznw-routes.
 *
 * Two things in this app have to happen before the application starts and
 * therefore cannot be done afterwards in the test:
 *
 *  1. The language. The AppComponent reads `navigator.language` in its constructor
 *     and calls `translate.use(..)` with it. Whoever wants to pin down the language
 *     of a test must set `navigator.language` BEFORE the bootstrap.
 *  2. Randomness. Some games already draw random numbers in the constructor.
 *     A stub set later would come too late.
 *
 * `cy.visitApp()` does both in `onBeforeLoad`.
 */

export type AppLanguage = 'de' | 'en' | 'hr';

/** Browser language that maps to the respective app language in the AppComponent. */
const BROWSER_LOCALE: Record<AppLanguage, string> = {
  de: 'de-DE',
  en: 'en-US',
  hr: 'hr-HR',
};

export interface SeedAuthOptions {
  email?: string;
  id?: string;
  /** Validity in seconds. Negative = already expired. */
  expiresInSeconds?: number;
}

export interface VisitAppOptions {
  /** Language in which the app starts. Default: de. */
  lang?: AppLanguage;
  /** Puts a signed-in user into localStorage before the start. */
  auth?: boolean | SeedAuthOptions;
  /** Replaces Math.random with a deterministic generator. */
  randomSeed?: number;
  /** Fixed sequence of random values that is returned cyclically. */
  randomValues?: number[];
  /** Additional preparation on the window before the app starts. */
  onBeforeLoad?: (win: Cypress.AUTWindow) => void;
}

/** 1x1 pixel PNG as the response for map tiles and external images. */
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export function transparentPng() {
  return Cypress.Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
}

/**
 * Builds a JWT with a valid structure (header.payload.signature), but without
 * a real signature. Enough for the frontend: `AuthService.setUserFromToken` only reads
 * the payload, the signature is only checked in the backend.
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

/** Content of the localStorage key `authUserData`, as AuthUser stores it. */
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

/** Deterministic replacement for Math.random (mulberry32). */
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

/** Returns a fixed sequence of values and then starts over. */
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

    // The loading screen from index.html only disappears when the first
    // route including its lazy chunk is ready. Before that no test has anything to look for.
    cy.get('#appLoader', { timeout: 90000 }).should('not.exist');
  },
);

Cypress.Commands.add('byCy', (name: string) => cy.get('[data-cy="' + name + '"]'));

/**
 * Text of an element without surrounding spaces.
 *
 * Angular renders expressions like `{{ board[0][0] }}` including the line breaks
 * from the template; the DOM then contains " X ". `have.text` fails
 * on that, even though the display is correct. As a query the command is
 * retryable - so `should` still waits for the expected value.
 */
Cypress.Commands.addQuery('trimmedText', function trimmedText() {
  return (subject: JQuery<HTMLElement>) => subject.text().trim();
});

/**
 * Turns off everything a test neither needs nor can influence:
 * fonts, icon kits, the Google Maps script, map tiles and the
 * visitor statistics. Runs globally before every test.
 *
 * Important: the Google Maps script is deliberately replaced by an EMPTY file.
 * That way it never calls its callback, `MapService.mapsReady` stays false
 * and the page behaves exactly as with a missing API key - just without
 * network access and without costs.
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

  // Map tiles and external images: a transparent pixel is enough.
  const pixel = {
    statusCode: 200,
    headers: { 'content-type': 'image/png' },
    body: transparentPng(),
  };
  cy.intercept({ hostname: /openstreetmap\.org$/ }, pixel);
  cy.intercept({ hostname: /maptiler\.com$/ }, pixel);
  cy.intercept({ hostname: 'image.tmdb.org' }, pixel);
});

/**
 * Intercepts every request to our own API for which no test specifies anything
 * specific, and answers it with an empty list.
 * Prevents a test from unknowingly working against a running local backend
 * and therefore turning out differently depending on the environment.
 *
 * More specific `cy.intercept` rules that a test registers LATER
 * win against this catch-all - Cypress evaluates the most recently
 * registered matching rule first.
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

  // Additional data of the countries page. The country list itself is an asset in the
  // project (`assets/data/countries-v3.1.json`) and stays real.
  cy.intercept({ hostname: /wikipedia\.org$/ }, { statusCode: 200, body: {} });
  cy.intercept({ hostname: 'api.open-meteo.com' }, { statusCode: 200, body: {} });
  cy.intercept({ hostname: 'api.worldbank.org' }, { statusCode: 200, body: [] });
});
