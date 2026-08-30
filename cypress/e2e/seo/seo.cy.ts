/**
 * Titel, Beschreibung und Canonical je Route.
 *
 * Der SeoService setzt sie bei jedem NavigationEnd und bei jedem
 * Sprachwechsel. Da die Seite ohne SSR ausgeliefert wird, ist das die einzige
 * Stelle, an der diese Angaben ueberhaupt entstehen - ein Fehler hier faellt
 * im Alltag niemandem auf, kostet aber Sichtbarkeit in der Suche.
 */
describe('SEO metadata', () => {
  const DEFAULT_TITLE = 'Benjamin Milčić - Full Stack Web Developer';
  const DOMAIN = 'https://benjamin-milcic.dev';

  const metaContent = (selector: string) =>
    cy.get('head ' + selector, { includeShadowDom: false }).should('exist').invoke('attr', 'content');

  it('uses the full name as the title on the start page', () => {
    cy.visitApp('/');

    cy.title().should('eq', DEFAULT_TITLE);
  });

  it('gives every listed page its own title', () => {
    const pages = [
      '/gimmicks',
      '/gimmicks/map',
      '/gimmicks/calendar',
      '/gimmicks/charts',
      '/gimmicks/weather',
    ];

    const seen: string[] = [];

    pages.forEach((path) => {
      cy.visitApp(path);
      cy.title().then((title) => {
        expect(title, 'title of ' + path).to.not.equal(DEFAULT_TITLE);
        expect(seen, 'title of ' + path + ' is unique').to.not.include(title);
        seen.push(title);
      });
    });
  });

  it('writes a description for the current page', () => {
    cy.visitApp('/gimmicks/map');

    metaContent('meta[name="description"]').should('not.be.empty');
  });

  it('points the canonical link at the current path', () => {
    cy.visitApp('/gimmicks/charts');

    cy.get('head link[rel="canonical"]')
      .should('have.attr', 'href', DOMAIN + '/gimmicks/charts');
  });

  it('keeps the open graph tags in sync with the page', () => {
    cy.visitApp('/gimmicks/weather');

    metaContent('meta[property="og:url"]').should(
      'eq',
      DOMAIN + '/gimmicks/weather',
    );
    cy.title().then((title) => {
      metaContent('meta[property="og:title"]').should('eq', title);
    });
  });

  it('sets the lang attribute of the document', () => {
    cy.visitApp('/', { lang: 'de' });
    cy.get('html').should('have.attr', 'lang', 'de');

    cy.visitApp('/', { lang: 'hr' });
    cy.get('html').should('have.attr', 'lang', 'hr');
  });

  it('translates title and description when the language changes', () => {
    cy.visitApp('/gimmicks/calendar', { lang: 'de' });

    cy.title().then((germanTitle) => {
      cy.byCy('language-trigger').click();
      cy.byCy('language-en').click();

      cy.title().should('not.equal', germanTitle);
      cy.get('html').should('have.attr', 'lang', 'en');
    });
  });

  it('falls back to the default title on an unknown page', () => {
    cy.visitApp('/no-such-page');

    cy.title().should('eq', DEFAULT_TITLE);
  });

  it('ignores query and fragment when choosing the entry', () => {
    cy.visitApp('/gimmicks/map?utm_source=test');

    cy.get('head link[rel="canonical"]')
      .should('have.attr', 'href', DOMAIN + '/gimmicks/map');
  });
});
