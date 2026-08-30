import './commands';

/**
 * Globales Setup fuer alle E2E-Tests.
 *
 * Vor jedem Test wird die Aussenwelt abgeklemmt: keine Schriften, keine
 * Icon-Kits, kein Google-Maps-Skript, keine Kartenkacheln, keine
 * Besucherstatistik und kein Zugriff auf das echte Backend. Ein Test, der
 * eine bestimmte API-Antwort braucht, registriert seinen eigenen
 * `cy.intercept` - der gewinnt gegen den Auffangbehaelter hier.
 */
beforeEach(() => {
  cy.stubExternals();
  cy.stubBackend();
});

/**
 * Fehler aus fremdem Code sollen keine Tests rot faerben, die damit nichts zu
 * tun haben. Alles andere faellt bewusst auf: eine unbehandelte Ausnahme in
 * der eigenen App IST ein Testfehler.
 */
const IGNORED_ERRORS: RegExp[] = [
  // Browser-interner Ausreisser, tritt bei Resize-Animationen auf und hat
  // keine Auswirkung auf die Anwendung.
  /ResizeObserver loop/,
  // Das Google-Maps-Skript ist in Tests bewusst leer, die Bibliothek meldet
  // deshalb ihr Fehlen.
  /google is not defined/,
  /Cannot read properties of undefined \(reading 'maps'\)/,
];

Cypress.on('uncaught:exception', (err) => {
  if (IGNORED_ERRORS.some((pattern) => pattern.test(err.message))) {
    return false;
  }
  return true;
});
