/**
 * Behavior on different screen sizes.
 *
 * Only what really depends on the space is checked: which navigation
 * is visible and whether the page overflows horizontally. A horizontal
 * overflow is never noticed at the desk and makes the page unusable on a
 * phone.
 */
const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = ['/', '/gimmicks', '/gimmicks/charts', '/gimmicks/games/minesweeper'];

describe('Responsive layout', () => {
  VIEWPORTS.forEach(({ name, width, height }) => {
    describe(name + ' (' + width + 'x' + height + ')', () => {
      PAGES.forEach((page) => {
        it('does not scroll sideways on ' + page, () => {
          cy.viewport(width, height);
          cy.visitApp(page);

          cy.document().then((doc) => {
            const overflow =
              doc.documentElement.scrollWidth - doc.documentElement.clientWidth;
            expect(overflow, 'horizontal overflow in pixels').to.be.at.most(1);
          });
        });
      });
    });
  });

  it('shows the burger menu instead of the links on a phone', () => {
    cy.viewport(390, 844);
    cy.visitApp('/');

    cy.get('.mobile-toggle').should('be.visible');
    cy.get('.nav-links').should('not.be.visible');
  });

  it('shows the links instead of the burger menu on the desktop', () => {
    cy.viewport(1440, 900);
    cy.visitApp('/');

    cy.get('.nav-links').should('be.visible');
    cy.get('.mobile-toggle').should('not.be.visible');
  });
});
