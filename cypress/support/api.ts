/**
 * Adressen der eigenen API fuer `cy.intercept`.
 *
 * Warum nicht einfach `cy.intercept('GET', '**\/guestbook')`? Weil ein solches
 * Muster auch die SEITE `/gimmicks/guestbook` trifft. Cypress liefert dann das
 * Fixture als Dokument aus und `cy.visit()` bricht mit einem falschen
 * content-type ab. Die Matcher hier nennen deshalb immer Host und Port der
 * API und koennen die Seiten-URL gar nicht erwischen.
 *
 * Host und Port stammen aus `src/environments/environment.ts` - dem Stand,
 * gegen den der Dev-Server laeuft.
 */
const API_HOSTNAME = 'localhost';
const API_PORT = 3000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Baut einen Matcher fuer einen Pfad der eigenen API.
 *
 * @param pathname Pfad wie `/guestbook` oder ein Glob wie `/recipes/*`.
 */
export function apiRoute(pathname: string, method: HttpMethod = 'GET') {
  return {
    method,
    hostname: API_HOSTNAME,
    port: API_PORT,
    pathname,
  };
}

/** Pfade, die mehr als ein Test braucht. */
export const API_PATHS = {
  guestbook: '/guestbook',
  contact: '/form2email',
  login: '/auth/login',
  signup: '/auth/signup',
  jokes: '/auth/jokes',
  recipes: '/recipes',
  recipe: '/recipes/*',
  triviaRandom: '/trivia/questions/random',
} as const;
