import { createAction, props } from '@ngrx/store';
import { Recipe,RecipeWithoutId } from '../../recipes.model';

export const setSearch = createAction(
  '[Recipe] Set Search',
  props<{ search: boolean }>()
);

export const setSearchTerm = createAction(
  '[Recipe] Set SearchTerm',
  props<{ searchTerm: string }>()
);

export const deleteRecipe = createAction(
  '[Recipe] Delete Recipe',
  props<{ id: number }>()
);

export const deleteRecipeSuccess = createAction(
  '[Recipe API] Delete Recipe Success',
  props<{ id: number }>()
);

export const deleteRecipeFailure = createAction(
  '[Recipe API] Delete Recipe Failure',
  props<{ error: string }>()
);

export const addRecipe = createAction(
  '[Recipe] Add Recipe',
  props<{ recipe: RecipeWithoutId }>()
);

export const addRecipeSuccess = createAction(
  '[Recipe API] Add Recipe Success',
  props<{ recipe: Recipe }>()
);

export const addRecipeFailure = createAction(
  '[Recipe API] Add Recipe Failure',
  props<{ error: string }>()
);

export const loadRecipes = createAction(
  '[Recipe] Load Recipes',
);

export const loadRecipesSuccess = createAction(
  '[Recipe API] Load Recipes Success',
  props<{ recipes: Recipe[] }>()
);

export const loadRecipesFailure = createAction(
  '[Recipe API] Load Recipes Failure',
  props<{ error: string }>()
);

export const updateRecipe = createAction(
  '[Recipe] Update Recipe',
  props<{ id: number; recipe: RecipeWithoutId }>()
);

export const updateRecipeSuccess = createAction(
  '[Recipe API] Update Recipe Success',
  props<{ recipe: Recipe }>()
);

export const updateRecipeFailure = createAction(
  '[Recipe API] Update Recipe Failure',
  props<{ error: string }>()
);

export const translateRecipe = createAction(
  '[Recipe] Translate Recipe',
  props<{ recipeId: number }>()
);

export const translateRecipeSuccess = createAction(
  '[Recipe API] Translate Recipe Success',
  props<{ recipeId: number }>()
);

export const translateRecipeFailure = createAction(
  '[Recipe API] Translate Recipe Failure',
  props<{ error: string }>()
);

