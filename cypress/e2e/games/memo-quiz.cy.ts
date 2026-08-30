/**
 * Memory gegen den Computer.
 *
 * Wie bei Vier Gewinnt bleibt der Online-Kanal im Computer-Modus geschlossen -
 * das Spiel laeuft dann rein lokal und ist ohne Firebase pruefbar.
 *
 * Die Kartenverteilung ist zufaellig. Mit festem Startwert liegt in jedem Lauf
 * dasselbe Brett, sodass "zwei gleiche Karten aufdecken" reproduzierbar wird.
 */
describe('Memory', () => {
  const startAgainstComputer = (pairs?: string) => {
    cy.visitApp('/gimmicks/games/memo-quiz', { randomSeed: 11 });

    cy.byCy('memo-name').clear().type('Tester');
    if (pairs) {
      cy.get('ion-segment-button').contains(pairs).click();
    }
    cy.byCy('memo-start').click();

    cy.get('.board').should('be.visible');
  };

  it('shows the start screen with name, animal and card count', () => {
    cy.visitApp('/gimmicks/games/memo-quiz');

    cy.byCy('memo-name').should('be.visible');
    cy.get('.avatar').should('have.length.at.least', 2);
    cy.byCy('memo-start').should('exist');
  });

  it('keeps the start button disabled without a name', () => {
    cy.visitApp('/gimmicks/games/memo-quiz');

    cy.byCy('memo-name').clear();
    cy.byCy('memo-start').should('be.disabled');

    cy.byCy('memo-name').type('Tester');
    cy.byCy('memo-start').should('be.enabled');
  });

  it('deals an even number of face down cards', () => {
    startAgainstComputer();

    cy.get('app-memo-card').then(($cards) => {
      expect($cards.length % 2, 'card count is even').to.equal(0);
    });
    cy.get('.card-inner.is-flipped').should('not.exist');
  });

  it('turns a card face up on click', () => {
    startAgainstComputer();

    cy.get('app-memo-card').first().click();

    cy.get('app-memo-card')
      .first()
      .find('.card-inner')
      .should('have.class', 'is-flipped');
  });

  it('does not turn the same card twice', () => {
    startAgainstComputer();

    cy.get('app-memo-card').first().click();
    cy.get('app-memo-card').first().find('button').should('be.disabled');
  });

  it('starts both players at zero', () => {
    startAgainstComputer();

    cy.get('.player-score').each(($score) => {
      expect($score.text().trim()).to.equal('0');
    });
  });

  it('returns to the start screen when the game is ended', () => {
    startAgainstComputer();

    cy.get('.end-game').click();

    cy.byCy('memo-name').should('be.visible');
    cy.get('.board').should('not.exist');
  });
});
