import { Component, signal, effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { selectRecipeById, selectError } from '../store/selectors/recipe.selectors';
import { Recipe } from '../recipes.model';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import {
  RecipesService,
  SupportedLanguage,
  TranslatedRecipe,
} from '../recipes.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as RecipeActions from '../store/actions/recipe.actions';

@Component({
  selector: 'app-recipe-item',
  templateUrl: './recipe-item.component.html',
  styleUrls: ['./recipe-item.component.css'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
    TranslateModule,
  ],
})
export class RecipeItemComponent {
  recipeId = signal<number>(0);
  error = signal<boolean>(true);
  isTranslating = signal<boolean>(false);
  detectedLanguage = signal<string | null>(null);
  currentLanguage = signal<SupportedLanguage | null>(null);

  private originalRecipe$ = new BehaviorSubject<Recipe | null>(null);
  private translatedRecipe$ = new BehaviorSubject<TranslatedRecipe | null>(
    null
  );

  // Combines original and translation
  recipe: Observable<Recipe> = combineLatest([
    toObservable(this.recipeId).pipe(
      switchMap((id) => this.store.select(selectRecipeById(id))),
      tap((recipe) => {
        if (recipe) {
          this.originalRecipe$.next(recipe);
          // Detect the language on load
          const lang = this.recipeService.detectLanguage(recipe.preparation);
          this.detectedLanguage.set(lang);
        }
      })
    ),
    this.translatedRecipe$,
  ]).pipe(
    map(([original, translated]) => {
      // Show the translation if available, otherwise the original
      return translated || original;
    })
  );

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private recipeService: RecipesService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        map((id) => (isNaN(id) || id <= 0 ? null : id))
      )
      .subscribe((id) => {
        if (id === null) {
          this.error.set(true);
          return;
        }
        this.recipeId.set(id);
        this.error.set(false);
        // Reset the translation when the recipe changes
        this.translatedRecipe$.next(null);
        this.currentLanguage.set(null);
      });
  }

  onUpdateRecipe(id: number) {
    this.recipeService.changeRoute.next({
      id,
      route: 'update',
    });
  }

  onPrint() {
    // Temporarily store the currently shown version (translated or original)
    const currentRecipe = this.translatedRecipe$.value || this.originalRecipe$.value;

    if (currentRecipe) {
      // Store the current recipe in sessionStorage for the print view
      sessionStorage.setItem('recipe_print_temp', JSON.stringify(currentRecipe));
    }

    this.router.navigate([
      '/',
      {
        outlets: {
          print: ['print-recipe', this.recipeId()],
        },
      },
    ]);
  }

  /**
   * Translates the recipe into the selected language
   */
  translateTo(language: SupportedLanguage) {
    const original = this.originalRecipe$.value;
    if (!original) {
      console.error('No recipe to translate');
      return;
    }

    this.isTranslating.set(true);
    this.currentLanguage.set(language);

    // Dispatch the action for translation start
    this.store.dispatch(RecipeActions.translateRecipe({ recipeId: original.id }));

    this.recipeService.translateRecipe(original, language).subscribe({
      next: (translated) => {
        this.translatedRecipe$.next(translated);
        this.isTranslating.set(false);

        // Dispatch Success Action
        this.store.dispatch(RecipeActions.translateRecipeSuccess({ recipeId: original.id }));
      },
      error: (error) => {
        console.error('Translation failed:', error);
        this.isTranslating.set(false);

        // Error mapping based on the current language
        let errorMessage = '';
        const errorCode = error.message;

        switch (errorCode) {
          case 'TRANSLATION_RATE_LIMIT_EXCEEDED':
            errorMessage = this.translate.instant('gimmicks.recipes.translationRateLimitExceeded');
            break;
          case 'TRANSLATION_TOO_MANY_REQUESTS':
            errorMessage = this.translate.instant('gimmicks.recipes.translationTooManyRequests');
            break;
          case 'TRANSLATION_NETWORK_ERROR':
            errorMessage = this.translate.instant('gimmicks.recipes.translationNetworkError');
            break;
          case 'TRANSLATION_API_ERROR':
            errorMessage = this.translate.instant('gimmicks.recipes.translationApiError');
            break;
          default:
            errorMessage = this.translate.instant('gimmicks.recipes.translationUnknownError');
        }

        // Dispatch Failure Action
        this.store.dispatch(RecipeActions.translateRecipeFailure({ error: errorMessage }));
      },
    });
  }

  /**
   * Shows the original recipe
   */
  showOriginal() {
    this.translatedRecipe$.next(null);
    this.currentLanguage.set(null);
  }

  /**
   * Clears the entire translation cache
   */
  clearCache() {
    this.recipeService.clearTranslationCache();
    this.showOriginal(); // Show the original after clearing the cache
    console.log('Translation cache cleared');
  }

  /**
   * Returns the language labels
   */
  getLanguageLabel(lang: SupportedLanguage): string {
    return this.translate.instant(`gimmicks.recipes.${lang === 'de' ? 'german' : lang === 'en' ? 'english' : 'croatian'}`);
  }

  /**
   * Returns the label of the detected language
   */
  getDetectedLanguageLabel(): string {
    const lang = this.detectedLanguage();
    if (!lang || lang === 'unknown') {
      return this.translate.instant('gimmicks.recipes.unknown');
    }
    return this.getLanguageLabel(lang as SupportedLanguage);
  }
}
