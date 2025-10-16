import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { RecipeSummary } from '../recipes.model';
import { Store } from '@ngrx/store';
import { selectFilteredRecipesSummary } from '../store/selectors/recipe.selectors';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RecipesListDeleteDialogComponent } from './recipes-list-delete-dialog/recipes-list-delete-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-recipes-list',
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './recipes-list.component.html',
  styleUrl: './recipes-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesListComponent implements OnInit {
  recipes!: Observable<RecipeSummary[]>;

  constructor(
    private store: Store,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.recipes = this.store.select(selectFilteredRecipesSummary);
  }

  goToRecipe(recipeId: number) {
    this.router.navigate(['/gimmicks/recipes/recipe', recipeId]);
  }

  onDeleteRecipe(id: number, title: string, event: Event) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(RecipesListDeleteDialogComponent, {
      data: { title, id },
      width: '300px',
    });
  }
}
