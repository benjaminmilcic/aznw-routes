import { PUBLIC_ROUTES, REDIRECTS } from '../../support/app-routes';

/**
 * Every public route is opened DIRECTLY, not clicked in the menu.
 * That way the test depends on the SPA fallback and the lazy chunk of the
 * route - exactly the two things that can break when switching to path
 * routing.
 *
 * An unknown path returns HTTP 200 with the PageNotFoundComponent. So the
 * status code is no proof here; instead it is checked
 * that the 404 page does NOT appear.
 */
describe('Routing', () => {
  PUBLIC_ROUTES.forEach((route) => {
    it('opens ' + route + ' directly', () => {
      cy.visitApp(route);

      cy.location('pathname').should('eq', route);
      cy.byCy('page-not-found').should('not.exist');
      cy.byCy('navbar').should('exist');
      cy.get('router-outlet').should('exist');
    });
  });

  describe('redirects', () => {
    REDIRECTS.forEach(({ from, to }) => {
      it('redirects ' + from + ' to ' + to, () => {
        cy.visitApp(from);
        cy.location('pathname').should('eq', to);
        cy.byCy('page-not-found').should('not.exist');
      });
    });
  });
});
