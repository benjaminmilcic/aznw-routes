/**
 * Movie portal (TMDB).
 *
 * All responses come from fixtures. That way no test depends on a
 * valid TMDB key, on the availability of the service or on which
 * movie happens to be popular.
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
   * Regression test for `total_pages: 0`.
   *
   * For an empty result the API reports zero pages. As long as the check
   * in `MoviesPopularComponent.search()` was `maxPages === 1`, this case
   * ran into the else branch: `forkJoin([])` completes without delivering a
   * value, `loading` stayed true forever and the page spun the loading circle
   * endlessly. If this test fails, the condition is too narrow again.
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
