import './commands';

/**
 * Global setup for all E2E tests.
 *
 * Before every test the outside world is cut off: no fonts, no
 * icon kits, no Google Maps script, no map tiles, no
 * visitor statistics and no access to the real backend. A test that
 * needs a specific API response registers its own
 * `cy.intercept` - that wins against the catch-all here.
 */
beforeEach(() => {
  cy.stubExternals();
  cy.stubBackend();
});

/**
 * Errors from third-party code should not turn tests red that have nothing to
 * do with them. Everything else deliberately stands out: an unhandled exception in
 * our own app IS a test failure.
 */
const IGNORED_ERRORS: RegExp[] = [
  // Browser-internal outlier, occurs with resize animations and has
  // no effect on the application.
  /ResizeObserver loop/,
  // The Google Maps script is deliberately empty in tests, so the library reports
  // that it is missing.
  /google is not defined/,
  /Cannot read properties of undefined \(reading 'maps'\)/,
];

Cypress.on('uncaught:exception', (err) => {
  if (IGNORED_ERRORS.some((pattern) => pattern.test(err.message))) {
    return false;
  }
  return true;
});
