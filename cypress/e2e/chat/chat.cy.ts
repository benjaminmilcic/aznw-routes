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

  it('opens the chat where the link was after going back', () => {
    const lines = (from: number) => Array.from({ length: 60 }, (_, i) => `Zeile ${from + i}`).join('\n\n');
    stubAnswer({ token: `${lines(1)}\n\n[Wetter](/gimmicks/weather)\n\n${lines(61)}` });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Viel Text{enter}');
    cy.byCy('chat-answer').should('contain.text', 'Zeile 120');
    cy.byCy('chat-answer').contains('a', 'Wetter').scrollIntoView();
    cy.get('.chat-messages').then(($el) => {
      const before = $el[0].scrollTop;
      expect(before, 'scrolled up from the end').to.be.lessThan($el[0].scrollHeight - $el[0].clientHeight - 100);
      cy.byCy('chat-answer').contains('a', 'Wetter').click();
      cy.location('pathname').should('eq', '/gimmicks/weather');
      cy.go('back');
      cy.location('pathname').should('eq', '/chat');
      cy.get('.chat-messages').should(($back) => expect($back[0].scrollTop).to.be.closeTo(before, 2));
    });
  });

  it('opens a portfolio project as a dialog above the chat and stays in the chat', () => {
    stubAnswer({ token: 'Zum Beispiel [Webaro](/?project=webaro#portfolio).' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Projekte?{enter}');
    cy.byCy('chat-answer').contains('a', 'Webaro').click();
    cy.get('app-project-dialog dialog').should('have.attr', 'open');
    cy.get('app-project-dialog .dialog-title').should('contain.text', 'Webaro');
    cy.location('pathname').should('eq', '/chat');
    cy.get('#portfolio').should('not.exist');

    cy.get('app-project-dialog .close-btn').click();
    cy.get('app-project-dialog dialog').should('not.have.attr', 'open');
    cy.location('pathname').should('eq', '/chat');
    cy.byCy('chat-answer').should('contain.text', 'Webaro');
  });

  it('still opens the project from a link opened in a new tab', () => {
    cy.visitApp('/?project=webaro#portfolio');
    cy.get('#portfolio app-project-dialog dialog').should('have.attr', 'open');
    cy.get('#portfolio .dialog-title').should('contain.text', 'Webaro');
  });

  it('shows links to the chat itself and links without a target as plain text', () => {
    // The backend empties the target of an invented path that fits no page
    stubAnswer({
      token: 'Auch der [KI-Chat](/chat) ist ein Projekt von ihm, siehe [Wetter](/gimmicks/weather) und [Aufbau der Webseite]().',
    });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('KI?{enter}');
    cy.byCy('chat-answer').should('contain.text', 'Auch der KI-Chat ist ein Projekt').and('contain.text', 'Aufbau der Webseite');
    cy.byCy('chat-answer').find('a').should('have.length', 1).and('contain.text', 'Wetter');
  });

  it('opens the CV as PDF in a new tab and shows GitHub links in full', () => {
    stubAnswer({
      token:
        'Siehe [Lebenslauf](/assets/cv/benjamin_milcic_cv_de.pdf) und [aznw-routes](https://github.com/benjaminmilcic/aznw-routes).',
    });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Lebenslauf?{enter}');
    cy.byCy('chat-answer')
      .contains('a', 'Lebenslauf')
      .should(($link) => {
        expect($link).not.to.have.attr('data-internal');
        expect($link).to.have.attr('target', '_blank');
        expect($link).to.have.attr('href', '/assets/cv/benjamin_milcic_cv_de.pdf');
      });
    cy.byCy('chat-answer')
      .find('a[href="https://github.com/benjaminmilcic/aznw-routes"]')
      .should('have.text', 'https://github.com/benjaminmilcic/aznw-routes');
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

  it('asks to try again in a minute when the per-minute limit is reached', () => {
    stubAnswer({ error: 'busy', code: 'rate_limit' });
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Hallo{enter}');
    cy.byCy('chat-error').should('contain.text', 'Probier es in einer Minute nochmal');
  });

  it('says from when the chat answers again once the daily budget is used up', () => {
    stubAnswer({ error: 'used up', code: 'daily_limit', retryAfterMinutes: 90 });
    // Only Date is frozen – timers keep running, so the page still loads and streams
    cy.clock(new Date(2026, 9, 28, 22, 30).getTime(), ['Date']);
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Hallo{enter}');
    cy.byCy('chat-error').should('contain.text', 'Tagesbudget').and('contain.text', 'Ab 00:00 Uhr');
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

  it('keeps a short dictated question on one line', () => {
    cy.intercept(apiRoute('/chat/transcribe', 'POST'), { statusCode: 200, body: { text: 'Wer ist Benjamin?' } });
    cy.visitApp('/chat', {
      onBeforeLoad(win) {
        // A test tone instead of the real microphone, for the waveform
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').callsFake(async () => {
          const ctx = new win.AudioContext();
          const destination = ctx.createMediaStreamDestination();
          const oscillator = ctx.createOscillator();
          oscillator.connect(destination);
          oscillator.start();
          return destination.stream;
        });
        // The real MediaRecorder sometimes has no data yet right after starting – then nothing is transcribed
        class FakeRecorder {
          mimeType = 'audio/webm';
          ondataavailable?: (event: { data: Blob }) => void;
          onstop?: () => void;
          constructor(readonly stream: MediaStream) {}
          start(): void {}
          stop(): void {
            this.ondataavailable?.({ data: new win.Blob(['audio'], { type: this.mimeType }) });
            this.onstop?.();
          }
        }
        Object.defineProperty(win, 'MediaRecorder', { value: FakeRecorder, configurable: true });
      },
    });
    cy.byCy('chat-input').then(($input) => cy.wrap($input[0].offsetHeight).as('oneLine'));
    cy.byCy('chat-mic').click();
    cy.get('button').contains('mat-icon', 'check').click();
    cy.byCy('chat-input').should('have.value', 'Wer ist Benjamin?');
    cy.get<number>('@oneLine').then((oneLine) => {
      cy.byCy('chat-input').should(($input) => expect($input[0].offsetHeight).to.equal(oneLine));
    });
  });

  it('reads an answer aloud in its language and stops on a second click', () => {
    stubAnswer({ token: 'Benjamin is a full stack developer. He works with Angular and NestJS.' });
    // Slow on purpose, so the button still shows "stop" while the first sentence is synthesised
    cy.intercept(apiRoute('/chat/speech', 'POST'), { statusCode: 503, delay: 1500 }).as('speech');
    cy.visitApp('/chat');
    cy.byCy('chat-input').type('Who is Benjamin?{enter}');
    cy.byCy('chat-answer').should('contain.text', 'NestJS');
    cy.byCy('chat-read-aloud').click();
    cy.byCy('chat-read-aloud').should('contain.text', 'stop_circle');
    // English answer on the German website: the English voice reads it
    cy.wait('@speech').its('request.body').should('deep.include', { language: 'en' });
    cy.byCy('chat-read-aloud').click();
    cy.byCy('chat-read-aloud').should('contain.text', 'volume_up');
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
