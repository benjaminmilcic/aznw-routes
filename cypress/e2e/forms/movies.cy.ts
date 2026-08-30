/**
 * Filmportal (TMDB).
 *
 * Alle Antworten kommen aus Fixtures. Damit haengt kein Test an einem
 * gueltigen TMDB-Key, an der Verfuegbarkeit des Dienstes oder daran, welcher
 * Film gerade populaer ist.
 */
describe('Movies', () => {
  const stubLists = () => {
    cy.intercept('GET', '**/discover/movie*', {
      fixture: 'movies-popular.json',
    }).as('popular');
    cy.intercept('GET', '**/movie/top_rated*', {
      fixture: 'movies-top-rated.json',
    }).as('topRated');
    cy.intercept('GET', '**/movie/now_playing*', {
      fixture: 'movies-now-playing.json',
    }).as('nowPlaying');
    cy.intercept('GET', '**/search/movie*', {
      fixture: 'movies-search.json',
    }).as('search');
  };

  beforeEach(() => {
    stubLists();
  });

  it('shows the popular movies', () => {
    cy.visitApp('/gimmicks/movies/popular');
    cy.wait('@popular');

    cy.byCy('movie-card').should('have.length', 3);
    cy.byCy('movie-card-title').first().should('contain.text', 'Fight Club');
  });

  it('switches to the top rated list', () => {
    cy.visitApp('/gimmicks/movies/popular');
    cy.wait('@popular');

    cy.byCy('movies-tab-top-rated').click();

    cy.wait('@topRated');
    cy.location('pathname').should('eq', '/gimmicks/movies/top-rated');
    cy.byCy('movie-card').should('have.length', 2);
    cy.byCy('movie-card-title')
      .first()
      .should('contain.text', 'The Godfather');
  });

  it('switches to the movies currently in cinemas', () => {
    cy.visitApp('/gimmicks/movies/popular');
    cy.wait('@popular');

    cy.byCy('movies-tab-now-playing').click();

    cy.wait('@nowPlaying');
    cy.location('pathname').should('eq', '/gimmicks/movies/now-playing');
    cy.byCy('movie-card').should('have.length', 1);
  });

  it('searches for a title and sends the query to the API', () => {
    cy.visitApp('/gimmicks/movies/search');

    cy.get('input[type="text"], input[matInput]').first().type('fight club');

    cy.wait('@search').its('request.url').should('include', 'query=fight');
    cy.byCy('movie-card').should('have.length', 1);
    cy.byCy('movie-card-title').should('contain.text', 'Fight Club');
  });

  it('opens the detail page of a movie', () => {
    cy.intercept('GET', '**/movie/550?*', {
      statusCode: 200,
      body: {
        id: 550,
        title: 'Fight Club',
        overview: 'Test overview for Fight Club.',
        release_date: '1999-10-15',
        vote_average: 8.4,
        runtime: 139,
        genres: [{ id: 18, name: 'Drama' }],
        poster_path: null,
        backdrop_path: null,
        credits: { cast: [], crew: [] },
        videos: { results: [] },
        images: { backdrops: [], posters: [] },
        similar: { results: [] },
        recommendations: { results: [] },
      },
    }).as('movieDetail');
    cy.intercept('GET', '**/movie/550/watch/providers*', {
      statusCode: 200,
      body: { id: 550, results: {} },
    });

    cy.visitApp('/gimmicks/movies/popular');
    cy.wait('@popular');

    cy.byCy('movie-card').first().click();

    cy.location('pathname').should('include', '/gimmicks/movies/movie/550');
    cy.contains('Fight Club').should('be.visible');
  });

  /**
   * Regressionstest zu `total_pages: 0`.
   *
   * Bei einem leeren Ergebnis meldet die API null Seiten. Solange die Abfrage
   * in `MoviesPopularComponent.search()` auf `maxPages === 1` stand, lief der
   * Fall in den else-Zweig: `forkJoin([])` schliesst ohne einen Wert zu
   * liefern, `loading` blieb fuer immer true und die Seite drehte endlos den
   * Ladekreis. Faellt dieser Test aus, ist die Bedingung wieder zu eng.
   */
  it('reports an empty result instead of showing nothing', () => {
    cy.intercept('GET', '**/discover/movie*', {
      statusCode: 200,
      body: { page: 1, results: [], total_pages: 0, total_results: 0 },
    }).as('emptyPopular');

    cy.visitApp('/gimmicks/movies/popular', { lang: 'en' });
    cy.wait('@emptyPopular');

    cy.byCy('movie-card').should('not.exist');
    cy.contains('No results found').should('be.visible');
  });
});
