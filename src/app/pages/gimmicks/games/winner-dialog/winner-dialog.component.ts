import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import {
  NgFireworksModule,
  type FireworksDirective,
  type FireworksOptions,
} from '@fireworks-js/angular';
import { TranslateModule } from '@ngx-translate/core';

interface DialogData {
  showWin: boolean;
  winner: string;
}

@Component({
    selector: 'app-tiktaktoe-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        CommonModule,
        NgFireworksModule,
        TranslateModule,
        MatButtonModule
    ],
    templateUrl: './winner-dialog.component.html',
    styleUrl: './winner-dialog.component.css'
})
export class WinnerDialogComponent implements OnInit {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  enabled = true;
  options: FireworksOptions = {
    opacity: 0.5,
    lineWidth: {
      explosion: { max: 3.9, min: 2.8 },
      trace: { max: 3.9, min: 2.8 },
    },
  };
  @ViewChild('fireworks') fireworks?: FireworksDirective;

  ngOnInit(): void {
    setTimeout(() => {
      this.enabled = false;
    }, 10000);
  }
}
