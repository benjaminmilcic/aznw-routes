import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { FlaqQuizCountry, MyMemoryResponse } from './flag-quiz.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-flag-quiz',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './flag-quiz.component.html',
  styleUrl: './flag-quiz.component.scss',
})
export class FlagQuizComponent implements OnInit, OnDestroy {
  data = signal<FlaqQuizCountry[] | null>([]);
  currentCountry = signal<FlaqQuizCountry | null>(null);
  enteredCountryName = signal<string>('');
  currentCountryNameTranslated = signal<string | null>(null);
  wasRight = signal<boolean>(false);
  answered = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isTranslating = signal<boolean>(false);
  score = signal<number>(0);
  totalAnswered = signal<number>(0);
  langChangeSub: Subscription;

  private readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';

  constructor(
    private httpClient: HttpClient,
    private translate: TranslateService
  ) {}

  private readonly EXCLUDED_COUNTRIES = [
    'Jersey',
    'Åland Islands',
    'Guernsey',
    'Isle of Man',
    'Faroe Islands',
    'Svalbard and Jan Mayen',
    'Switzerland',
    'Andorra',
    'France',
  ];

  async ngOnInit() {
    this.isLoading.set(true);
    const data = await lastValueFrom(
      this.httpClient.get<FlaqQuizCountry[]>(
        'https://restcountries.com/v3.1/region/europe?fields=name,flags'
      )
    );
    const filteredData = data.filter(
      (country) => !this.EXCLUDED_COUNTRIES.includes(country.name.common)
    );
    this.data.set(filteredData);

    await this.setRandomCountry();
    this.isLoading.set(false);
    this.langChangeSub = this.translate.onLangChange.subscribe(async () => {
      this.isLoading.set(true);
      this.answered.set(false);
      this.enteredCountryName.set('');
      await this.setRandomCountry();
      this.isLoading.set(false);
      // // Log all countries with their translations
      // console.log('--- Country Translations ---');
      // for (const country of filteredData) {
      //   const original = country.name.common;
      //   const translated = await this.translateCountryName(original);
      //   console.log(`${original} -> ${translated}`);
      // }
      // console.log('--- End ---');
    });
  }

  init() {}

  async setRandomCountry() {
    const countries = this.data();

    if (!countries || countries.length === 0) {
      this.currentCountry.set(null);
      this.currentCountryNameTranslated.set(null);
      return;
    }

    this.isTranslating.set(true);
    const randomIndex = Math.floor(Math.random() * countries.length);
    this.currentCountry.set(countries[randomIndex]);

    // Übersetze den Ländernamen
    const countryName = this.currentCountry()?.name.common;
    if (countryName) {
      const translatedName = await this.translateCountryName(countryName);
      this.currentCountryNameTranslated.set(translatedName);
    }
    this.isTranslating.set(false);
  }

  private async translateCountryName(name: string): Promise<string> {
    const targetLang = this.translate.currentLang || 'de';
    const sourceLang = 'en';

    // Keine Übersetzung nötig wenn Zielsprache Englisch ist
    if (targetLang === 'en') {
      return name;
    }

    const langPair = `${sourceLang}|${targetLang}`;
    const email = environment.recipes?.translationEmail || '';
    const url = `${this.MYMEMORY_API}?q=${encodeURIComponent(
      name
    )}&langpair=${langPair}&de=${encodeURIComponent(email)}`;

    try {
      const response = await lastValueFrom(
        this.httpClient.get<MyMemoryResponse>(url)
      );

      if (response.responseStatus === 200) {
        return response.responseData.translatedText;
      }
      return name;
    } catch (error) {
      console.error('Translation error:', error);
      return name;
    }
  }

  onCheck() {
    const isCorrect =
      this.currentCountryNameTranslated()?.trim().toLowerCase() ===
      this.enteredCountryName().trim().toLowerCase();
    this.wasRight.set(isCorrect);
    this.answered.set(true);
    this.totalAnswered.update((t) => t + 1);
    if (isCorrect) {
      this.score.update((s) => s + 1);
    }
  }

  onNext() {
    this.answered.set(false);
    this.enteredCountryName.set('');
    this.setRandomCountry();
  }

  onRestart() {
    this.score.set(0);
    this.totalAnswered.set(0);
    this.answered.set(false);
    this.enteredCountryName.set('');
    this.setRandomCountry();
  }

  getScorePercentage(): number {
    const total = this.totalAnswered();
    if (total === 0) return 0;
    return Math.round((this.score() / total) * 100);
  }

  ngOnDestroy(): void {
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
  }
}
