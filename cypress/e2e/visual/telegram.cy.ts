/**
 * Telegram section.
 *
 * The chat depends on a real Telegram session and a WebSocket. The
 * part that can be checked reliably without both is the guard
 * in front of it: whoever is not signed in may not enter the chat, and the sign-in
 * happens in steps.
 */
describe('Telegram', () => {
  const AUTH_STATUS = {
    hostname: 'localhost',
    port: 3000,
    pathname: '/telegram/auth/status',
  };

  it('sends an unauthenticated visitor to the login', () => {
    cy.intercept(AUTH_STATUS, {
      statusCode: 200,
      body: { authenticated: false },
    });

    cy.visitApp('/gimmicks/telegram/chat');

    cy.location('pathname').should('eq', '/gimmicks/telegram/login');
  });

  it('stays on the login when the status cannot be fetched', () => {
    cy.intercept(AUTH_STATUS, { statusCode: 500, body: {} });

    cy.visitApp('/gimmicks/telegram/chat');

    cy.location('pathname').should('eq', '/gimmicks/telegram/login');
    cy.byCy('page-not-found').should('not.exist');
  });

  it('starts the login with the phone number', () => {
    cy.visitApp('/gimmicks/telegram/login');

    cy.get('input[name="phoneNumber"]').should('be.visible');
    cy.get('input[name="phoneNumber"]').should(
      'have.attr',
      'placeholder',
      '+49123456789',
    );
  });

  it('redirects the area root to the chat guard', () => {
    cy.intercept(AUTH_STATUS, {
      statusCode: 200,
      body: { authenticated: false },
    });

    cy.visitApp('/gimmicks/telegram');

    // /telegram redirects to /chat, the guard sends you on to the login.
    cy.location('pathname').should('eq', '/gimmicks/telegram/login');
  });
});
