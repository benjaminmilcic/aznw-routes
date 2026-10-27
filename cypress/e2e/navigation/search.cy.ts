/**
 * Search in the navigation bar.
 *
 * The search works in two stages: immediately lexical from SEARCHABLE_ROUTES,
 * then additionally semantic via the API. The tests check the
 * lexical stage - it is the only one that is guaranteed to deliver results
 * without a backend, and that is exactly how it should stay.
 */
describe.skip('Search', () => {
  beforeEach(() => {
    cy.visitApp('/');
    cy.get('.search-toggle').click();
    cy.get('.search-overlay').should('be.visible');
  });

  it('opens with an empty input and no results', () => {
    cy.get('.search-input').should('have.value', '');
    cy.get('.search-result-item').should('not.exist');
  });

  it('finds the skills section by keyword', () => {
    cy.get('.search-input').type('cypress');

    // Deliberately without any claim on the order: the ranking comes from
    // Fuse.js and may change when the index is fine-tuned. What matters
    // is that the keyword leads to the right section at all.
    cy.get('.search-result-item').should('have.length.at.least', 1);
    cy.get('.search-result-item').filter(':contains("Fähigkeiten")').should('exist');
  });

  it('navigates to the target route on click', () => {
    cy.get('.search-input').type('recipes');

    cy.get('.search-result-item').first().click();

    cy.get('.search-overlay').should('not.exist');
    cy.location('pathname').should('include', '/gimmicks/recipes');
  });

  it('reports when nothing matches', () => {
    cy.get('.search-input').type('zzzznosuchentry');

    cy.get('.search-empty').should('contain.text', 'Keine Ergebnisse');
  });

  it('clears the input via the X button', () => {
    cy.get('.search-input').type('map');
    cy.get('.search-result-item').should('exist');

    cy.get('.search-clear').click();

    cy.get('.search-input').should('have.value', '');
    cy.get('.search-result-item').should('not.exist');
  });

  it('selects with arrow keys and opens with Enter', () => {
    cy.get('.search-input').type('calendar');
    cy.get('.search-result-item').should('exist');

    cy.get('.search-input').type('{downArrow}{enter}');

    cy.get('.search-overlay').should('not.exist');
    cy.location('pathname').should('include', '/gimmicks/calendar');
  });

  it('closes the dialog with Escape', () => {
    cy.get('.search-input').type('{esc}');

    cy.get('.search-overlay').should('not.exist');
  });

  it('closes the dialog on backdrop click', () => {
    cy.get('.search-overlay').click('topLeft');

    cy.get('.search-overlay').should('not.exist');
  });
});
