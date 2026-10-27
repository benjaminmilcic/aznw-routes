/**
 * Scrollbalken in der Farbe der jeweiligen Seite: der ScrollbarThemeService
 * setzt `data-scrollbar` am <html> aus den Routendaten.
 */
describe('Scrollbalken-Farben', () => {
  beforeEach(() => {
    cy.stubBackend();
  });

  const cases: Array<{ path: string; theme: string | undefined }> = [
    { path: '/', theme: undefined },
    { path: '/gimmicks', theme: 'wood' },
    { path: '/gimmicks/weather', theme: 'wood' },
    { path: '/gimmicks/imagegen', theme: 'wood' },
    { path: '/gimmicks/calendar', theme: 'water' },
    { path: '/gimmicks/games/connect-four', theme: 'water' },
    { path: '/gimmicks/recipes/list', theme: 'water' },
    { path: '/gibt-es-nicht', theme: 'night' },
  ];

  for (const { path, theme } of cases) {
    it(`${path} -> ${theme ?? 'Standard'}`, () => {
      cy.visitApp(path);
      if (theme) {
        cy.get('html').should('have.attr', 'data-scrollbar', theme);
      } else {
        cy.get('html').should('not.have.attr', 'data-scrollbar');
      }
    });
  }
});
