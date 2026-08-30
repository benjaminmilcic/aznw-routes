/**
 * Telegram-Bereich.
 *
 * Der Chat haengt an einer echten Telegram-Sitzung und einem WebSocket. Der
 * Teil, der sich ohne beides zuverlaessig pruefen laesst, ist der Waechter
 * davor: wer nicht angemeldet ist, darf nicht in den Chat, und die Anmeldung
 * verlaeuft in Schritten.
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

    // /telegram leitet auf /chat, der Waechter schickt weiter zum Login.
    cy.location('pathname').should('eq', '/gimmicks/telegram/login');
  });
});
