/**
 * Map page.
 *
 * The map itself belongs to Google. In tests the Maps script is replaced by an
 * empty file (see `cy.stubExternals`), so that no test run needs a
 * valid key or causes costs.
 *
 * That's exactly why the interesting part here is not the map image, but
 * what the app ITSELF does: it requests the script with the right parameters
 * and reloads it on a language change. Both can be checked without
 * a map ever being drawn.
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
    // Pinned-down behavior: without a loaded script
    // `MapService.mapsReady` stays false and <google-map> is not created at all -
    // but the page stays usable and does not crash.
    cy.visitApp('/gimmicks/map');

    cy.get('google-map').should('not.exist');
    cy.byCy('navbar').should('be.visible');
  });
});
