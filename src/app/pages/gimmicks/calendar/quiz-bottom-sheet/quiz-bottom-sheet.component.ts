import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetModule,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { ScratchCardComponent } from './scratch-card/scratch-card.component';
import { Holiday, getHolidays } from 'feiertagejs';
import * as de from '@angular/common/locales/de';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-quiz-bottom-sheet',
    imports: [
        MatBottomSheetModule,
        CommonModule,
        ScratchCardComponent,
        TranslateModule,
    ],
    providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }],
    templateUrl: './quiz-bottom-sheet.component.html',
    styleUrl: './quiz-bottom-sheet.component.css'
})
export class QuizBottomSheetComponent implements OnInit {
  holiday: Holiday;
  constructor(
    private translate: TranslateService,
    private _bottomSheetRef: MatBottomSheetRef<QuizBottomSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: { year: number }
  ) {
    registerLocaleData(de.default);
  }

  ngOnInit() {
    let allHolidays = getHolidays(this.data.year, 'BUND');
    const randomNumber = Math.floor(Math.random() * allHolidays.length);
    this.holiday = allHolidays[randomNumber];
  }

  closeBottomSheet() {
    this._bottomSheetRef.dismiss();
  }

  getScratchWord(): string {
    switch (this.holiday.name) {
      case 'NEUJAHRSTAG':
        return this.translate.instant('gimmicks.calendar.holidays.NEUJAHRSTAG');
      case 'KARFREITAG':
        return this.translate.instant('gimmicks.calendar.holidays.KARFREITAG');
      case 'OSTERMONTAG':
        return this.translate.instant('gimmicks.calendar.holidays.OSTERMONTAG');
      case 'TAG_DER_ARBEIT':
        return this.translate.instant('gimmicks.calendar.holidays.TAG_DER_ARBEIT');
      case 'CHRISTIHIMMELFAHRT':
        return this.translate.instant('gimmicks.calendar.holidays.CHRISTIHIMMELFAHRT');
      case 'PFINGSTMONTAG':
        return this.translate.instant('gimmicks.calendar.holidays.PFINGSTMONTAG');
      case 'DEUTSCHEEINHEIT':
        return this.translate.instant('gimmicks.calendar.holidays.DEUTSCHEEINHEIT');
      case 'ERSTERWEIHNACHTSFEIERTAG':
        return this.translate.instant('gimmicks.calendar.holidays.ERSTERWEIHNACHTSFEIERTAG');
      case 'ZWEITERWEIHNACHTSFEIERTAG':
        return this.translate.instant('gimmicks.calendar.holidays.ZWEITERWEIHNACHTSFEIERTAG');

      default:
        return '';
    }
  }
}
