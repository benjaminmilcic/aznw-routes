/**
 * Tic-Tac-Toe, vollstaendig ueber die Oberflaeche gespielt.
 *
 * Das Spiel laeuft rein im Browser - kein Backend, kein Firebase. Damit ist
 * es der beste Ort, um Spiellogik ueber die Oberflaeche zu pruefen: Zuege,
 * Gewinnerkennung, Unentschieden und der Computergegner.
 */
describe('Tic-Tac-Toe', () => {
  const cell = (row: number, column: number) =>
    cy.byCy('ttt-cell-' + row + '-' + column);

  /** Zellinhalt ohne die Leerzeichen, die Angular aus dem Template mitbringt. */
  const cellText = (row: number, column: number) =>
    cell(row, column).trimmedText();

  const play = (moves: Array<[number, number]>) => {
    moves.forEach(([row, column]) => cell(row, column).click());
  };

  beforeEach(() => {
    cy.visitApp('/gimmicks/games/tiktaktoe');
    cy.byCy('ttt-board').should('be.visible');
  });

  it('starts with an empty board', () => {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        cellText(row, column).should('eq', '');
      }
    }
  });

  it('alternates between X and O', () => {
    cell(0, 0).click();
    cellText(0, 0).should('eq', 'X');

    cell(1, 1).click();
    cellText(1, 1).should('eq', 'O');

    cell(0, 1).click();
    cellText(0, 1).should('eq', 'X');
  });

  it('ignores a click on an occupied field', () => {
    cell(0, 0).click();
    cellText(0, 0).should('eq', 'X');

    cell(0, 0).click();

    cellText(0, 0).should('eq', 'X');
    // Waere der Zug gezaehlt worden, stuende jetzt O am Zug fuer das
    // naechste Feld - so bleibt es bei O.
    cell(2, 2).click();
    cellText(2, 2).should('eq', 'O');
  });

  it('recognises a win in a row', () => {
    play([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]);

    cy.byCy('winner-dialog').should('be.visible');
  });

  it('recognises a win in a column', () => {
    play([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);

    cy.byCy('winner-dialog').should('be.visible');
  });

  it('recognises a win on the diagonal', () => {
    play([
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [2, 2],
    ]);

    cy.byCy('winner-dialog').should('be.visible');
  });

  it('recognises a draw', () => {
    // X O X
    // X O O
    // O X X
    play([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 0],
      [2, 0],
      [2, 1],
      [1, 2],
      [2, 2],
    ]);

    cy.byCy('winner-dialog').should('be.visible');
    cy.byCy('winner-name').should('not.exist');
  });

  it('starts a fresh board after the dialog is closed', () => {
    play([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ]);

    cy.byCy('winner-new-game').click();

    cy.byCy('winner-dialog').should('not.exist');
    cellText(0, 0).should('eq', '');
    cellText(0, 2).should('eq', '');
  });

  it('clears the board through the new game button', () => {
    play([
      [0, 0],
      [1, 1],
    ]);

    cy.byCy('ttt-new-game').click();

    cellText(0, 0).should('eq', '');
    cellText(1, 1).should('eq', '');
  });

  it('lets the computer answer a move', () => {
    // Feste Zufallswerte, damit der Computerzug in jedem Lauf gleich ausfaellt.
    cy.visitApp('/gimmicks/games/tiktaktoe', { randomValues: [0.9, 0.9] });

    // Nicht das ion-label anklicken - es hat pointer-events: none.
    cy.byCy('ttt-opponent')
      .find('ion-segment-button[value="computer"]')
      .click();
    cell(0, 0).click();

    // Der Computer zieht nach einer halben Sekunde - danach liegt genau ein
    // O auf dem Brett.
    cy.byCy('ttt-board')
      .find('button')
      .filter(':contains("O")')
      .should('have.length', 1);
  });
});
