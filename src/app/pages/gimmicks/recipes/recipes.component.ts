import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { Store } from '@ngrx/store';
import {
  loadRecipes,
  setSearch,
  setSearchTerm,
} from './store/actions/recipe.actions';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter, Observable } from 'rxjs';
import {
  selectAllRecipesSummary,
  selectError,
  selectFilteredRecipesSummary,
  selectIsLoading,
} from './store/selectors/recipe.selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { RecipesService } from './recipes.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-recipes',
  imports: [
    RouterOutlet,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesComponent implements OnInit {
  selectedMenuPoint = signal<'list' | 'day' | 'search' | 'add'>('list');
  searchTerm = signal<string>('');
  error!: Observable<string>;
  isLoading = toSignal(this.store.select(selectIsLoading), {
    initialValue: false,
  });
  recipes = toSignal(this.store.select(selectFilteredRecipesSummary), {
    initialValue: [],
  });

  allRecipes = toSignal(this.store.select(selectAllRecipesSummary), {
    initialValue: [],
  });

  currentRoute = signal<string>('');

  todaysRecipeId = computed(() => {
    if (!this.recipes().length) return 0;
    const today = new Date();
    const baseDate = new Date(2020, 0, 1); // Fixpunkt (kann beliebig sein)
    const diffDays = Math.floor(
      (today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Index wiederholt sich in Rezept-Länge
    const index = diffDays % this.recipes().length;
    return this.recipes()[index].id;
  });

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private recipeService: RecipesService
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.urlAfterRedirects);
      });
    this.applyMenuPointFromEntryRoute();

    this.error = this.store.select(selectError);
    this.store.dispatch(loadRecipes());
    this.recipeService.changeRoute.subscribe(
      (value: { id: number; route: string }) => {
        switch (value.route) {
          case 'recipe':
            this.selectedMenuPoint.set('list');
            this.router.navigate(['/gimmicks/recipes/recipe/', value.id]);
            break;
          case 'update':
            this.selectedMenuPoint.set('add');
            this.router.navigate(['/gimmicks/recipes/update/', value.id]);
            break;

          default:
            this.onSelectList();
            break;
        }
      }
    );
  }

  /**
   * Markiert beim Betreten des Bereichs den Reiter zur aufgerufenen Adresse.
   *
   * Gelesen wird der Kindpfad aus dem Routen-Snapshot statt aus einem
   * NavigationEnd: der Routenbaum steht schon fest, wenn diese Komponente
   * gebaut wird, waehrend das Ereignis erst spaeter kommt.
   *
   * Und bewusst nur einmal beim Betreten: "Rezept des Tages" fuehrt auf
   * /recipe/:id, die Suche bleibt auf /list - beide Zustaende stehen nicht in
   * der Adresse und wuerden bei jeder weiteren Navigation ueberschrieben.
   * Danach steuern die Klicks den Reiter allein.
   *
   * Nur das Formular hat eine eigene Adresse; alles andere startet auf der
   * Liste - auch ein direkt aufgerufenes einzelnes Rezept, das ja aus der
   * Liste heraus geoeffnet worden waere.
   */
  private applyMenuPointFromEntryRoute(): void {
    const childPath = this.route.snapshot.firstChild?.routeConfig?.path ?? '';

    if (childPath.startsWith('add') || childPath.startsWith('update')) {
      this.selectedMenuPoint.set('add');
    }
  }

  onSelectList() {
    if (this.isLoading()) {
      return;
    }
    this.store.dispatch(setSearch({ search: false }));
    this.selectedMenuPoint.set('list');
    this.router.navigate(['/gimmicks/recipes/list']);
  }

  onSelectDay() {
    if (this.isLoading()) {
      return;
    }
    this.store.dispatch(setSearch({ search: false }));
    this.selectedMenuPoint.set('day');
    this.router.navigate(['/gimmicks/recipes/recipe', this.todaysRecipeId()]);
  }

  onSelectSearch() {
    if (this.isLoading()) {
      return;
    }
    this.store.dispatch(setSearch({ search: true }));
    this.selectedMenuPoint.set('search');
    this.router.navigate(['/gimmicks/recipes/list']);
  }

  onSelectAdd() {
    if (this.isLoading()) {
      return;
    }
    this.store.dispatch(setSearch({ search: false }));
    this.selectedMenuPoint.set('add');
    this.router.navigate(['/gimmicks/recipes/add']);
  }

  onSearch() {
    this.router.navigate(['/gimmicks/recipes/list']);
    this.store.dispatch(setSearchTerm({ searchTerm: this.searchTerm() }));
  }

  onClearSearch() {
    this.searchTerm.set('');
    this.store.dispatch(setSearchTerm({ searchTerm: this.searchTerm() }));
  }
}
