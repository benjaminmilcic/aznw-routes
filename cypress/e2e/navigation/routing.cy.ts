import { PUBLIC_ROUTES, REDIRECTS } from '../../support/app-routes';

/**
 * Jede oeffentliche Route wird DIREKT aufgerufen, nicht ueber das Menue
 * angeklickt. Damit haengt der Test am SPA-Fallback und am Lazy-Chunk der
 * Route - genau die beiden Dinge, die beim Umstieg auf Pfad-Routing kaputt
 * gehen koennen.
 *
 * Ein unbekannter Pfad liefert HTTP 200 mit der PageNotFoundComponent. Der
 * Statuscode taugt hier also nicht als Beweis; geprueft wird stattdessen,
 * dass die 404-Seite NICHT erscheint.
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
