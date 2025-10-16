import { Component, signal, effect } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { selectRecipeById } from '../store/selectors/recipe.selectors';
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

  // Kombiniert Original und Übersetzung
  recipe: Observable<Recipe> = combineLatest([
    toObservable(this.recipeId).pipe(
      switchMap((id) => this.store.select(selectRecipeById(id))),
      tap((recipe) => {
        if (recipe) {
          this.originalRecipe$.next(recipe);
          // Sprache beim Laden erkennen
          const lang = this.recipeService.detectLanguage(recipe.preparation);
          this.detectedLanguage.set(lang);
        }
      })
    ),
    this.translatedRecipe$,
  ]).pipe(
    map(([original, translated]) => {
      // Zeige Übersetzung wenn vorhanden, sonst Original
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
      });
  }

  onUpdateRecipe(id: number) {
    this.recipeService.changeRoute.next({
      id,
      route: 'update',
    });
  }

  onPrint() {
    // Speichere die aktuell angezeigte Version (übersetzt oder original) temporär
    const currentRecipe = this.translatedRecipe$.value || this.originalRecipe$.value;

    if (currentRecipe) {
      // Speichere das aktuelle Rezept im sessionStorage für den Print-View
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
   * Übersetzt das Rezept in die gewählte Sprache
   */
  translateTo(language: SupportedLanguage) {
    const original = this.originalRecipe$.value;
    if (!original) {
      console.error('No recipe to translate');
      return;
    }

    this.isTranslating.set(true);
    this.currentLanguage.set(language);

    this.recipeService.translateRecipe(original, language).subscribe({
      next: (translated) => {
        this.translatedRecipe$.next(translated);
        this.isTranslating.set(false);
      },
      error: (error) => {
        console.error('Translation failed:', error);
        this.isTranslating.set(false);
      },
    });
  }

  /**
   * Zeigt das Original-Rezept an
   */
  showOriginal() {
    this.translatedRecipe$.next(null);
    this.currentLanguage.set(null);
  }

  /**
   * Löscht den gesamten Übersetzungs-Cache
   */
  clearCache() {
    this.recipeService.clearTranslationCache();
    this.showOriginal(); // Zeige Original nach Cache-Leerung
    console.log('Translation cache cleared');
  }

  /**
   * Gibt die Sprach-Labels zurück
   */
  getLanguageLabel(lang: SupportedLanguage): string {
    return this.translate.instant(`gimmicks.recipes.${lang === 'de' ? 'german' : lang === 'en' ? 'english' : 'croatian'}`);
  }

  /**
   * Gibt das Label der erkannten Sprache zurück
   */
  getDetectedLanguageLabel(): string {
    const lang = this.detectedLanguage();
    if (!lang || lang === 'unknown') {
      return this.translate.instant('gimmicks.recipes.unknown');
    }
    return this.getLanguageLabel(lang as SupportedLanguage);
  }
}
