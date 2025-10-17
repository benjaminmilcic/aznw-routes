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

/**
 * Entfernt Akzente aus einem String
 * Beispiel: 'Ćevapčići' => 'Cevapcici'
 */
const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
};

export const selectFilteredRecipesSummary = createSelector(
  selectAllRecipesSummary,
  selectSearch,
  selectSearchTerm,
  (recipes: RecipeSummary[], search: boolean, searchTerm: string) => {
    if (!search) {
      return recipes;
    } else {
      if (!searchTerm) {
        return [];
      }

      return recipes.filter((recipe) => {
        const titleLower = recipe.title.toLocaleLowerCase();
        const titleWithoutAccents = removeAccents(titleLower);

        // Exakte Suche: Suche immer im Original-Titel
        // UND zusätzlich im Titel ohne Akzente (damit "c" auch "Ćevapčići" findet)
        return (
          titleLower.includes(searchTerm.toLocaleLowerCase()) ||
          titleWithoutAccents.includes(searchTerm.toLocaleLowerCase())
        );
      });
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
