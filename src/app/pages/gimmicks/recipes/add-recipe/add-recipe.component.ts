import {
  ChangeDetectionStrategy,
  Component,
  signal,
  QueryList,
  ViewChildren,
  ElementRef,
  Signal,
  effect,
  WritableSignal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AddRecipeImageDialogComponent } from './add-recipe-image-dialog/add-recipe-image-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { addRecipe, updateRecipe } from '../store/actions/recipe.actions';
import {
  selectError,
  selectIsLoading,
  selectRecipeById,
  selectSavedRecipeId,
} from '../store/selectors/recipe.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, combineLatest, map } from 'rxjs';
import { RecipesService } from '../recipes.service';
import { ActivatedRoute } from '@angular/router';
import { Recipe } from '../recipes.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-add-recipe',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './add-recipe.component.html',
  styleUrl: './add-recipe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRecipeComponent {
  @ViewChildren('ingredientInput', { read: ElementRef })
  ingredientInputs!: QueryList<ElementRef>;

  recipeImage = signal<string>('');
  recipeForm: FormGroup;
  isLoading = toSignal(this.store.select(selectIsLoading), {
    initialValue: false,
  });
  savedRecipeId = toSignal(this.store.select(selectSavedRecipeId), {
    initialValue: 0,
  });
  error = toSignal(this.store.select(selectError), {
    initialValue: '',
  });
  isLoading$ = toObservable(this.isLoading);
  error$ = toObservable(this.error);
  savedReady = signal(false);
  recipeId = signal<number | null>(null);
  wrongId = signal<boolean>(false);
  recipeToUpdate: WritableSignal<Recipe | null> = signal(null);

  constructor(
    private dialog: MatDialog,
    private fb: FormBuilder,
    private store: Store,
    private recipeService: RecipesService,
    private route: ActivatedRoute
  ) {
    this.recipeForm = this.fb.group({
      title: ['', Validators.required],
      imagePath: [''],
      ingredients: this.fb.array([]),
      preparation: ['', Validators.required],
    });
    if (this.route.snapshot.routeConfig?.path.includes('update')) {
      this.route.paramMap.subscribe((params) => {
        const idParam = params.get('id');

        if (!idParam) {
          // No param
          this.recipeId.set(null);
          this.wrongId.set(true);
          return;
        }

        const id = Number(idParam);
        if (isNaN(id) || id <= 0) {
          // Invalid ID
          this.recipeId.set(null);
          this.wrongId.set(true);
          return;
        }

        // All good: set the signal
        this.recipeId.set(id);
        this.wrongId.set(false);

        // Load the recipe from the store and put it into the WritableSignal
        const recipeSignal = toSignal(this.store.select(selectRecipeById(id)), {
          initialValue: null,
        });

        // Effect: put the recipe into the WritableSignal and fill the form
        effect(() => {
          const recipe = recipeSignal();
          if (recipe) {
            this.recipeToUpdate.set(recipe);

            this.recipeForm.patchValue({
              title: recipe.title,
              imagePath: recipe.imagePath,
              preparation: recipe.preparation,
            });

            this.recipeImage.set(recipe.imagePath);

            // Fill in the ingredients
            this.ingredients.clear();
            recipe.ingredients.forEach((ingredient) => {
              this.ingredients.push(
                this.fb.control(ingredient, Validators.required)
              );
            });
          }
        });
      });
    }
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  openImageUploadDialog(): void {
    const dialogRef = this.dialog.open(AddRecipeImageDialogComponent, {
      disableClose: false,
      maxWidth: '100vw',
      panelClass: 'full-width-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.recipeImage.set(result);
        this.recipeForm.patchValue({ imagePath: result });
      }
    });
  }

  onDeleteRecipeImage() {
    this.recipeImage.set('');
    this.recipeForm.patchValue({ imagePath: '' });
  }

  onAddIngredient() {
    this.ingredients.push(this.fb.control('', Validators.required));
  }

  onDeleteIngredient(index: number) {
    this.ingredients.removeAt(index);
  }

  onIngredientEnter(currentIndex: number, isLast: boolean, event: Event) {
    event.preventDefault();

    if (isLast) {
      // If it is the last field: add a new field
      this.onAddIngredient();
      // Wait until the view is updated, then set the focus
      setTimeout(() => {
        const inputs = this.ingredientInputs.toArray();
        if (inputs[currentIndex + 1]) {
          inputs[currentIndex + 1].nativeElement.focus();
        }
      }, 0);
    } else {
      // Jump to the next field
      const inputs = this.ingredientInputs.toArray();
      if (inputs[currentIndex + 1]) {
        inputs[currentIndex + 1].nativeElement.focus();
      }
    }
  }

  async onSaveRecipe() {
    if (!this.recipeForm.valid) {
      this.recipeForm.markAllAsTouched();
      return;
    }

    const recipeData = this.recipeForm.value;
    this.savedReady.set(false);

    if (this.recipeToUpdate()) {
      // Update mode: update the recipe
      const recipeId = this.recipeId();
      if (recipeId) {
        this.store.dispatch(updateRecipe({ id: recipeId, recipe: recipeData }));
      }
    } else {
      // Add mode: add a new recipe
      this.store.dispatch(addRecipe({ recipe: recipeData }));
    }

    // Wait until loading is false
    await firstValueFrom(this.isLoading$.pipe(filter((v) => !v)));

    setTimeout(() => {
      if (!this.error()) {
        this.savedReady.set(true);
      }
    }, 150);
  }

  onAddRecipe() {
    this.recipeToUpdate.set(null);
    this.savedReady.set(false);
    this.recipeImage.set('');
    this.recipeForm.reset({
      title: '',
      imagePath: '',
      preparation: '',
    });
    this.ingredients.clear();
  }

  onShowRecipe() {
    this.recipeService.changeRoute.next({
      id: this.savedRecipeId(),
      route: 'recipe',
    });
  }

  onUpdateRecipe() {
    if (this.recipeToUpdate()) {
      this.savedReady.set(false);
    } else {
      this.recipeService.changeRoute.next({
        id: this.savedRecipeId(),
        route: 'update',
      });
    }
  }

  onRecipeList() {
    this.recipeService.changeRoute.next({
      id: 0,
      route: 'list',
    });
  }
}
