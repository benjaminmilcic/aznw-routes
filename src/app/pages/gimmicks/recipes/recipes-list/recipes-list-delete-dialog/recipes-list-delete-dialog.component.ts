import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { deleteRecipe } from '../../store/actions/recipe.actions';
import { TranslateModule } from '@ngx-translate/core';

export interface DialogData {
  id: number;
  title: string;
}

@Component({
  selector: 'app-recipes-list-delete-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './recipes-list-delete-dialog.component.html',
  styleUrl: './recipes-list-delete-dialog.component.css',
})
export class RecipesListDeleteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RecipesListDeleteDialogComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  constructor(private store: Store) {}

  onDelete() {
    this.store.dispatch(deleteRecipe({ id: this.data.id }));
    this.dialogRef.close();
  }
}
