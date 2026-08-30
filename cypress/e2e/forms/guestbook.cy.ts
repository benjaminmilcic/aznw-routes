import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Gaestebuch.
 *
 * Der Beitragstext entsteht im TinyMCE-Editor, der aus der Cloud nachgeladen
 * wird und in Tests bewusst nicht zur Verfuegung steht. Geprueft wird deshalb
 * alles drumherum: Liste, Sortierung, Dialog und die Anfrage an die API - der
 * Editor selbst ist fremder Code und braucht keinen eigenen Test.
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

    // Fixture-Reihenfolge ist bewusst unsortiert: 2026-03, 2026-05, 2026-01.
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

    // Nach dem Speichern wird die Liste neu geladen und der Dialog schliesst.
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
