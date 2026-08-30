/**
 * Minesweeper.
 *
 * Reine Browser-Logik mit Signals, kein Backend. Interessant sind die Regeln,
 * die man leicht falsch implementiert: das erste Feld darf nie eine Mine sein,
 * Flaggen zaehlen den Minenzaehler herunter, und die Uhr laeuft erst ab dem
 * ersten Klick.
 */
describe('Minesweeper', () => {
  const beginner = { rows: 9, cols: 9, mines: 10 };

  beforeEach(() => {
    cy.visitApp('/gimmicks/games/minesweeper', { randomSeed: 7 });
    cy.get('.board').should('be.visible');
  });

  it('starts with the beginner board and no revealed cell', () => {
    cy.get('.row').should('have.length', beginner.rows);
    cy.get('.cell').should('have.length', beginner.rows * beginner.cols);
    cy.get('.cell.revealed').should('not.exist');
  });

  it('shows the number of remaining mines and a stopped clock', () => {
    cy.get('.number-display').first().trimmedText().should('eq', '010');
    cy.get('.number-display').last().trimmedText().should('eq', '000');
  });

  it('never puts a mine under the very first click', () => {
    // Ohne diese Regel koennte das Spiel im ersten Zug verloren sein. Der
    // feste Startwert des Zufallsgenerators macht den Fall reproduzierbar.
    cy.get('.cell').first().click();

    cy.get('.cell').first().should('have.class', 'revealed');
    cy.get('.cell').first().should('not.have.class', 'mine');
  });

  it('opens an area of empty cells in one click', () => {
    cy.get('.cell').first().click();

    // Ein leeres Feld deckt seine Nachbarn mit auf - ein einzelner Klick
    // legt daher mehr als nur ein Feld frei.
    cy.get('.cell.revealed').should('have.length.at.least', 2);
  });

  it('sets and removes a flag with the right mouse button', () => {
    cy.get('.cell').eq(10).rightclick();

    cy.get('.cell').eq(10).should('have.class', 'flagged');
    cy.get('.number-display').first().trimmedText().should('eq', '009');

    cy.get('.cell').eq(10).rightclick();

    cy.get('.cell').eq(10).should('not.have.class', 'flagged');
    cy.get('.number-display').first().trimmedText().should('eq', '010');
  });

  it('does not open a flagged cell', () => {
    cy.get('.cell').eq(10).rightclick().click();

    cy.get('.cell').eq(10).should('not.have.class', 'revealed');
  });

  it('starts a fresh board through the smiley', () => {
    cy.get('.cell').first().click();
    cy.get('.cell.revealed').should('exist');

    cy.get('.smile-button').click();

    cy.get('.cell.revealed').should('not.exist');
    cy.get('.number-display').first().trimmedText().should('eq', '010');
  });

  it('resizes the board when the difficulty changes', () => {
    cy.get('.difficulty-selector').select(1);

    cy.get('.row').should('have.length', 16);
    cy.get('.cell').should('have.length', 16 * 16);
    cy.get('.number-display').first().trimmedText().should('eq', '040');
  });
});
