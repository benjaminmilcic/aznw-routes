/**
 * Kartenseite.
 *
 * Die Karte selbst gehoert Google. In Tests wird das Maps-Skript durch eine
 * leere Datei ersetzt (siehe `cy.stubExternals`), damit kein Testlauf einen
 * gueltigen Schluessel braucht oder Kosten verursacht.
 *
 * Genau deshalb ist hier das Interessante nicht das Kartenbild, sondern das,
 * was die App SELBST tut: sie fordert das Skript mit den richtigen Parametern
 * an und laedt es bei einem Sprachwechsel neu. Beides ist pruefbar, ohne dass
 * je eine Karte gezeichnet wird.
 */
describe('Map page', () => {
  const MAPS_SCRIPT = { hostname: 'maps.googleapis.com' };

  it('opens without an error page', () => {
    cy.visitApp('/gimmicks/map');

    cy.byCy('page-not-found').should('not.exist');
    cy.byCy('navbar').should('be.visible');
  });

  it('requests the Google Maps script in the interface language', () => {
    cy.intercept(MAPS_SCRIPT, {
      statusCode: 200,
      headers: { 'content-type': 'application/javascript' },
      body: '',
    }).as('mapsScript');

    cy.visitApp('/gimmicks/map', { lang: 'de' });

    cy.wait('@mapsScript').its('request.url').should('include', 'language=de');
  });

  it('reloads the script when the language changes', () => {
    cy.intercept(MAPS_SCRIPT, {
      statusCode: 200,
      headers: { 'content-type': 'application/javascript' },
      body: '',
    }).as('mapsScript');

    cy.visitApp('/gimmicks/map', { lang: 'de' });
    cy.wait('@mapsScript');

    cy.byCy('language-trigger').click();
    cy.byCy('language-en').click();

    cy.wait('@mapsScript').its('request.url').should('include', 'language=en');
  });

  it('asks for the libraries the page needs', () => {
    cy.intercept(MAPS_SCRIPT, {
      statusCode: 200,
      headers: { 'content-type': 'application/javascript' },
      body: '',
    }).as('mapsScript');

    cy.visitApp('/gimmicks/map');

    cy.wait('@mapsScript')
      .its('request.url')
      .should('include', 'libraries=places,drawing,geometry');
  });

  it('does not draw a map while the script is unavailable', () => {
    // Festgehaltenes Verhalten: ohne geladenes Skript bleibt
    // `MapService.mapsReady` false und <google-map> wird gar nicht erzeugt -
    // die Seite bleibt aber bedienbar und stuerzt nicht ab.
    cy.visitApp('/gimmicks/map');

    cy.get('google-map').should('not.exist');
    cy.byCy('navbar').should('be.visible');
  });
});
