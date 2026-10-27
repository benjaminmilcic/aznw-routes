import { defineConfig } from 'cypress';

/**
 * Cypress configuration for aznw-routes.
 *
 * The tests run against the Angular dev server on port 4200. They do NOT
 * start it themselves - locally one is running anyway (`npm start`), and two parallel
 * `ng serve` damage the webpack cache in `.angular/cache`. For CI there
 * is the script `npm run e2e:ci`, which starts server and tests
 * together.
 */
export default defineConfig({
  // No test reads values via Cypress.env(); turning it off removes the
  // warning on start and rules out the insecure access from the browser.
  allowCypressEnv: false,

  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    viewportWidth: 1440,
    viewportHeight: 900,

    // The dev build loads every route as its own lazy chunk. The very first
    // visit of a page has to build the chunk first - hence the generous
    // time windows. In the prod build they are never needed, but they don't hurt there.
    pageLoadTimeout: 120000,
    defaultCommandTimeout: 12000,
    responseTimeout: 30000,

    video: false,
    screenshotOnRunFailure: true,

    // One retry catches real outliers (chunk loading errors),
    // without a permanently broken test slipping through.
    retries: { runMode: 2, openMode: 0 },

    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 5,

    setupNodeEvents(on) {
      // Pass output from the browser to the terminal - that way the
      // accessibility test lists its findings readably.
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
        table(rows: unknown[]) {
          console.table(rows);
          return null;
        },
      });
    },
  },

  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});
