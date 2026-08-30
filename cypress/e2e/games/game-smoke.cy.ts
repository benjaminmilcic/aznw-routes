import { GAME_PATHS } from '../../support/app-routes';
import { API_PATHS, apiRoute } from '../../support/api';

/**
 * Ein kurzer Test je Spiel.
 *
 * Siebzehn Spiele in voller Tiefe zu testen waere Wochen Arbeit fuer wenig
 * zusaetzliche Sicherheit. Diese Ebene beantwortet die Frage, die am
 * haeufigsten schiefgeht: "Laedt das Spiel ueberhaupt und ist es bedienbar?"
 * Vier Spiele werden darueber hinaus vollstaendig durchgespielt - siehe die
 * uebrigen Dateien in diesem Ordner.
 *
 * Der feste Zufalls-Startwert sorgt dafuer, dass Spiele mit Zufallsanteil in
 * jedem Lauf identisch starten.
 */
describe('Game smoke tests', () => {
  beforeEach(() => {
    // Das Trivia-Quiz zeigt ohne Fragen nur einen Hinweistext. Mit Fixture
    // rendert es sein Spielfeld und der Kurztest prueft dasselbe wie ueberall.
    cy.intercept(apiRoute(API_PATHS.triviaRandom), {
      fixture: 'trivia-questions.json',
    });
  });

  GAME_PATHS.forEach((game) => {
    it('loads and renders ' + game, () => {
      cy.visitApp('/gimmicks/games/' + game, { randomSeed: 42 });

      cy.byCy('page-not-found').should('not.exist');
      cy.byCy('game-area').should('exist');

      // Jedes Spiel bringt mindestens ein eigenes Element mit: ein Brett,
      // eine Auswahl, einen Startknopf - oder, im Fall von Puzzle, den
      // eingebetteten Rahmen der fremden App.
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
