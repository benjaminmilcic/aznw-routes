import { RatingDisplayComponent } from '../../src/app/pages/gimmicks/movies/movies-rating-display/movies-rating-display.component';

/**
 * Beispiel fuer Component Testing.
 *
 * Die Komponente wird ohne Router, ohne Store und ohne Backend allein im
 * Browser gemountet. Fuer eine reine Anzeigekomponente ist das der schnellste
 * Weg: jede Eingabe laesst sich einzeln durchspielen, ohne vorher durch die
 * halbe Anwendung zu klicken.
 *
 * Gestartet wird diese Ebene mit `npm run cy:component`.
 */
describe('RatingDisplayComponent', () => {
  it('shows the rating with one decimal place', () => {
    cy.mount(RatingDisplayComponent, {
      componentProperties: { rating: 8.4 } as never,
    });

    cy.get('.rating-value').should('have.text', '8.4');
    cy.get('.rating-max').should('have.text', '/10');
  });

  it('rounds a rating with more decimals', () => {
    cy.mount(RatingDisplayComponent, {
      componentProperties: { rating: 7.267 } as never,
    });

    cy.get('.rating-value').should('have.text', '7.3');
  });

  it('pads a whole number to one decimal place', () => {
    cy.mount(RatingDisplayComponent, {
      componentProperties: { rating: 9 } as never,
    });

    cy.get('.rating-value').should('have.text', '9.0');
  });

  it('hides the vote count when none is given', () => {
    cy.mount(RatingDisplayComponent, {
      componentProperties: { rating: 6.5 } as never,
    });

    cy.get('.vote-count').should('not.exist');
  });

  it('shows the vote count when one is given', () => {
    cy.mount(RatingDisplayComponent, {
      componentProperties: { rating: 6.5, voteCount: 1234 } as never,
    });

    cy.get('.vote-count').should('have.text', '(1234)');
  });
});
