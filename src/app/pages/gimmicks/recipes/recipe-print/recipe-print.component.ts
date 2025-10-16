import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable, switchMap } from 'rxjs';
import { Recipe } from '../recipes.model';
import { Store } from '@ngrx/store';
import { toObservable } from '@angular/core/rxjs-interop';
import { selectRecipeById } from '../store/selectors/recipe.selectors';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-recipe-print',
  imports: [CommonModule, TranslateModule],
  templateUrl: './recipe-print.component.html',
  styleUrl: './recipe-print.component.css',
})
export class RecipePrintComponent implements OnInit {
  recipeId = signal<number>(0);
  error = signal<boolean>(true);
  imageLoaded = signal<boolean>(false);
  hasImage = signal<boolean>(false);
  recipeLoaded = signal<boolean>(false);
  private cachedRecipe: Recipe | null = null;

  recipe: Observable<Recipe> = toObservable(this.recipeId).pipe(
    switchMap((id) => {
      // Wenn wir bereits ein gecachtes Rezept haben, benutze das
      if (this.cachedRecipe) {
        return new Observable<Recipe>((observer) => {
          observer.next(this.cachedRecipe!);
          observer.complete();
        });
      }

      // Prüfe ob eine temporäre übersetzte Version existiert
      const tempRecipe = sessionStorage.getItem('recipe_print_temp');

      if (tempRecipe) {
        try {
          const parsed = JSON.parse(tempRecipe);
          this.cachedRecipe = parsed; // Cache das Rezept
          return new Observable<Recipe>((observer) => {
            observer.next(parsed);
            observer.complete();
          });
        } catch (e) {
          console.error('Error parsing temp recipe:', e);
        }
      }
      // Fallback: Hole aus Store
      return this.store.select(selectRecipeById(id));
    })
  );

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private store: Store
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

  ngOnInit() {
    this.recipe.subscribe((recipe) => {
      if (recipe && recipe.id) {
        this.recipeLoaded.set(true);
        this.hasImage.set(!!recipe.imagePath);
        this.checkAndPrint();
      }
    });
  }

  onImageLoad() {
    this.imageLoaded.set(true);
    this.checkAndPrint();
  }

  private checkAndPrint() {
    // Nur drucken wenn: Recipe geladen UND (kein Bild vorhanden ODER Bild geladen)
    if (this.recipeLoaded() && (!this.hasImage() || this.imageLoaded())) {
      setTimeout(() => {
        window.print();
        // Lösche das temp Rezept nach dem Drucken
        sessionStorage.removeItem('recipe_print_temp');
        this.router.navigate([{ outlets: { print: null } }]);
      }, 100);
    }
  }
}
