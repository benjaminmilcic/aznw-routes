import { HOME_FRAGMENTS } from '../../support/app-routes';

describe('App shell', () => {
  it('loads the start page with navigation and a title', () => {
    cy.visitApp('/');

    cy.byCy('navbar').should('be.visible');
    cy.title().should('not.be.empty');
    cy.get('app-root').should('not.be.empty');
    cy.byCy('page-not-found').should('not.exist');
  });

  it('renders all six sections of the start page', () => {
    cy.visitApp('/');

    HOME_FRAGMENTS.forEach((fragment) => {
      cy.get('#' + fragment).should('exist');
    });
  });

  it('starts in the language reported by the browser', () => {
    cy.visitApp('/', { lang: 'de' });
    cy.byCy('navbar').should('contain.text', 'Start');

    cy.visitApp('/', { lang: 'en' });
    cy.byCy('navbar').should('contain.text', 'Home');

    cy.visitApp('/', { lang: 'hr' });
    cy.byCy('navbar').should('contain.text', 'Početna');
  });
});
