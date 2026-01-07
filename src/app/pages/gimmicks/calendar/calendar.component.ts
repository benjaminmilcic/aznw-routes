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
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    FormsModule,
    MatBottomSheetModule,
    TranslateModule,
    AnalogClockComponent,
    MatIconModule,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
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
  onThisDayEvents: any[] = [];
  loadingEvents = false;
  private langChangeSubscription: Subscription;
  today = new Date();

  constructor(
    private modalCtrl: ModalController,
    public translateService: TranslateService,
    private _bottomSheet: MatBottomSheet,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.loadOnThisDayEvents();

    // Bei Sprachwechsel die Events neu laden
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(
      () => {
        this.loadOnThisDayEvents();
      }
    );
  }

  loadOnThisDayEvents(): void {
    this.loadingEvents = true;
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const currentLang = this.translateService.currentLang || 'en';

    // Für Kroatisch: Lade Events auf Englisch und übersetze sie
    const apiLang = currentLang === 'hr' ? 'en' : currentLang;
    const apiUrl = `https://api.wikimedia.org/feed/v1/wikipedia/${apiLang}/onthisday/events/${month}/${day}`;

    this.http.get(apiUrl).subscribe({
      next: (response: any) => {
        const events = response.events?.slice(0, 5) || [];

        // Wenn Kroatisch: Übersetze die Events
        if (currentLang === 'hr' && events.length > 0) {
          this.translateEvents(events).subscribe({
            next: (translatedEvents) => {
              this.onThisDayEvents = translatedEvents;
              this.loadingEvents = false;
            },
            error: (error) => {
              console.error('Error translating events:', error);
              // Bei Fehler: Zeige englische Events
              this.onThisDayEvents = events;
              this.loadingEvents = false;
            },
          });
        } else {
          this.onThisDayEvents = events;
          this.loadingEvents = false;
        }
      },
      error: (error) => {
        console.error('Error loading On This Day events:', error);
        this.loadingEvents = false;
      },
    });
  }

  private translateEvents(events: any[]) {
    const translations$ = events.map((event) =>
      this.translateText(event.text, 'en', 'hr').pipe(
        map((translatedText) => ({
          ...event,
          text: translatedText,
        }))
      )
    );

    return forkJoin(translations$);
  }

  private translateText(text: string, sourceLang: string, targetLang: string) {
    if (!text || text.trim().length === 0) {
      return of(text);
    }

    const MAX_CHARS = 450; // Sicherheitspuffer unter dem 500-Zeichen-Limit

    // Wenn Text kurz genug ist, direkt übersetzen
    if (text.length <= MAX_CHARS) {
      return this.translateTextChunk(text, sourceLang, targetLang);
    }

    // Text in Chunks aufteilen
    const chunks = this.splitTextIntoChunks(text, MAX_CHARS);

    // Alle Chunks parallel übersetzen
    const translations$ = chunks.map((chunk) =>
      this.translateTextChunk(chunk.text, sourceLang, targetLang)
    );

    // Alle Übersetzungen zusammenfügen mit Original-Separatoren
    return forkJoin(translations$).pipe(
      map((translatedChunks) => {
        let result = '';
        translatedChunks.forEach((translated, idx) => {
          result += translated;
          if (idx < chunks.length - 1) {
            // Verwende den Original-Separator
            result += chunks[idx].separator || ' ';
          }
        });
        return result;
      })
    );
  }

  private translateTextChunk(
    text: string,
    sourceLang: string,
    targetLang: string
  ) {
    const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
    const langPair = `${sourceLang}|${targetLang}`;
    const email = environment.recipes.translationEmail || '';
    const url = `${MYMEMORY_API}?q=${encodeURIComponent(
      text
    )}&langpair=${langPair}&de=${encodeURIComponent(email)}`;

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response.responseStatus === 200) {
          return response.responseData.translatedText;
        } else {
          console.warn('Translation failed, using original text');
          return text;
        }
      }),
      catchError((error) => {
        console.error('Translation API error:', error);
        return of(text); // Bei Fehler: Original-Text zurückgeben
      })
    );
  }

  private splitTextIntoChunks(
    text: string,
    maxLength: number
  ): Array<{ text: string; separator: string }> {
    const chunks: Array<{ text: string; separator: string }> = [];
    let currentChunk = '';
    let chunkSeparator = '';

    // Splitte Text an allen Whitespace-Grenzen und behalte die Separatoren
    const parts = text.split(/(\s+)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Überspringe leere Parts
      if (!part) continue;

      // Ist es ein Separator (Leerzeichen/Zeilenumbrüche)?
      if (/^\s+$/.test(part)) {
        // Füge Separator zum aktuellen Chunk hinzu
        chunkSeparator += part;
        continue;
      }

      // Es ist ein Textteil (Wort oder Phrase)
      const word = part;

      // Prüfe ob das Wort in den aktuellen Chunk passt
      const wouldBeLength =
        currentChunk.length + chunkSeparator.length + word.length;

      if (wouldBeLength <= maxLength || !currentChunk) {
        // Füge zum aktuellen Chunk hinzu
        currentChunk += chunkSeparator + word;
        chunkSeparator = '';
      } else {
        // Chunk ist voll - speichere ihn mit dem gesammelten Separator
        chunks.push({
          text: currentChunk,
          separator: chunkSeparator,
        });

        // Starte neuen Chunk mit dem aktuellen Wort
        currentChunk = word;
        chunkSeparator = '';
      }
    }

    // Letzten Chunk hinzufügen
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        separator: chunkSeparator,
      });
    }

    return chunks;
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
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }
}
