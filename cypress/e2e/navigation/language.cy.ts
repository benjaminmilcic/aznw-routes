/**
 * Sprachumschaltung.
 *
 * Die Startsprache kommt aus `navigator.language` (siehe AppComponent), eine
 * spaetere Auswahl wird bewusst NICHT gespeichert. Der letzte Test haelt
 * dieses Verhalten fest, damit ein spaeterer Umbau auf persistente Auswahl
 * hier auffaellt statt unbemerkt zu passieren.
 */
describe('Language switcher', () => {
  const chooseLanguage = (lang: 'de' | 'en' | 'hr') => {
    cy.byCy('language-trigger').click();
    cy.byCy('language-' + lang).click();
    // Das Material-Menue liegt in einem Overlay ueber der Seite und wuerde
    // sonst den naechsten Klick abfangen.
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
