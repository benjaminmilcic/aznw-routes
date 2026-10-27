import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Guestbook.
 *
 * The post text is written in the TinyMCE editor, which is loaded from the cloud
 * and is deliberately not available in tests. That's why everything around it
 * is checked: list, sorting, dialog and the request to the API - the
 * editor itself is third-party code and needs no test of its own.
 */
describe('Guestbook', () => {
  const POSTS = API_PATHS.guestbook;

  beforeEach(() => {
    cy.intercept(apiRoute(POSTS), { fixture: 'guestbook-posts.json' }).as(
      'loadPosts',
    );
  });

  it('shows the entries returned by the API', () => {
    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPosts');

    cy.byCy('guestbook-post').should('have.length', 3);
    cy.byCy('guestbook-post').first().should('contain.text', 'Alan Turing');
  });

  it('sorts the entries with the newest first', () => {
    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPosts');

    // The fixture order is deliberately unsorted: 2026-03, 2026-05, 2026-01.
    cy.byCy('guestbook-post').eq(0).should('contain.text', 'Alan Turing');
    cy.byCy('guestbook-post').eq(1).should('contain.text', 'Ada Lovelace');
    cy.byCy('guestbook-post').eq(2).should('contain.text', 'Grace Hopper');
  });

  it('renders the stored HTML of an entry', () => {
    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPosts');

    cy.byCy('guestbook-post')
      .first()
      .find('.post-content p')
      .should('contain.text', 'weather charts');
  });

  it('opens the dialog for a new entry', () => {
    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPosts');

    cy.byCy('guestbook-dialog').should('not.be.visible');

    cy.byCy('guestbook-new-post').click();

    cy.byCy('guestbook-dialog').should('be.visible');
    cy.byCy('guestbook-save-post').should('be.visible');
  });

  it('posts the entered name to the API and reloads the list', () => {
    cy.intercept(apiRoute(POSTS, 'POST'), { statusCode: 201, body: {} }).as(
      'createPost',
    );

    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPosts');

    cy.byCy('guestbook-new-post').click();
    cy.byCy('guestbook-name').find('input').type('Test Visitor');
    cy.byCy('guestbook-save-post').click();

    cy.wait('@createPost').then(({ request }) => {
      const body =
        typeof request.body === 'string'
          ? JSON.parse(request.body)
          : request.body;

      expect(body.name).to.equal('Test Visitor');
      expect(body).to.have.property('date');
    });

    // After saving, the list is reloaded and the dialog closes.
    cy.wait('@loadPosts');
    cy.byCy('guestbook-dialog').should('not.be.visible');
  });

  it('stays usable when the entries cannot be loaded', () => {
    cy.intercept(apiRoute(POSTS), { statusCode: 500, body: {} }).as(
      'loadPostsFailed',
    );

    cy.visitApp('/gimmicks/guestbook');
    cy.wait('@loadPostsFailed');

    cy.byCy('guestbook-post').should('not.exist');
    cy.byCy('guestbook-new-post').should('be.visible');
    cy.byCy('page-not-found').should('not.exist');
  });
});
