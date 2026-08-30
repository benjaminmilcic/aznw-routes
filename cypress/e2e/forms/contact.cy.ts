import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Kontaktformular auf der Startseite.
 *
 * Der Versand geht an `environment.contact.form2mailApi`. Kein Test darf dort
 * wirklich landen - sonst kaeme bei jedem Lauf eine echte Mail an. Deshalb
 * faengt jeder Test die Anfrage ab und prueft stattdessen, WAS gesendet
 * worden waere.
 */
describe('Contact form', () => {
  const SEND = API_PATHS.contact;

  const fillForm = (
    values: { name?: string; email?: string; message?: string } = {},
  ) => {
    const data = {
      name: 'Test Person',
      email: 'test.person@example.com',
      message: 'This message was sent by an automated test.',
      ...values,
    };

    cy.get('#name').clear().type(data.name);
    cy.get('#email').clear().type(data.email);
    cy.get('#message').clear().type(data.message);
    return data;
  };

  beforeEach(() => {
    cy.visitApp('/#contact');
  });

  it('keeps the send button disabled while the form is incomplete', () => {
    cy.get('.send-btn').should('be.disabled');

    cy.get('#name').type('Test Person');
    cy.get('.send-btn').should('be.disabled');

    cy.get('#email').type('test.person@example.com');
    cy.get('.send-btn').should('be.disabled');

    cy.get('#message').type('Hello');
    cy.get('.send-btn').should('be.enabled');
  });

  it('refuses an address that is not a valid email', () => {
    fillForm({ email: 'not-an-email' });

    cy.get('.send-btn').should('be.disabled');
  });

  it('sends name, email and message to the API', () => {
    cy.intercept(apiRoute(SEND, 'POST'), { statusCode: 201, body: {} }).as('sendMail');

    const data = fillForm();
    cy.get('.send-btn').click();

    cy.wait('@sendMail').then(({ request }) => {
      const body =
        typeof request.body === 'string'
          ? JSON.parse(request.body)
          : request.body;

      expect(body.name).to.equal(data.name);
      expect(body.email).to.equal(data.email);
      expect(body.message).to.equal(data.message);
    });
  });

  it('clears the form and confirms after a successful send', () => {
    cy.intercept(apiRoute(SEND, 'POST'), { statusCode: 201, body: {} }).as('sendMail');

    fillForm();
    cy.get('.send-btn').click();
    cy.wait('@sendMail');

    cy.get('#toast-container .toast-success').should('be.visible');
    cy.get('#name').should('have.value', '');
    cy.get('#email').should('have.value', '');
    cy.get('#message').should('have.value', '');
  });

  it('reports a failure instead of pretending the message was sent', () => {
    cy.intercept(apiRoute(SEND, 'POST'), { statusCode: 500, body: {} }).as('sendMail');

    fillForm();
    cy.get('.send-btn').click();
    cy.wait('@sendMail');

    cy.get('#toast-container .toast-error').should('be.visible');
    cy.get('#toast-container .toast-success').should('not.exist');
    // Die Eingaben bleiben stehen, damit niemand seinen Text neu tippen muss.
    cy.get('#message').should('not.have.value', '');
  });

  it('offers phone number and email address for copying', () => {
    cy.get('.contact-card').should('have.length', 2);
    cy.get('.contact-card').first().should('contain.text', '+49');
    cy.get('.contact-card').last().should('contain.text', '@');
  });
});
