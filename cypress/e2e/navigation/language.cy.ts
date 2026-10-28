/**
 * Language switching.
 *
 * The starting language comes from `navigator.language` (see AppComponent), a
 * later choice is deliberately NOT stored. The last test pins down
 * this behavior, so that a later switch to a persistent choice
 * shows up here instead of happening unnoticed.
 */
describe('Language switcher', () => {
  const chooseLanguage = (lang: 'de' | 'en' | 'hr') => {
    cy.byCy('language-trigger').click();
    cy.byCy('language-' + lang).click();
    // The Material menu lies in an overlay above the page and would
    // otherwise catch the next click.
    cy.get('.cdk-overlay-backdrop').should('not.exist');
  };

  beforeEach(() => {
    cy.visitApp('/', { lang: 'de' });
  });

  it('offers all three languages', () => {
    cy.byCy('language-trigger').click();

    cy.byCy('language-de').should('contain.text', 'Deutsch');
    cy.byCy('language-en').should('contain.text', 'English');
    cy.byCy('language-hr').should('contain.text', 'Hrvatski');
  });

  it('translates the interface to English', () => {
    cy.byCy('navbar').should('contain.text', 'Über mich');

    chooseLanguage('en');

    cy.byCy('navbar').should('contain.text', 'About me');
    cy.byCy('navbar').should('not.contain.text', 'Über mich');
  });

  it('translates to Croatian and back', () => {
    chooseLanguage('hr');
    cy.byCy('navbar').should('contain.text', 'O meni');

    chooseLanguage('de');
    cy.byCy('navbar').should('contain.text', 'Über mich');
  });

  it('also translates content on deeper pages', () => {
    cy.visitApp('/gimmicks/guestbook', { lang: 'de' });
    cy.contains('Kommentar erstellen').should('exist');

    chooseLanguage('en');

    cy.contains('Create Comment').should('exist');
  });

  it('falls back to the browser language after a reload', () => {
    chooseLanguage('en');
    cy.byCy('navbar').should('contain.text', 'About me');

    cy.visitApp('/', { lang: 'de' });

    cy.byCy('navbar').should('contain.text', 'Über mich');
  });
});
