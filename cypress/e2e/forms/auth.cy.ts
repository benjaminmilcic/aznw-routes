import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Sign-in to the jokes section.
 *
 * The AuthService stores the signed-in user under `authUserData` in
 * localStorage and reads it back on start via `autoLogin()`.
 * `cy.visitApp(path, { auth: true })` writes exactly this entry before
 * the app starts - so only the login test itself has to click through the
 * form, all others start signed in.
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
      // After a Stripe payment the return_url leads here and carries
      // the payment data as query parameters. If they get lost in the redirect,
      // the Stripe component has no data.
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
     * Focus first, then type - and only here.
     *
     * Angular Material keeps the label of an empty field on top of the
     * input until it gets the focus. For the
     * confirmation field the German label "Passwort Wiederholung" reaches
     * just past the middle of the field (up to x=478 with the middle at x=475);
     * Cypress checks exactly this point and refuses click and input.
     * For "E-Mail" and "Passwort" the label ends before that, there the
     * normal input works.
     *
     * For visitors this is no problem: a click on the label puts the
     * focus into the field, after that the label moves up. `focus()` reproduces
     * exactly that - unlike `force`, all other
     * checks of Cypress stay active.
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
