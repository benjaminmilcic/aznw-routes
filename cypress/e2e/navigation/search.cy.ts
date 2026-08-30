/**
 * Suche in der Navigationsleiste.
 *
 * Die Suche arbeitet zweistufig: sofort lexikalisch aus SEARCHABLE_ROUTES,
 * danach zusaetzlich semantisch ueber die API. Die Tests pruefen die
 * lexikalische Stufe - sie ist die einzige, die ohne Backend garantiert
 * Ergebnisse liefert, und genau das soll auch so bleiben.
 */
describe('Search', () => {
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

    // Bewusst ohne Anspruch an die Reihenfolge: die Rangfolge kommt aus
    // Fuse.js und darf sich beim Nachschaerfen des Index aendern. Wichtig
    // ist, dass das Stichwort ueberhaupt zur richtigen Sektion fuehrt.
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
