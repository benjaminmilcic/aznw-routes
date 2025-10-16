import { createReducer, on } from '@ngrx/store';
import { Recipe } from '../../recipes.model';
import * as RecipeActions from '../actions/recipe.actions';

// Interface für den Recipe State
export interface RecipeState {
  recipes: Recipe[];
  search: boolean;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
  savedRecipeId: number;
}

// Initial State - der Anfangszustand der App
export const initialState: RecipeState = {
  recipes: [
    // {
    //   id: 1,
    //   imagePath:
    //     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg/500px-Eq_it-na_pizza-margherita_sep2005_sml.jpg',
    //   ingredients: ['Mehl','Salami'],
    //   preparation: 'Make everything together',
    //   title: 'Pizza',
    // },
    // {
    //   id: 2,
    //   imagePath:
    //     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Pasta_asciutta_%281%29.JPG/250px-Pasta_asciutta_%281%29.JPG',
    //   ingredients: ['Nudeln','Tomaten'],
    //   preparation: 'Cook it and make tomatosouce',
    //   title: 'Pasta',
    // },
  ],
  search: false,
  searchTerm: '',
  isLoading: false,
  error: null,
  savedRecipeId: 0,
};

// Reducer - definiert wie Actions den State verändern
export const recipeReducer = createReducer(
  initialState,

  on(RecipeActions.setSearch, (state, { search }) => {
    return {
      ...state,
      search,
    };
  }),

  on(RecipeActions.setSearchTerm, (state, { searchTerm }) => {
    return {
      ...state,
      searchTerm,
    };
  }),

  on(RecipeActions.deleteRecipe, (state) => {
    return {
      ...state,
      isLoading: true,
      error: null,
    };
  }),

  on(RecipeActions.deleteRecipeSuccess, (state, { id }) => {
    return {
      ...state,
      recipes: state.recipes.filter((recipe) => recipe.id !== id),
      isLoading: false,
      error: null,
    };
  }),

  on(RecipeActions.deleteRecipeFailure, (state, { error }) => {
    return {
      ...state,
      isLoading: false,
      error,
    };
  }),

  on(RecipeActions.addRecipe, (state) => {
    return {
      ...state,
      isLoading: true,
      error: null,
    };
  }),

  on(RecipeActions.addRecipeSuccess, (state, { recipe }) => {
    return {
      ...state,
      recipes: [...state.recipes, recipe],
      isLoading: false,
      error: null,
      savedRecipeId: recipe.id,
    };
  }),

  on(RecipeActions.addRecipeFailure, (state, { error }) => {
    return {
      ...state,
      isLoading: false,
      error,
    };
  }),

  on(RecipeActions.loadRecipes, (state) => {
    return {
      ...state,
      isLoading: true,
      error: null,
    };
  }),

  on(RecipeActions.loadRecipesSuccess, (state, { recipes }) => {
    return {
      ...state,
      recipes,
      isLoading: false,
      error: null,
    };
  }),

  on(RecipeActions.loadRecipesFailure, (state, { error }) => {
    return {
      ...state,
      isLoading: false,
      error,
    };
  }),

  on(RecipeActions.updateRecipe, (state) => {
    return {
      ...state,
      isLoading: true,
      error: null,
    };
  }),

  on(RecipeActions.updateRecipeSuccess, (state, { recipe }) => {
    return {
      ...state,
      recipes: state.recipes.map((r) => (r.id === recipe.id ? recipe : r)),
      isLoading: false,
      error: null,
      savedRecipeId: recipe.id,
    };
  }),

  on(RecipeActions.updateRecipeFailure, (state, { error }) => {
    return {
      ...state,
      isLoading: false,
      error,
    };
  })
);
