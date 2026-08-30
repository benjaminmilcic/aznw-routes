/**
 * Bildgenerator.
 *
 * Die Erzeugung laeuft ueber die eigene API und kostet dort Rechenzeit. Kein
 * Test darf sie wirklich anstossen - jeder Aufruf wird abgefangen und mit
 * einem winzigen Bild beantwortet.
 *
 * Die Komponente nutzt `fetch` statt HttpClient; `cy.intercept` faengt beides.
 */
describe('Image generator', () => {
  const IMAGEGEN = { hostname: 'localhost', port: 3000, pathname: '/imagegen' };

  const stubGenerate = () =>
    cy.intercept({ ...IMAGEGEN, method: 'POST' }, {
      statusCode: 200,
      body: {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    }).as('generateImage');

  beforeEach(() => {
    cy.visitApp('/gimmicks/imagegen', { lang: 'en' });
  });

  it('shows the prompt field and the model choice', () => {
    cy.get('#ig-prompt').should('be.visible');
    cy.contains('button', 'Flux').should('be.visible');
    cy.contains('button', 'SDXL').should('be.visible');
  });

  it('fills the prompt with an example', () => {
    cy.get('#ig-prompt').should('have.value', '');

    cy.contains('button', 'Surprise me').click();

    cy.get('#ig-prompt').should('not.have.value', '');
  });

  it('offers format and seed only for SDXL', () => {
    cy.contains('Format').should('not.exist');

    cy.contains('button', 'SDXL').click();

    cy.contains('Format').should('be.visible');
    cy.contains('Seed').should('be.visible');
  });

  it('sends the prompt to the API', () => {
    stubGenerate();

    cy.get('#ig-prompt').type('a small red house in the snow');
    cy.contains('button', 'Generate').click();

    cy.wait('@generateImage').then(({ request }) => {
      const body =
        typeof request.body === 'string'
          ? JSON.parse(request.body)
          : request.body;
      expect(JSON.stringify(body)).to.include('a small red house in the snow');
    });
  });

  it('keeps the page usable when the generation fails', () => {
    cy.intercept({ ...IMAGEGEN, method: 'POST' }, {
      statusCode: 500,
      body: { message: 'failed' },
    }).as('generateFailed');

    cy.get('#ig-prompt').type('a small red house in the snow');
    cy.contains('button', 'Generate').click();
    cy.wait('@generateFailed');

    cy.get('#ig-prompt').should('be.visible');
    cy.byCy('page-not-found').should('not.exist');
  });
});
