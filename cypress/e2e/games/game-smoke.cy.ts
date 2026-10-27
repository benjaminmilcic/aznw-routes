import { GAME_PATHS } from '../../support/app-routes';
import { API_PATHS, apiRoute } from '../../support/api';

/**
 * A short test per game.
 *
 * Testing seventeen games in full depth would be weeks of work for little
 * additional safety. This level answers the question that most
 * often goes wrong: "Does the game load at all and is it usable?"
 * Beyond that, four games are played through completely - see the
 * other files in this folder.
 *
 * The fixed random seed makes sure that games with a random part start
 * identically in every run.
 */
describe('Game smoke tests', () => {
  beforeEach(() => {
    // Without questions the trivia quiz only shows a notice. With a fixture
    // it renders its board and the short test checks the same as everywhere.
    cy.intercept(apiRoute(API_PATHS.triviaRandom), {
      fixture: 'trivia-questions.json',
    });
  });

  GAME_PATHS.forEach((game) => {
    it('loads and renders ' + game, () => {
      cy.visitApp('/gimmicks/games/' + game, { randomSeed: 42 });

      cy.byCy('page-not-found').should('not.exist');
      cy.byCy('game-area').should('exist');

      // Every game brings at least one element of its own: a board,
      // a selection, a start button - or, in the case of the puzzle, the
      // embedded frame of the third-party app.
      cy.byCy('game-area')
        .find('button, canvas, input, select, ion-segment-button, iframe')
        .should('have.length.at.least', 1);
    });
  });

  it('switches between games through the selector', () => {
    cy.visitApp('/gimmicks/games/minesweeper');

    cy.get('.games-select-trigger').click();
    cy.get('.games-menu').contains('Moorhuhn').click();

    cy.location('pathname').should('eq', '/gimmicks/games/moorhuhn');
    cy.byCy('game-area').should('exist');
  });
});
