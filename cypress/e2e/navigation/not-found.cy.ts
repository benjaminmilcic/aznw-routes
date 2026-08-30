import { HOME_FRAGMENTS } from '../../support/app-routes';

describe('404 handling', () => {
  it('shows the 404 page for an unknown path', () => {
    cy.visitApp('/this-path-does-not-exist');

    cy.byCy('page-not-found').should('be.visible');
    cy.byCy('page-not-found').should(
      'contain.text',
      'Die angeforderte Seite wurde nicht gefunden!',
    );
  });

  it('shows the 404 page deep in the route tree', () => {
    cy.visitApp('/gimmicks/games/no-such-game');
    cy.byCy('page-not-found').should('be.visible');
  });

  it('reaches /404 directly', () => {
    cy.visitApp('/404');
    cy.byCy('page-not-found').should('be.visible');
  });

  it('leads from the 404 page back to the start page', () => {
    cy.visitApp('/no-such-page');

    cy.byCy('page-not-found').find('a[href="/"]').first().click();

    cy.location('pathname').should('eq', '/');
    cy.byCy('page-not-found').should('not.exist');
  });

  /**
   * Der knownFragmentGuard behandelt ein unbekanntes Fragment wie einen
   * unbekannten Pfad. Ohne `runGuardsAndResolvers: 'always'` liefe er bei
   * einer reinen Fragment-Aenderung nicht erneut - deshalb wird hier auch
   * der Wechsel VON einem gueltigen Anker aus geprueft.
   */
  describe('knownFragmentGuard', () => {
    HOME_FRAGMENTS.forEach((fragment) => {
      it('allows #' + fragment, () => {
        cy.visitApp('/#' + fragment);
        cy.location('pathname').should('eq', '/');
        cy.byCy('page-not-found').should('not.exist');
        cy.get('#' + fragment).should('exist');
      });
    });

    it('redirects an unknown fragment to /404', () => {
      cy.visitApp('/#nosuchsection');
      cy.location('pathname').should('eq', '/404');
      cy.byCy('page-not-found').should('be.visible');
    });

    it('also applies when switching away from a valid anchor', () => {
      cy.visitApp('/#about');
      cy.location('pathname').should('eq', '/');

      cy.window().then((win) => {
        win.location.hash = '#nosuchsection';
      });

      cy.location('pathname').should('eq', '/404');
    });
  });
});
