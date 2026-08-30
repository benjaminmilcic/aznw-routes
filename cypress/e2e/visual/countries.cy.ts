/**
 * Laenderseite.
 *
 * Die Laenderliste liegt als Datei im Projekt
 * (`assets/data/countries-v3.1.json`) und bleibt in Tests echt - so werden
 * auch Fehler in dieser Datei bemerkt. Nur die Zusatzdienste (Wikipedia,
 * Open-Meteo, Weltbank) sind abgeklemmt.
 */
describe('Countries', () => {
  it('renders the world map', () => {
    cy.visitApp('/gimmicks/countries');

    cy.get('#map').should('be.visible');
    cy.get('#map .leaflet-container, #map.leaflet-container').should('exist');
  });

  it('hides the loading overlay once the data is there', () => {
    cy.visitApp('/gimmicks/countries');

    cy.get('mat-spinner').should('not.exist');
  });

  it('opens the detail page of a country directly', () => {
    cy.visitApp('/gimmicks/countries/country/DEU');

    cy.byCy('page-not-found').should('not.exist');
    cy.location('pathname').should('eq', '/gimmicks/countries/country/DEU');
    cy.contains('Deutschland').should('be.visible');
    cy.get('img[alt]').should('exist');
  });

  it('leads from the detail page back to the map', () => {
    cy.visitApp('/gimmicks/countries/country/DEU', { lang: 'en' });

    cy.contains('button', 'Back to map').click();

    cy.location('pathname').should('eq', '/gimmicks/countries');
    cy.get('#map').should('be.visible');
  });

  it('stays on a real page for an unknown country code', () => {
    cy.visitApp('/gimmicks/countries/country/ZZZ');

    cy.byCy('page-not-found').should('not.exist');
    cy.byCy('navbar').should('be.visible');
  });
});
