import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { TranslateModule } from '@ngx-translate/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

interface DialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-chat-confirm-dialog',
  templateUrl: './chat-confirm-dialog.component.html',
  styleUrl: './chat-confirm-dialog.component.scss',
  imports: [MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, TranslateModule],
})
export class ChatConfirmDialog {
  readonly dialogRef = inject(MatDialogRef<ChatConfirmDialog>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  onYesClick(): void {
    this.dialogRef.close('success');
  }
}
