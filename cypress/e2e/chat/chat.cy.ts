import { apiRoute } from '../../support/api';

/**
 * AI chat (/chat).
 *
 * The answer stream of the backend is stubbed with fixed Server-Sent Events, so the tests neither need the
 * NestJS/Python services nor the language model – and every run sees the same answer.
 */
const sse = (...events: (object | string)[]) =>
  [':ok', ...events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}`)].join('\n\n') + '\n\n';

const stubAnswer = (...events: (object | string)[]) =>
  cy
    .intercept(apiRoute('/chat/stream', 'POST'), {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse(...events, '[DONE]'),
    })
    .as('stream');

describe('AI chat', () => {
  beforeEach(() => {
    cy.stubBackend();
  });

  it('opens from the button next to the language switcher', () => {
    cy.visitApp('/');
    cy.byCy('chat-button').should('contain.text', 'KI').click();
    cy.location('pathname').should('eq', '/chat');
    cy.byCy('chat-example').should('have.length', 4);
  });

  it('shows the button on a phone as well', () => {
    cy.viewport('iphone-x');
    cy.visitApp('/', { lang: 'hr' });
    cy.byCy('chat-button').should('be.visible').and('contain.text', 'AI');
  });

  it('fits the phone screen without scrolling the page', () => {
    stubAnswer({ token: 'Antwort' });
    cy.viewport('iphone-x');
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Frage{enter}');
    cy.byCy('chat-answer').should('contain.text', 'Antwort');
    cy.document().then((doc) => {
      const { scrollWidth, clientWidth, scrollHeight, clientHeight } = doc.documentElement;
      expect(scrollWidth, 'page width').to.be.at.most(clientWidth);
      expect(scrollHeight, 'page height').to.be.at.most(clientHeight);
    });
  });

  it('sends a question and renders the streamed Markdown answer', () => {
    stubAnswer(
      { token: 'Benjamin baut **Apps**. ' },
      { token: 'Siehe [Wetter](/gimmicks/weather) und [GitHub](https://github.com/benjaminmilcic).' },
      { usage: { inputTokens: 1000, outputTokens: 50, totalTokens: 1050, cost: 0.0002 } },
    );
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Was macht Benjamin?{enter}');

    // the website language goes along – the answer language when the message has none (e.g. "aaaa")
    cy.wait('@stream').its('request.body').should('include', { message: 'Was macht Benjamin?', language: 'de' });
    cy.byCy('chat-user-message').should('contain.text', 'Was macht Benjamin?');
    cy.byCy('chat-answer').find('strong').should('have.text', 'Apps');
    cy.byCy('chat-answer').find('a[href="https://github.com/benjaminmilcic"]').should('have.attr', 'target', '_blank');
    // Token counts and costs are not shown
    cy.get('.chat-page').should('not.contain.text', 'Tokens');
  });

  it('notes when older messages were summarized', () => {
    stubAnswer({ summary: { content: 'x', replacedMessages: 2 } }, { token: 'Antwort' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Frage{enter}');
    cy.byCy('chat-summarized').should('contain.text', 'zusammengefasst');
  });

  it('starts the answer level with the assistant icon and has no scrollbar in the input', () => {
    stubAnswer({ token: '## Überschrift\n\nErster Absatz.' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Frage{enter}');
    cy.byCy('chat-answer').find('h2').then(($heading) => {
      const icon = Cypress.$('.assistant-icon')[0].getBoundingClientRect();
      const text = $heading[0].getBoundingClientRect();
      // the first line is centered on the 32px icon (a few px tolerance for the larger heading font)
      expect(Math.abs(text.top + text.height / 2 - (icon.top + icon.height / 2))).to.be.lessThan(4);
    });
    cy.byCy('chat-input').then(($input) => {
      expect(getComputedStyle($input[0]).scrollbarWidth).to.eq('none');
    });
  });

  it('opens internal links in the same tab and keeps the chat', () => {
    stubAnswer({ token: 'Hier: [Wetter](/gimmicks/weather)' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Wetter?{enter}');
    cy.byCy('chat-answer').find('a[data-internal]').should('not.have.attr', 'target');
    cy.byCy('chat-answer').contains('a', 'Wetter').click();

    cy.location('pathname').should('eq', '/gimmicks/weather');
    cy.byCy('chat-button').click();
    cy.byCy('chat-user-message').should('contain.text', 'Wetter?');
  });

  it('shows images from the website and drops images from other hosts', () => {
    stubAnswer({
      token:
        '![Rezept](https://api.benjamin-milcic.dev/files/download/a.png) ![Fremd](https://evil.example.com/pixel.png)',
    });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Rezept?{enter}');
    cy.byCy('chat-answer').find('img').should('have.length', 1).and('have.attr', 'alt', 'Rezept');
  });

  it('asks to try again in a minute when the free tier is used up', () => {
    stubAnswer({ error: 'busy', code: 'rate_limit' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Hallo{enter}');
    cy.byCy('chat-error').should('contain.text', 'Probier es in einer Minute nochmal');
  });

  it('says how long to wait when the free daily allowance is used up', () => {
    stubAnswer({ error: 'used up', code: 'daily_limit', retryAfterMinutes: 23 });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Hallo{enter}');
    cy.byCy('chat-error').should('contain.text', 'Tageskontingent').and('contain.text', 'in etwa 23 Minuten');
  });

  it('shows the same note when the backend limits the visitor', () => {
    cy.intercept(apiRoute('/chat/stream', 'POST'), { statusCode: 429, body: { code: 'rate_limit' } });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Hallo{enter}');
    cy.byCy('chat-error').should('contain.text', 'Probier es in einer Minute nochmal');
  });

  it('offers to share the location for the weather', () => {
    stubAnswer({ tool: 'get_weather' }, { token: 'Wo bist du?' }, { action: 'request_location' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Wie ist das Wetter bei mir?{enter}');
    cy.byCy('chat-share-location').should('be.visible');
  });

  it('keeps the end of a long input in view', () => {
    cy.visitApp('/chat');
    cy.byCy('chat-input').invoke('val', 'a'.repeat(60) + 'b'.repeat(700) + 'c'.repeat(150)).trigger('input');
    cy.byCy('chat-input').type('xyz');
    cy.byCy('chat-input').should(($input) => {
      const el = $input[0] as HTMLTextAreaElement;
      expect(el.scrollHeight).to.be.greaterThan(el.clientHeight);
      expect(el.scrollTop + el.clientHeight).to.be.at.least(el.scrollHeight - 2);
    });
  });

  it('starts a new chat', () => {
    stubAnswer({ token: 'Antwort' });
    cy.intercept(apiRoute('/chat/*', 'DELETE'), { statusCode: 200 }).as('reset');
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Frage{enter}');
    cy.byCy('chat-answer').should('contain.text', 'Antwort');
    cy.byCy('chat-new').click();
    cy.wait('@reset');
    cy.byCy('chat-example').should('have.length', 4);
  });
});
