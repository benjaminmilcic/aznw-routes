/**
 * Vier Gewinnt gegen den Computer.
 *
 * Der Online-Modus laeuft ueber die Firebase Realtime Database und wird hier
 * bewusst ausgelassen - er braucht einen zweiten Spieler und eine echte
 * Verbindung. Der Computer-Modus haelt den Spielstand laut Service als rein
 * lokales Signal und ist deshalb vollstaendig ueber die Oberflaeche pruefbar.
 */
describe('Connect Four', () => {
  const startAgainstComputer = (name = 'Tester') => {
    cy.visitApp('/gimmicks/games/connect-four', { randomSeed: 3 });

    cy.byCy('c4-name').clear().type(name);
    cy.byCy('c4-start').click();

    cy.get('.board').should('be.visible');
  };

  it('offers the start screen with computer and online mode', () => {
    cy.visitApp('/gimmicks/games/connect-four');

    cy.byCy('c4-name').should('be.visible');
    cy.get('ion-segment-button').should('have.length.at.least', 2);
  });

  it('keeps the start button disabled without a name', () => {
    cy.visitApp('/gimmicks/games/connect-four');

    cy.byCy('c4-name').clear();
    cy.byCy('c4-start').should('be.disabled');

    cy.byCy('c4-name').type('Tester');
    cy.byCy('c4-start').should('be.enabled');
  });

  it('opens an empty board with seven columns', () => {
    startAgainstComputer();

    cy.get('.column').should('have.length', 7);
    cy.get('.hole').should('have.length', 42);
    cy.get('.board .disc').should('not.exist');
  });

  it('shows the chosen name on the board', () => {
    startAgainstComputer('Benjamin');

    cy.get('.player-name').first().should('contain.text', 'Benjamin');
  });

  it('drops a disc into the chosen column', () => {
    startAgainstComputer();

    cy.byCy('c4-column-3').click();

    // Der eigene Stein liegt sofort, der Computer antwortet kurz darauf.
    cy.get('.board .disc').should('have.length.at.least', 1);
    cy.byCy('c4-column-3').find('.disc').should('have.length.at.least', 1);
  });

  it('lets the computer answer every move', () => {
    startAgainstComputer();

    cy.byCy('c4-column-0').click();

    cy.get('.board .disc').should('have.length', 2);
  });

  it('stacks discs from the bottom up', () => {
    startAgainstComputer();

    cy.byCy('c4-column-6').click();
    cy.get('.board .disc').should('have.length', 2);

    // Die unterste Zelle einer Spalte ist die letzte im DOM.
    cy.byCy('c4-column-6').find('.hole').last().find('.disc').should('exist');
  });

  it('returns to the start screen when the game is ended', () => {
    startAgainstComputer();

    cy.byCy('c4-end-game').click();

    cy.byCy('c4-name').should('be.visible');
    cy.get('.board').should('not.exist');
  });
});
