describe('Navbar', () => {
  beforeEach(() => {
    cy.visitApp('/');
  });

  it('jumps to the start page sections via anchor links', () => {
    cy.byCy('navbar').contains('.nav-link', 'Kontakt').click();

    cy.location('hash').should('eq', '#contact');
    cy.get('#contact').should('be.visible');
  });

  it('opens the gimmicks mega menu only on hover', () => {
    cy.get('.mega-menu').should('not.have.class', 'visible');

    cy.get('.gimmicks-trigger').trigger('mouseenter');

    cy.get('.mega-menu').should('have.class', 'visible');
    cy.get('.mega-menu .mega-item').should('have.length.at.least', 12);
  });

  it('navigates from the mega menu to the overview', () => {
    cy.get('.gimmicks-trigger').trigger('mouseenter');
    cy.get('.mega-menu').contains('.mega-item', 'Übersicht').click();

    cy.location('pathname').should('eq', '/gimmicks');
    cy.byCy('page-not-found').should('not.exist');
  });

  it('marks the gimmicks entry as active', () => {
    cy.visitApp('/gimmicks/calendar');

    cy.get('.gimmicks-trigger').should('have.class', 'active');
  });

  it('returns to the start page via the logo', () => {
    cy.visitApp('/gimmicks/charts');

    cy.byCy('navbar').find('img[alt="Profile"]').first().click();

    cy.location('pathname').should('eq', '/');
  });
});

describe('Navbar on mobile', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.visitApp('/');
  });

  it('opens and closes the mobile menu', () => {
    cy.get('.mobile-menu').should('not.have.class', 'active');

    cy.get('.mobile-toggle').click();
    cy.get('.mobile-menu').should('have.class', 'active');

    cy.get('.mobile-close').click();
    cy.get('.mobile-menu').should('not.have.class', 'active');
  });

  it('navigates via the mobile menu and closes it', () => {
    cy.get('.mobile-toggle').click();
    cy.get('.mobile-menu').contains('.mobile-link', 'Kontakt').click();

    cy.location('hash').should('eq', '#contact');
    cy.get('.mobile-menu').should('not.have.class', 'active');
  });
});
