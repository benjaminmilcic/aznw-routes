export interface Recipe {
  id: number;
  title: string;
  ingredients: string[];
  imagePath: string;
  preparation: string;
}

export interface RecipeSummary {
  id: number;
  title: string;
  imagePath: string;
}

export interface RecipeWithoutId {
  title: string;
  ingredients: string[];
  imagePath: string;
  preparation: string;
}
