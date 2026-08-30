import { defineConfig } from 'cypress';

/**
 * Cypress-Konfiguration fuer aznw-routes.
 *
 * Die Tests laufen gegen den Angular-Dev-Server auf Port 4200. Sie starten ihn
 * NICHT selbst - lokal laeuft ohnehin einer (`npm start`), und zwei parallele
 * `ng serve` beschaedigen den Webpack-Cache in `.angular/cache`. Fuer CI gibt
 * es dafuer das Script `npm run e2e:ci`, das Server und Tests gemeinsam
 * hochfaehrt.
 */
export default defineConfig({
  // Kein Test liest Werte ueber Cypress.env(); die Abschaltung entfernt die
  // Warnung beim Start und schliesst den unsicheren Zugriff aus dem Browser aus.
  allowCypressEnv: false,

  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    viewportWidth: 1440,
    viewportHeight: 900,

    // Der Dev-Build laedt jede Route als eigenen Lazy-Chunk. Der allererste
    // Aufruf einer Seite muss den Chunk erst bauen - daher die grosszuegigen
    // Zeitfenster. Im Prod-Build sind sie nie noetig, schaden dort aber nicht.
    pageLoadTimeout: 120000,
    defaultCommandTimeout: 12000,
    responseTimeout: 30000,

    video: false,
    screenshotOnRunFailure: true,

    // Ein Wiederholungsversuch faengt echte Ausreisser ab (Chunk-Ladefehler),
    // ohne dass ein dauerhaft kaputter Test durchrutscht.
    retries: { runMode: 2, openMode: 0 },

    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 5,

    setupNodeEvents(on) {
      // Ausgabe aus dem Browser ins Terminal durchreichen - der
      // Barrierefreiheitstest listet damit seine Befunde lesbar auf.
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
