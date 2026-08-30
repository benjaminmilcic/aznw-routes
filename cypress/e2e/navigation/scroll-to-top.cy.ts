/**
 * Knopf "nach oben".
 *
 * Er erscheint erst ab 600 Pixel Scrolltiefe und zeigt ueber einen Ring an,
 * wie weit die Seite gescrollt ist. Beides ist gut zu uebersehen und genauso
 * gut zu testen.
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
