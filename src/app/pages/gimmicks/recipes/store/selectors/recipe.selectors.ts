import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RecipeState } from '../reducers/recipe.reducer';
import { Recipe, RecipeSummary } from '../../recipes.model';

export const selectRecipeState = createFeatureSelector<RecipeState>('recipes');

export const selectSearch = createSelector(
  selectRecipeState,
  (state: RecipeState) => state.search
);

export const selectSearchTerm = createSelector(
  selectRecipeState,
  (state: RecipeState) => state.searchTerm
);

export const selectAllRecipesSummary = createSelector(
  selectRecipeState,
  (state: RecipeState) =>
    state.recipes
      .map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        imagePath: recipe.imagePath,
      }))
      .sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      )
);

export const selectFilteredRecipesSummary = createSelector(
  selectAllRecipesSummary,
  selectSearch,
  selectSearchTerm,
  (recipes: RecipeSummary[], search: boolean, searchTerm: string) => {
    if (!search) {
      return recipes;
    } else {
      return searchTerm
        ? recipes.filter((recipe) =>
            recipe.title
              .toLocaleLowerCase()
              .includes(searchTerm.toLocaleLowerCase())
          )
        : [];
    }
  }
);

export const selectIsLoading = createSelector(
  selectRecipeState,
  (state: RecipeState) => state.isLoading
);

export const selectError = createSelector(
  selectRecipeState,
  (state: RecipeState) => state.error
);

export const selectRecipeById = (id: number) =>
  createSelector(selectRecipeState, (state: RecipeState) =>
    state.recipes.find((recipe) => recipe.id === id)
  );

export const selectSavedRecipeId = createSelector(
  selectRecipeState,
  (state: RecipeState) => state.savedRecipeId
);
