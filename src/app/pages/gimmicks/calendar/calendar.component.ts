import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isHoliday } from 'feiertagejs';
import { DayModalComponent } from './day-modal/day-modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  MatBottomSheet,
  MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { QuizBottomSheetComponent } from './quiz-bottom-sheet/quiz-bottom-sheet.component';
import { Router } from '@angular/router';
import { AnalogClockComponent } from './analog-clock/analog-clock.component';

@Component({
    selector: 'app-calendar',
    imports: [
        CommonModule,
        FormsModule,
        MatBottomSheetModule,
        TranslateModule,
        AnalogClockComponent,
    ],
    templateUrl: './calendar.component.html',
    styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentYear: number;
  currentMonth: number;
  months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  showBackDrop = false;

  constructor(
    private modalCtrl: ModalController,
    public translateService: TranslateService,
    private _bottomSheet: MatBottomSheet,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
  }

  async openBottomSheet() {
    await this._bottomSheet.open(QuizBottomSheetComponent, {
      disableClose: false,
      data: { year: this.currentYear },
      hasBackdrop: false,
      panelClass: 'custom-bottom-sheet',
    });
  }

  isDateToday(year: number, month: number, day: number): boolean {
    const date = new Date(year, month, day);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  async openDayModal(
    day: number,
    month: string,
    year: number,
    from: string = 'calendar'
  ) {
    this.showBackDrop = true;
    const modal = await this.modalCtrl.create({
      component: DayModalComponent,
      cssClass: 'rounded-modal',
      backdropDismiss: false,
      componentProps: {
        day,
        month,
        year,
        from,
        ActionEvent: new EventEmitter<{
          day: number;
          month: string;
          year: number;
        }>(),
      },
    });
    modal.onDidDismiss().then(async (data) => {
      this.showBackDrop = false;

      if (data.role === 'save') {
      }
    });
    await modal.present().then(() => {
      modal.componentProps['ActionEvent'].subscribe({
        next: (data) => {
          this.print(data);
          this.openDayModal(data.day, data.month, data.year, 'print');
        },
      });
    });
  }

  getEmptyDiv(): number[] {
    let date = new Date(this.currentYear, this.currentMonth);
    if (date.getDay() === 0) {
      return [...Array(6).keys()];
    } else {
      return [...Array(date.getDay() - 1).keys()];
    }
  }

  getSvgOfMonth(): string {
    switch (this.currentMonth) {
      case 0:
        return '/assets/svg/january.svg';
      case 1:
        return '/assets/svg/february.svg';
      case 2:
        return '/assets/svg/march.svg';
      case 3:
        return '/assets/svg/april.svg';
      case 4:
        return '/assets/svg/may.svg';
      case 5:
        return '/assets/svg/june.svg';
      case 6:
        return '/assets/svg/july.svg';
      case 7:
        return '/assets/svg/august.svg';
      case 8:
        return '/assets/svg/september.svg';
      case 9:
        return '/assets/svg/october.svg';
      case 10:
        return '/assets/svg/november.svg';
      case 11:
        return '/assets/svg/december.svg';
      default:
        return '';
    }
  }

  incrementCurrentMonth() {
    this.currentMonth += 1;
    if (this.currentMonth === 12) {
      this.currentMonth = 0;
      this.currentYear++;
    }
  }

  decrementCurrentMonth() {
    this.currentMonth -= 1;
    if (this.currentMonth === -1) {
      this.currentMonth = 11;
      this.currentYear--;
    }
  }

  dateIsHoliday(year: number, month: number, day: number): boolean {
    const date = new Date(year, month, day);
    if (isHoliday(date, 'BUND')) {
      return true;
    } else {
      return false;
    }
  }

  getDaysOfMonth(monthIndex: number): number {
    const daysOfMonth = new Date(this.currentYear, monthIndex + 1, 0).getDate();
    return daysOfMonth;
  }

  getDaysOfMonthArray(monthIndex: number): number[] {
    return Array.from(
      { length: this.getDaysOfMonth(monthIndex) },
      (_, i) => i + 1
    );
  }

  getWorkingDaysOfMonth(): number {
    let daysOfMonth = this.getDaysOfMonth(this.currentMonth);
    let result = this.getDaysOfMonth(this.currentMonth);
    for (let index = 1; index <= daysOfMonth; index++) {
      let day = new Date(this.currentYear, this.currentMonth, index);
      if (isHoliday(day, 'BUND') || day.getDay() === 6 || day.getDay() === 0) {
        result--;
      }
    }
    return result;
  }

  getWorkingDaysOfMonthPercentage(): string {
    const result = Math.round(
      (this.getWorkingDaysOfMonth() * 100) /
        this.getDaysOfMonth(this.currentMonth)
    );

    return result.toString() + '%';
  }

  print(data) {
    this.router.navigate([
      '/',
      {
        outlets: {
          print: [
            'print',
            data.day.toString() + '.' + data.month + '.' + data.year.toString(),
          ],
        },
      },
    ]);
  }

  ngOnDestroy(): void {
    this._bottomSheet.dismiss();
  }
}
