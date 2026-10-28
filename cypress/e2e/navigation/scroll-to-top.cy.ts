/**
 * "Back to top" button.
 *
 * It only appears from a scroll depth of 600 pixels and shows with a ring
 * how far the page has been scrolled. Both are easy to overlook and just as
 * easy to test.
 */
describe('Scroll to top', () => {
  beforeEach(() => {
    cy.visitApp('/');
  });

  it('stays hidden at the top of the page', () => {
    cy.get('app-scroll-to-top a').should('not.have.class', 'visible');
  });

  it('appears after scrolling down', () => {
    cy.scrollTo(0, 1200);

    cy.get('app-scroll-to-top a').should('have.class', 'visible');
  });

  it('disappears again at the top', () => {
    cy.scrollTo(0, 1200);
    cy.get('app-scroll-to-top a').should('have.class', 'visible');

    cy.scrollTo(0, 0);

    cy.get('app-scroll-to-top a').should('not.have.class', 'visible');
  });

  it('leads back to the first section', () => {
    cy.scrollTo(0, 1200);

    cy.get('app-scroll-to-top a').click();

    cy.location('hash').should('eq', '#header');
  });

  it('fills the progress ring as the page scrolls', () => {
    cy.get('app-scroll-to-top .progress-value')
      .invoke('attr', 'stroke-dashoffset')
      .then((atTop) => {
        cy.scrollTo('bottom');

        cy.get('app-scroll-to-top .progress-value')
          .invoke('attr', 'stroke-dashoffset')
          .should((atBottom) => {
            expect(Number(atBottom)).to.be.lessThan(Number(atTop));
          });
      });
  });
});
