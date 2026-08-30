import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Anmeldung am Witze-Bereich.
 *
 * Der AuthService legt den angemeldeten Benutzer unter `authUserData` im
 * localStorage ab und liest ihn beim Start ueber `autoLogin()` wieder ein.
 * `cy.visitApp(path, { auth: true })` schreibt genau diesen Eintrag, bevor
 * die App startet - so muss sich nur der Login-Test selbst durch das
 * Formular klicken, alle anderen starten angemeldet.
 */
describe('Authentication', () => {
  const LOGIN = API_PATHS.login;
  const SIGNUP = API_PATHS.signup;
  const JOKES = API_PATHS.jokes;

  beforeEach(() => {
    cy.intercept(apiRoute(JOKES), { fixture: 'jokes.json' }).as('loadJokes');
  });

  describe('guards', () => {
    it('sends a signed out visitor from the protected page to the login', () => {
      cy.visitApp('/gimmicks/auth/main');

      cy.location('pathname').should('eq', '/gimmicks/auth/login');
      cy.byCy('login-submit').should('be.visible');
    });

    it('sends a signed in visitor from the login to the protected page', () => {
      cy.visitApp('/gimmicks/auth/login', { auth: true });

      cy.location('pathname').should('eq', '/gimmicks/auth/main');
      cy.byCy('jokes-box').should('be.visible');
    });

    it('treats an expired token as signed out', () => {
      cy.visitApp('/gimmicks/auth/main', {
        auth: { expiresInSeconds: -60 },
      });

      cy.location('pathname').should('eq', '/gimmicks/auth/login');
    });

    it('keeps query parameters across the redirect', () => {
      // Nach einer Stripe-Zahlung fuehrt die return_url hierher und traegt
      // die Zahlungsdaten als Query-Parameter. Gehen sie bei der Umleitung
      // verloren, steht die Stripe-Komponente ohne Daten da.
      cy.visitApp('/gimmicks/auth/login?payment_intent=pi_test_123', {
        auth: true,
      });

      cy.location('pathname').should('eq', '/gimmicks/auth/main');
      cy.location('search').should('include', 'payment_intent=pi_test_123');
    });
  });

  describe('login form', () => {
    beforeEach(() => {
      cy.visitApp('/gimmicks/auth/login');
    });

    it('does not send anything while the form is incomplete', () => {
      cy.intercept(apiRoute(LOGIN, 'POST'), { statusCode: 200, body: {} }).as('login');

      cy.byCy('login-submit').click();

      cy.get('@login.all').should('have.length', 0);
      cy.location('pathname').should('eq', '/gimmicks/auth/login');
    });

    it('signs in with valid credentials and opens the protected page', () => {
      cy.intercept(apiRoute(LOGIN, 'POST'), {
        fixture: 'auth-login-response.json',
      }).as('login');

      cy.byCy('login-email').type('guest@guest.com');
      cy.byCy('login-password').type('jokes123');
      cy.byCy('login-submit').click();

      cy.wait('@login').then(({ request }) => {
        expect(request.body.email).to.equal('guest@guest.com');
        expect(request.body.password).to.equal('jokes123');
      });

      cy.location('pathname').should('eq', '/gimmicks/auth/main');
      cy.byCy('jokes-box').should('be.visible');
    });

    it('stores the session so a reload keeps the visitor signed in', () => {
      cy.intercept(apiRoute(LOGIN, 'POST'), {
        fixture: 'auth-login-response.json',
      }).as('login');

      cy.byCy('login-email').type('guest@guest.com');
      cy.byCy('login-password').type('jokes123');
      cy.byCy('login-submit').click();
      cy.wait('@login');

      cy.window()
        .its('localStorage')
        .invoke('getItem', 'authUserData')
        .should('contain', 'guest@guest.com');
    });

    it('shows a message and stays on the page when the credentials are wrong', () => {
      cy.intercept(apiRoute(LOGIN, 'POST'), {
        statusCode: 401,
        body: { error: { message: 'INVALID_PASSWORD' } },
      }).as('login');

      cy.byCy('login-email').type('guest@guest.com');
      cy.byCy('login-password').type('wrong-password');
      cy.byCy('login-submit').click();
      cy.wait('@login');

      cy.byCy('auth-error').should('be.visible').and('not.be.empty');
      cy.location('pathname').should('eq', '/gimmicks/auth/login');
    });
  });

  describe('sign up form', () => {
    /**
     * Erst fokussieren, dann tippen - und zwar nur hier.
     *
     * Angular Material laesst das Label eines leeren Feldes ueber dem
     * Eingabefeld liegen, bis es den Fokus bekommt. Beim
     * Bestaetigungsfeld reicht das deutsche Label "Passwort Wiederholung"
     * gerade eben ueber die Mitte des Feldes (bis x=478 bei Mitte x=475);
     * Cypress prueft genau diesen Punkt und verweigert Klick und Eingabe.
     * Bei "E-Mail" und "Passwort" endet das Label vorher, dort geht die
     * normale Eingabe.
     *
     * Fuer Besucher ist das kein Problem: ein Klick auf das Label setzt den
     * Fokus ins Feld, danach rutscht das Label nach oben. `focus()` bildet
     * genau das nach - im Gegensatz zu `force` bleiben alle uebrigen
     * Pruefungen von Cypress aktiv.
     */
    const typeInto = (field: string, value: string) =>
      cy.byCy(field).focus().type(value);

    beforeEach(() => {
      cy.visitApp('/gimmicks/auth/login');
      cy.byCy('auth-switch-mode').click();
    });

    it('switches between login and sign up', () => {
      cy.byCy('signup-submit').should('be.visible');
      cy.byCy('signup-confirm').should('be.visible');
    });

    it('refuses two passwords that do not match', () => {
      cy.intercept(apiRoute(SIGNUP, 'POST'), { statusCode: 200, body: {} }).as(
        'signup',
      );

      typeInto('signup-email', 'new.user@example.com');
      typeInto('signup-password', 'secret123');
      typeInto('signup-confirm', 'secret456');
      cy.byCy('signup-submit').click();

      cy.byCy('auth-error').should('be.visible').and('not.be.empty');
      cy.get('@signup.all').should('have.length', 0);
    });

    it('creates an account when both passwords match', () => {
      cy.intercept(apiRoute(SIGNUP, 'POST'), {
        fixture: 'auth-login-response.json',
      }).as('signup');

      typeInto('signup-email', 'new.user@example.com');
      typeInto('signup-password', 'secret123');
      typeInto('signup-confirm', 'secret123');
      cy.byCy('signup-submit').click();

      cy.wait('@signup').its('request.body.email').should(
        'equal',
        'new.user@example.com',
      );
      cy.location('pathname').should('eq', '/gimmicks/auth/main');
    });
  });

  describe('signed in area', () => {
    beforeEach(() => {
      cy.visitApp('/gimmicks/auth/main', { auth: true });
    });

    it('shows the jokes area', () => {
      cy.byCy('jokes-box').should('be.visible');
      cy.byCy('logout').should('be.visible');
    });

    it('signs out, clears the session and returns to the login', () => {
      cy.byCy('logout').click();

      cy.location('pathname').should('eq', '/gimmicks/auth/login');
      cy.window()
        .its('localStorage')
        .invoke('getItem', 'authUserData')
        .should('be.null');
    });
  });
});
