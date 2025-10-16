import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import * as RecipeActions from '../actions/recipe.actions';
import { of } from 'rxjs';
import { RecipesService } from '../../recipes.service';
import { FilesService } from '../../files.service';
import { environment } from '../../../../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';

export class RecipeEffects {
  private actions$ = inject(Actions);
  private recipesService = inject(RecipesService);
  private filesService = inject(FilesService);
  private translateService = inject(TranslateService);

  loadError = {
    de: 'Unbekannter Fehler beim Laden der Rezepte',
    en: 'Unknown error while loading recipes',
    hr: 'Nepoznata greška prilikom učitavanja recepata',
  };

  addError = {
    de: 'Fehler beim Hochladen des Bildes oder Speichern des Rezepts',
    en: 'Error uploading image or saving recipe',
    hr: 'Pogreška pri učitavanju slike ili spremanju recepta',
  };

  addError2 = {
    de: 'Unbekannter Fehler beim Speichern des Rezepts',
    en: 'Unknown error while saving the recipe',
    hr: 'Nepoznata greška prilikom spremanja recepta',
  };

  deleteError = {
    de: 'Unbekannter Fehler beim Löschen des Rezepts',
    en: 'Unknown error while deleting the recipe',
    hr: 'Nepoznata greška prilikom brisanja recepta',
  };

  updateError = {
    de: 'Fehler beim Hochladen des Bildes oder Aktualisieren des Rezepts',
    en: 'Error uploading image or updating recipe',
    hr: 'Pogreška pri učitavanju slike ili ažuriranju recepta',
  };

  updateError2 = {
    de: 'Unbekannter Fehler beim Aktualisieren des Rezepts',
    en: 'Unknown error while updating the recipe',
    hr: 'Nepoznata greška prilikom ažuriranja recepta',
  };

  loadRecipes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecipeActions.loadRecipes),
      switchMap(() =>
        this.recipesService.getRecipes().pipe(
          map((recipes) => RecipeActions.loadRecipesSuccess({ recipes })),
          catchError((error) => {
            console.error('API Error:', error);
            // 👇 Hier wird die echte Fehlermeldung extrahiert:
            const message =
              error?.error?.message?.[this.translateService.currentLang] ||
              error?.message ||
              this.loadError[this.translateService.currentLang];
            return of(RecipeActions.loadRecipesFailure({ error: message }));
          })
        )
      )
    )
  );

  // Effect um Recipe zu speichern (mit Bild-Upload falls nötig)
  addRecipe$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecipeActions.addRecipe),
      switchMap(({ recipe }) => {
        // Prüfe ob Bild als dataURL vorhanden ist
        if (recipe.imagePath && recipe.imagePath.startsWith('data:')) {
          console.log('Effect: Uploading image first...');

          // 1. Bild hochladen
          return this.filesService.uploadImage(recipe.imagePath).pipe(
            concatMap((uploadResponse) => {
              console.log('Effect: Image uploaded:', uploadResponse.file);

              // 2. Recipe mit Datei-URL speichern
              const recipeWithFilePath = {
                ...recipe,
                imagePath: `${environment.recipes.filesUrl}/download/${uploadResponse.file}`,
              };

              return this.recipesService.addRecipe(recipeWithFilePath).pipe(
                map((savedRecipe) => {
                  console.log('Effect: Recipe saved successfully');
                  return RecipeActions.addRecipeSuccess({
                    recipe: savedRecipe,
                  });
                })
              );
            }),
            catchError((error) => {
              console.error(
                'Effect: Error during image upload or recipe save:',
                error
              );
              const message =
                error?.error?.message?.[this.translateService.currentLang] ||
                error?.message ||
                this.addError[this.translateService.currentLang];
              return of(RecipeActions.addRecipeFailure({ error: message }));
            })
          );
        } else {
          // Kein Bild-Upload nötig, direkt speichern
          console.log('Effect: No image upload needed, saving recipe directly');
          return this.recipesService.addRecipe(recipe).pipe(
            map((savedRecipe) =>
              RecipeActions.addRecipeSuccess({ recipe: savedRecipe })
            ),
            catchError((error) => {
              console.error('Effect: API Error:', error);
              const message =
                error?.error?.message?.[this.translateService.currentLang] ||
                error?.message ||
                this.addError2[this.translateService.currentLang];
              return of(RecipeActions.addRecipeFailure({ error: message }));
            })
          );
        }
      })
    )
  );

  deleteRecipe$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecipeActions.deleteRecipe),
      switchMap(({ id }) =>
        this.recipesService.deleteRecipe(id).pipe(
          map((recipes) => RecipeActions.deleteRecipeSuccess({ id })),
          catchError((error) => {
            console.error('API Error:', error);
            // 👇 Hier wird die echte Fehlermeldung extrahiert:
            const message =
              error?.error?.message?.[this.translateService.currentLang] ||
              error?.message ||
              this.deleteError[this.translateService.currentLang];
            return of(RecipeActions.deleteRecipeFailure({ error: message }));
          })
        )
      )
    )
  );

  // Effect um Recipe zu aktualisieren (mit Bild-Upload falls nötig)
  updateRecipe$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RecipeActions.updateRecipe),
      switchMap(({ id, recipe }) => {
        // Prüfe ob Bild als dataURL vorhanden ist
        if (recipe.imagePath && recipe.imagePath.startsWith('data:')) {
          console.log('Effect: Uploading image first...');

          // 1. Bild hochladen
          return this.filesService.uploadImage(recipe.imagePath).pipe(
            concatMap((uploadResponse) => {
              console.log('Effect: Image uploaded:', uploadResponse.file);

              // 2. Recipe mit Datei-URL aktualisieren
              const recipeWithFilePath = {
                ...recipe,
                imagePath: `${environment.recipes.filesUrl}/download/${uploadResponse.file}`,
              };

              return this.recipesService.updateRecipe(id, recipeWithFilePath).pipe(
                map((updatedRecipe) => {
                  console.log('Effect: Recipe updated successfully');
                  return RecipeActions.updateRecipeSuccess({
                    recipe: updatedRecipe,
                  });
                })
              );
            }),
            catchError((error) => {
              console.error(
                'Effect: Error during image upload or recipe update:',
                error
              );
              const message =
                error?.error?.message?.[this.translateService.currentLang] ||
                error?.message ||
                this.updateError[this.translateService.currentLang];
              return of(RecipeActions.updateRecipeFailure({ error: message }));
            })
          );
        } else {
          // Kein Bild-Upload nötig, direkt aktualisieren
          console.log('Effect: No image upload needed, updating recipe directly');
          return this.recipesService.updateRecipe(id, recipe).pipe(
            map((updatedRecipe) =>
              RecipeActions.updateRecipeSuccess({ recipe: updatedRecipe })
            ),
            catchError((error) => {
              console.error('Effect: API Error:', error);
              const message =
                error?.error?.message?.[this.translateService.currentLang] ||
                error?.message ||
                this.updateError2[this.translateService.currentLang];
              return of(RecipeActions.updateRecipeFailure({ error: message }));
            })
          );
        }
      })
    )
  );
}
