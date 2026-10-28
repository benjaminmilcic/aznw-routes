import { API_PATHS, apiRoute } from '../../support/api';

/**
 * Trivia quiz.
 *
 * The questions come from our own API. With fixtures the complete
 * flow is reproducible: known questions, known correct answer, known
 * score. Without a stub every run depends on which questions the
 * database happens to deliver.
 */
describe('Trivia quiz', () => {
  const stubQuestions = () =>
    cy.intercept(apiRoute(API_PATHS.triviaRandom), {
      fixture: 'trivia-questions.json',
    }).as('loadQuestions');

  it('shows the first question with three answers', () => {
    stubQuestions();
    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadQuestions');

    cy.get('.trivia-question').should('contain.text', 'Test question one?');
    cy.get('.trivia-answer').should('have.length', 3);
    cy.get('.trivia-counter').should('contain.text', '1');
  });

  it('counts a correct answer', () => {
    stubQuestions();
    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadQuestions');

    cy.get('.trivia-answer').contains('Answer A').click();

    cy.get('.trivia-score-right').should('contain.text', '1');
    cy.get('.trivia-score-wrong').should('contain.text', '0');
  });

  it('counts a wrong answer', () => {
    stubQuestions();
    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadQuestions');

    cy.get('.trivia-answer').contains('Answer C').click();

    cy.get('.trivia-score-wrong').should('contain.text', '1');
    cy.get('.trivia-score-right').should('contain.text', '0');
  });

  it('locks the answers once one is chosen', () => {
    stubQuestions();
    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadQuestions');

    cy.get('.trivia-answer').first().click();

    cy.get('.trivia-answer').should('be.disabled');
  });

  it('reports a failure with a retry instead of an empty page', () => {
    cy.intercept(apiRoute(API_PATHS.triviaRandom), {
      statusCode: 500,
      body: {},
    }).as('loadFailed');

    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadFailed');

    cy.get('.trivia-state-error').should('be.visible');
    // The text must be fit for visitors: no status code, no host name.
    cy.get('.trivia-state-error').should('not.contain.text', '500');
    cy.get('.trivia-state-error').should('not.contain.text', 'localhost');
    cy.get('.trivia-state-error button').should('be.visible');
  });

  it('loads again when the retry button is used', () => {
    cy.intercept(apiRoute(API_PATHS.triviaRandom), {
      statusCode: 500,
      body: {},
    }).as('loadFailed');

    cy.visitApp('/gimmicks/games/trivia-quiz');
    cy.wait('@loadFailed');

    stubQuestions();
    cy.get('.trivia-state-error button').click();

    cy.wait('@loadQuestions');
    cy.get('.trivia-question').should('be.visible');
  });
});
