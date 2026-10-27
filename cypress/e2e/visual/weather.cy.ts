/**
 * Weather page.
 *
 * The page offers two ways to the location: the device location or the search for
 * a city. The city list comes from our own API and is stubbed.
 *
 * The segments are addressed via their `value`: the <ion-label> inside
 * has `pointer-events: none` and cannot be clicked.
 */
describe('Weather', () => {
  const CITIES = '/geolocation/cities';

  const stubCities = () =>
    cy.intercept(
      { method: 'GET', hostname: 'localhost', port: 3000, pathname: CITIES },
      {
        statusCode: 200,
        body: [
          {
            name: 'Berlin',
            country: 'DE',
            latitude: 52.52,
            longitude: 13.405,
          },
        ],
      },
    ).as('loadCities');

  const openSearch = () => {
    cy.get('ion-segment-button[value="search"]').click();
    cy.byCy('weather-city').should('be.visible');
  };

  beforeEach(() => {
    cy.visitApp('/gimmicks/weather', { lang: 'en' });
  });

  it('offers both ways to choose a place', () => {
    cy.get('ion-segment-button[value="location"]').should('be.visible');
    cy.get('ion-segment-button[value="search"]').should('be.visible');
  });

  it('starts in the location mode and offers its button', () => {
    cy.byCy('weather-get-location').should('be.visible');
    cy.contains('button', 'Get location').should('be.visible');
  });

  it('switches to the city search', () => {
    openSearch();

    cy.byCy('weather-country').should('be.visible');
    cy.byCy('weather-get-location').should('not.exist');
  });

  it('offers a country list that can be filtered', () => {
    openSearch();

    cy.byCy('weather-country').click();
    cy.get('mat-option').should('have.length.at.least', 10);

    // The panel's search field is only visible when the panel is open -
    // the same component already exists hidden in the DOM before that.
    cy.get('.mat-select-search-input:visible').type('Germ');
    cy.get('mat-option').should('have.length.at.least', 1);

    cy.get('body').type('{esc}');
  });

  it('asks the API for cities while typing', () => {
    stubCities();
    openSearch();

    cy.byCy('weather-city').type('Berlin');

    // The search queries on every keystroke; the first request only carries
    // "Be". That's why the last request sent is checked.
    cy.wait('@loadCities');
    cy.get('@loadCities.all').should((calls: any[]) => {
      expect(calls[calls.length - 1].request.url).to.include('q=Berlin');
    });
  });

  it('opens without an error page', () => {
    cy.byCy('page-not-found').should('not.exist');
    cy.byCy('navbar').should('be.visible');
  });
});
