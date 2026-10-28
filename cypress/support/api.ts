/**
 * Addresses of our own API for `cy.intercept`.
 *
 * Why not simply `cy.intercept('GET', '**\/guestbook')`? Because such a
 * pattern also hits the PAGE `/gimmicks/guestbook`. Cypress then delivers the
 * fixture as a document and `cy.visit()` aborts with a wrong
 * content-type. That's why the matchers here always name host and port of the
 * API and can never catch the page URL.
 *
 * Host and port come from `src/environments/environment.ts` - the state
 * the dev server runs against.
 */
const API_HOSTNAME = 'localhost';
const API_PORT = 3000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Builds a matcher for a path of our own API.
 *
 * @param pathname Path like `/guestbook` or a glob like `/recipes/*`.
 */
export function apiRoute(pathname: string, method: HttpMethod = 'GET') {
  return {
    method,
    hostname: API_HOSTNAME,
    port: API_PORT,
    pathname,
  };
}

/** Paths that more than one test needs. */
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
