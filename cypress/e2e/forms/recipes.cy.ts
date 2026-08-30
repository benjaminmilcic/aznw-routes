import { API_PATHS, apiRoute } from '../../support/api';
/**
 * Rezeptverwaltung (NgRx-Store + eigene API).
 *
 * Deeplinks in diesen Bereich muessen funktionieren: ein einzelnes Rezept
 * soll sich verlinken lassen, und ein Neuladen darf einen nicht auf die Liste
 * zurueckwerfen. Frueher navigierte `RecipesComponent.ngOnInit` bedingungslos
 * auf `/list` und hat genau das verhindert - die Tests unten halten den
 * reparierten Zustand fest.
 */
describe('Recipes', () => {
  const RECIPES = API_PATHS.recipes;

  const openRecipes = () => {
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );
    cy.visitApp('/gimmicks/recipes/list');
    cy.wait('@loadRecipes');
  };

  it('lists the recipes returned by the API', () => {
    openRecipes();

    cy.byCy('recipe-item').should('have.length', 2);
    cy.byCy('recipe-item').first().should('contain.text', 'Pancakes');
    cy.byCy('recipe-item').last().should('contain.text', 'Tomato Soup');
  });

  it('opens a single recipe through a direct link', () => {
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes/recipe/1');
    cy.wait('@loadRecipes');

    cy.location('pathname').should('eq', '/gimmicks/recipes/recipe/1');
    cy.byCy('recipe-title').should('contain.text', 'Pancakes');
  });

  it('opens the form through a direct link and marks its tab', () => {
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes/add');

    cy.location('pathname').should('eq', '/gimmicks/recipes/add');
    cy.byCy('recipe-form-title').should('be.visible');
    // Der Reiter muss zum Formular passen, nicht zur Liste.
    cy.byCy('recipes-tab-add').should('have.class', 'text-orange-300');
  });

  it('keeps a recipe on screen after a reload', () => {
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes/recipe/2');
    cy.byCy('recipe-title').should('contain.text', 'Tomato Soup');

    cy.reload();

    cy.location('pathname').should('eq', '/gimmicks/recipes/recipe/2');
    cy.byCy('recipe-title').should('contain.text', 'Tomato Soup');
  });

  it('still sends the bare area address to the list', () => {
    // Das erledigt die Umleitung in app.routes.ts - nicht mehr ngOnInit.
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes');

    cy.location('pathname').should('eq', '/gimmicks/recipes/list');
  });

  it('opens a recipe with its ingredients and preparation', () => {
    openRecipes();
    cy.intercept(apiRoute('/recipes/1'), {
      fixture: 'recipe-detail.json',
    }).as('loadRecipe');

    cy.byCy('recipe-item').first().click();

    cy.location('pathname').should('include', '/gimmicks/recipes/recipe/');
    cy.byCy('recipe-title').should('contain.text', 'Pancakes');
    cy.contains('200 g flour').should('be.visible');
    cy.contains('Mix everything and bake in a pan.').should('be.visible');
  });

  it('shows the picture in the same square box as the placeholder', () => {
    /**
     * Ohne feste Masse zieht Flexbox das Bild auf die Hoehe der Textspalte:
     * der Container setzt kein items-*, es gilt also align-items: stretch,
     * und Tailwinds Preflight (img { height: auto }) ist in diesem Projekt
     * abgeschaltet. Je laenger das Rezept, desto staerker die Verzerrung.
     *
     * Geprueft wird die gerenderte Box, nicht das Bild: die Fixture liefert
     * absichtlich ein 1x1-Pixel, damit nur das CSS die Groesse bestimmt.
     */
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes/recipe/1');
    cy.byCy('recipe-title').should('contain.text', 'Pancakes');

    cy.byCy('recipe-image').should(($image) => {
      const box = $image[0].getBoundingClientRect();
      expect(Math.round(box.width), 'Breite').to.equal(200);
      expect(Math.round(box.height), 'Hoehe').to.equal(200);
    });
  });

  it('gives a recipe without a picture the same box', () => {
    cy.intercept(apiRoute(RECIPES), { fixture: 'recipes.json' }).as(
      'loadRecipes',
    );

    cy.visitApp('/gimmicks/recipes/recipe/2');
    cy.byCy('recipe-title').should('contain.text', 'Tomato Soup');

    // Der Platzhalter setzt seine Groesse selbst - beide Zweige muessen
    // gleich aussehen, sonst springt das Layout beim Wechsel.
    cy.byCy('recipe-image').should('not.exist');
    cy.byCy('recipe-image-placeholder').should(($box) => {
      const box = $box[0].getBoundingClientRect();
      // Exakt dieselbe Box wie das Bild. Der Platzhalter hat einen
      // 1px-Rahmen; damit der nach innen geht statt aussen drauf, traegt er
      // box-border - ohne Tailwinds Preflight gibt es kein globales
      // box-sizing: border-box, das ihm das abnehmen wuerde.
      expect(Math.round(box.width), 'Breite').to.equal(200);
      expect(Math.round(box.height), 'Hoehe').to.equal(200);
    });
  });

  it('filters the list through the search tab', () => {
    openRecipes();

    cy.byCy('recipes-tab-search').click();
    cy.get('input[matInput]').first().type('Tomato');

    cy.byCy('recipe-item').should('have.length', 1);
    cy.byCy('recipe-item').should('contain.text', 'Tomato Soup');
  });

  it('sends a new recipe to the API', () => {
    openRecipes();
    cy.intercept(apiRoute(RECIPES, 'POST'), {
      statusCode: 201,
      body: { id: 3, title: 'Test Recipe', ingredients: [], imagePath: '', preparation: '' },
    }).as('createRecipe');

    cy.byCy('recipes-tab-add').click();

    cy.byCy('recipe-form-title').type('Test Recipe');
    cy.byCy('recipe-form-preparation').type('Stir well and serve.');
    cy.byCy('recipe-form-save').click();

    cy.wait('@createRecipe').then(({ request }) => {
      expect(request.body.title).to.equal('Test Recipe');
      expect(request.body.preparation).to.equal('Stir well and serve.');
    });

    cy.byCy('recipe-saved').should('be.visible');
  });

  it('adds another ingredient field on demand', () => {
    openRecipes();

    cy.byCy('recipes-tab-add').click();

    // Das Formular startet ohne Zutatenfeld - erst der Knopf legt eines an.
    cy.byCy('recipe-form-add-ingredient').click();
    cy.get('[formarrayname="ingredients"] input')
      .should('have.length.at.least', 1)
      .then(($fields) => {
        const count = $fields.length;
        cy.byCy('recipe-form-add-ingredient').click();
        cy.get('[formarrayname="ingredients"] input').should(
          'have.length',
          count + 1,
        );
      });
  });

  it('asks before deleting and does nothing when cancelled', () => {
    openRecipes();
    cy.intercept(apiRoute(API_PATHS.recipe, 'DELETE'), { statusCode: 200, body: {} }).as(
      'deleteRecipe',
    );

    cy.byCy('recipe-item').first().find('[data-cy="recipe-delete"]').click();

    cy.byCy('recipe-delete-cancel').should('be.visible').click();

    cy.get('@deleteRecipe.all').should('have.length', 0);
    cy.byCy('recipe-item').should('have.length', 2);
  });

  it('deletes a recipe after confirmation', () => {
    openRecipes();
    cy.intercept(apiRoute(API_PATHS.recipe, 'DELETE'), { statusCode: 200, body: {} }).as(
      'deleteRecipe',
    );

    cy.byCy('recipe-item').first().find('[data-cy="recipe-delete"]').click();
    cy.byCy('recipe-delete-confirm').click();

    cy.wait('@deleteRecipe')
      .its('request.url')
      .should('include', '/recipes/1');
  });

  it('shows a message when the recipes cannot be loaded', () => {
    cy.intercept(apiRoute(RECIPES), { statusCode: 500, body: {} }).as(
      'loadRecipesFailed',
    );

    cy.visitApp('/gimmicks/recipes/list');
    cy.wait('@loadRecipesFailed');

    cy.byCy('recipes-error').should('be.visible').and('not.be.empty');
    cy.byCy('page-not-found').should('not.exist');
  });
});
