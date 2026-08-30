/**
 * Wetterseite.
 *
 * Die Seite bietet zwei Wege zum Ort: den Geraetestandort oder die Suche nach
 * einer Stadt. Die Staedteliste kommt aus der eigenen API und wird gestubbt.
 *
 * Die Segmente werden ueber ihren `value` angesprochen: das <ion-label> darin
 * hat `pointer-events: none` und laesst sich nicht anklicken.
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

    // Das Suchfeld des Panels ist erst sichtbar, wenn das Panel offen ist -
    // dieselbe Komponente existiert davor schon versteckt im DOM.
    cy.get('.mat-select-search-input:visible').type('Germ');
    cy.get('mat-option').should('have.length.at.least', 1);

    cy.get('body').type('{esc}');
  });

  it('asks the API for cities while typing', () => {
    stubCities();
    openSearch();

    cy.byCy('weather-city').type('Berlin');

    // Die Suche fragt bei jedem Tastendruck nach; die erste Anfrage traegt
    // erst "Be". Geprueft wird deshalb die zuletzt gesendete Anfrage.
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
