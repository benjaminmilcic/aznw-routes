import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  debounceTime,
  switchMap,
  tap,
  finalize,
  takeUntil,
  startWith,
  map,
} from 'rxjs/operators';
import { lastValueFrom, of, Subject } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule, MatSelectTrigger } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import countries from 'i18n-iso-countries';

import de from 'i18n-iso-countries/langs/de.json';
import en from 'i18n-iso-countries/langs/en.json';
import hr from 'i18n-iso-countries/langs/hr.json';
import { WeatherService } from './weather.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WEATHER_CODE_MAP,
  weatherCodeToMeteocons,
} from './weather.model';
import { TemperatureChartComponent } from './temperature-chart/temperature-chart.component';
import { RainChartComponent } from './rain-chart/rain-chart.component';
import { environment } from '../../../../environments/environment';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-weather',
    imports: [
        CommonModule,
        MatFormFieldModule,
        FormsModule,
        MatInputModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatProgressSpinnerModule,
        MatOptionModule,
        MatCheckboxModule,
        MatSelectModule,
        NgxMatSelectSearchModule,
        MatSelectTrigger,
        MatIconModule,
        MatButtonModule,
        TemperatureChartComponent,
        RainChartComponent,
        MatIconModule,
        IonLabel,
        IonSegment,
        IonSegmentButton,
        TranslateModule,
    ],
    templateUrl: './weather.component.html',
    styleUrl: './weather.component.scss'
})
export class WeatherComponent implements OnInit, OnDestroy {
  latitude: number | null = null;
  longitude: number | null = null;
  address: string | null = null;
  error: string | null = '';
  cityName: string = '';
  cityLatitude: number | null = null;
  cityLongitude: number | null = null;
  cityCtrl = new FormControl('');
  filteredCities: any[] = [];
  isLoading = false;
  allCountries: { code: string; name: string }[] = [];
  selectedCountry = 'any'; // default: weltweit
  countryFilterCtrl = new FormControl('');
  filteredCountries = [...this.allCountries];
  private _onDestroy = new Subject<void>();
  currentWeather: CurrentWeather;
  dailyForecast: DailyForecast;
  hourlyForecast: HourlyForecast[];

  displayedIcon = '';
  displayedTemp: number;
  displayedPrecipitation_probability: number;
  displayedHumidity: number;
  displayedWind: number;
  displayedTime: string;
  displayedWeather: string;
  showDisplay = false;

  dailyForcastIndex = 0;

  selectedChart: 'temp' | 'rain' | 'wind' = 'temp';

  showChart = true;

  selectedWay: 'location' | 'search' = 'location';

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    this.showChart = false;
    setTimeout(() => {
      this.showChart = true;
    }, 50);
  }

  constructor(
    private http: HttpClient,
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService
  ) {}

  async ngOnInit() {
    countries.registerLocale(de);
    countries.registerLocale(en);
    countries.registerLocale(hr);
    this.cityCtrl.valueChanges
      .pipe(
        debounceTime(300), // Warte bis Tipp-Pause
        tap(() => (this.isLoading = true)),
        switchMap((value) =>
          this.fetchCities(value, this.translateService.currentLang).pipe(
            finalize(() => (this.isLoading = false))
          )
        )
      )
      .subscribe((cities) => {
        this.filteredCities = cities;
      });

    await this.init();
    this.translateService.onLangChange.subscribe(async () => {
      await this.init();
      if (this.selectedWay === 'location') {
        if (this.currentWeather) {
          this.getLocation();
        }
      } else {
        this.searchCity();
      }
    });
  }

  async init() {
    const countryCodes = countries.getAlpha2Codes();
    let worldWide = await lastValueFrom(
      this.translateService.get('gimmicks.weather.worldWide')
    );

    this.allCountries = [
      { code: 'any', name: '🌍 ' + worldWide },
      ...Object.keys(countryCodes).map((code) => ({
        code: code.toLowerCase(),
        name: countries.getName(code, this.translateService.currentLang),
      })),
    ];

    this.countryFilterCtrl.valueChanges
      .pipe(
        startWith(''),
        takeUntil(this._onDestroy),
        map((value) => value.toLowerCase())
      )
      .subscribe((search) => {
        this.filteredCountries = this.allCountries.filter((c) =>
          c.name.toLowerCase().includes(search)
        );
      });
  }

  getLocation() {
    this.currentWeather = null;
    this.dailyForecast = null;
    this.hourlyForecast = null;
    this.showDisplay = false;
    this.error = '';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.cityLatitude = position.coords.latitude;
          this.cityLongitude = position.coords.longitude;
          this.getAddress(
            this.cityLatitude,
            this.cityLongitude,
            this.translateService.currentLang
          );
          this.getWeather();
        },
        (err) => {
          this.translateService
            .get('gimmicks.weather.errorOnPosition')
            .subscribe((value) => {
              this.error += `<br>${value}: ${err.message}`;
            });
        }
      );
    } else {
      this.translateService
        .get('gimmicks.weather.geoLocationNotSupported')
        .subscribe((value) => {
          this.error += `<br>${value}`;
        });
    }
  }
  getAddress(lat: number, lon: number, language = 'de') {
    const url = `${environment.geoLocation.reverseGeoCodeApi}?lat=${lat}&lon=${lon}&lang=${language}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        const address = data.address;
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.hamlet ||
          address.locality ||
          'Unbekannte Stadt';
        const country = address.country || 'Unbekanntes Land';

        this.address = `${city}, ${country}`;
      },
      error: (err) => {
        this.address = null;
        this.translateService
          .get('gimmicks.weather.errorOnAddress')
          .subscribe((value) => {
            this.error += `<br>${value}`;
          });
      },
    });
  }

  getWeather() {
    this.weatherService
      .getWeatherWithForecast(this.cityLatitude, this.cityLongitude)
      .subscribe((data) => {
        this.currentWeather = data.current;
        this.currentWeather.precipitation_probability =
          this.getCurrentPrecipitation_probability(data.hourly);
        const currentDate = new Date(data.current.time);
        let local: string;
        switch (this.translateService.currentLang) {
          case 'en':
            local = 'en-US';
            break;
          case 'hr':
            local = 'hr-HR';
            break;

          default:
            local = 'de-DE';
            break;
        }
        this.currentWeather.weekday = currentDate.toLocaleDateString(local, {
          weekday: 'long',
        });
        this.currentWeather.hour = currentDate.getHours();
        this.dailyForecast = data.daily;
        this.dailyForecast.active = [];
        this.dailyForecast.weekday = [];
        this.dailyForecast.weekdayLong = [];
        this.dailyForecast.icon = [];
        this.dailyForecast.time.forEach((day, dayIndex) => {
          this.dailyForecast.active.push(dayIndex === 0 ? true : false);
          const wekkdayDate = new Date(day);
          this.dailyForecast.weekday.push(
            wekkdayDate.toLocaleDateString(local, {
              weekday: 'short',
            })
          );
          this.dailyForecast.weekdayLong.push(
            wekkdayDate.toLocaleDateString(local, {
              weekday: 'long',
            })
          );
          this.dailyForecast.icon.push(
            this.getIconPath(this.dailyForecast.weathercode[dayIndex], true)
          );
        });
        this.hourlyForecast = this.groupForecastByDayAndHour(data.hourly);
        let hourlyForecastLength = this.hourlyForecast.length;
        let dailyForecastLength = this.dailyForecast.time.length;
        if (dailyForecastLength < hourlyForecastLength) {
          for (
            let index = 0;
            index < hourlyForecastLength - dailyForecastLength;
            index++
          ) {
            this.hourlyForecast.shift();
          }
        }
        this.changeDataOfFirstDay();
        console.log(this.hourlyForecast);

        this.displayCurrentWeather();
      });
  }

  changeDataOfFirstDay() {
    let currentHour = new Date().getHours();
    let firstDayHours = this.hourlyForecast[0].hours;
    let secondDayHours = this.hourlyForecast[1].hours;
    for (let index = 0; index < currentHour; index++) {
      firstDayHours.splice(0, 1);
    }
    for (let index = 0; index < currentHour; index++) {
      firstDayHours.push(secondDayHours[index]);
    }
  }

  displayCurrentWeather() {
    this.displayedIcon = this.getIconPath(
      this.currentWeather.weathercode,
      this.currentWeather.is_day === 1
    );
    this.displayedTemp = this.currentWeather.temperature_2m;
    this.displayedPrecipitation_probability =
      this.currentWeather.precipitation_probability;
    this.displayedHumidity = this.currentWeather.relative_humidity_2m;
    this.displayedWind = this.currentWeather.wind_speed_10m;
    this.displayedTime =
      this.currentWeather.weekday + ', ' + this.currentWeather.hour + ':00';
    this.displayedWeather =
      WEATHER_CODE_MAP[this.currentWeather.weathercode][
        this.translateService.currentLang
      ];

    this.showDisplay = true;
  }

  displayDailyWeather(index: number) {
    let currentIndex = this.dailyForecast.active.findIndex(
      (value) => value === true
    );
    if (index === currentIndex) {
      return;
    }
    this.dailyForcastIndex = index;
    this.dailyForecast.active[currentIndex] = false;
    this.dailyForecast.active[index] = true;
    this.displayedIcon = this.getIconPath(
      this.dailyForecast.weathercode[index],
      true
    );
    this.displayedTemp = this.dailyForecast.temperature_2m_max[index];
    this.displayedPrecipitation_probability =
      this.dailyForecast.precipitation_probability_mean[index];
    let humidityArray = this.hourlyForecast[index].hours.map(
      (value) => value.humidity
    );
    this.displayedHumidity =
      humidityArray.reduce((sum, value) => sum + value, 0) /
      humidityArray.length;
    this.displayedWind = this.dailyForecast.wind_speed_10m_max[index];
    this.displayedTime = this.dailyForecast.weekdayLong[index];
    this.displayedWeather =
      WEATHER_CODE_MAP[this.dailyForecast.weathercode[index]][
        this.translateService.currentLang
      ];

    this.showDisplay = true;
  }

  displayHourlyWeather(event: number[]) {
    let dayIndex = event[0];
    let hourIndex = event[1];
    this.displayedIcon = this.getIconPath(
      this.hourlyForecast[dayIndex].hours[hourIndex].weathercode,
      true
    );
    this.displayedTemp =
      this.hourlyForecast[dayIndex].hours[hourIndex].temperature;
    this.displayedPrecipitation_probability =
      this.hourlyForecast[dayIndex].hours[hourIndex].precipitation_probability;

    this.displayedHumidity =
      this.hourlyForecast[dayIndex].hours[hourIndex].humidity;

    this.displayedWind = this.hourlyForecast[dayIndex].hours[hourIndex].wind;
    let time = this.hourlyForecast[dayIndex].hours[hourIndex].hour.toString();
    if (time.length === 1) {
      time = '0' + time;
    }
    time += ':00';
    this.displayedTime = this.dailyForecast.weekdayLong[dayIndex] + ', ' + time;
    this.displayedWeather =
      WEATHER_CODE_MAP[
        this.hourlyForecast[dayIndex].hours[hourIndex].weathercode
      ][this.translateService.currentLang];
    this.showDisplay = true;
    this.cdr.detectChanges();
  }

  getIconPath(code: number, isDay: boolean): string {
    const icon = weatherCodeToMeteocons[code];
    const filename = icon
      ? isDay
        ? icon.day
        : icon.night
      : 'not-available.svg';
    return `assets/meteocons/${filename}`;
  }

  searchCity() {
    this.currentWeather = null;
    this.dailyForecast = null;
    this.hourlyForecast = null;
    this.showDisplay = false;
    this.error = '';
    const input: any = this.cityCtrl.value; // Typ explizit als any
    const cityName = typeof input === 'string' ? input : input?.display_name;

    if (!cityName || !cityName.trim()) return;

    const url = `${
      environment.geoLocation.geoCodeApi
    }?city=${encodeURIComponent(cityName)}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.address = cityName;
        this.cityLatitude = parseFloat(data.lat);
        this.cityLongitude = parseFloat(data.lon);
        this.getWeather();
      },
      error: () => {
        this.cityLatitude = null;
        this.cityLongitude = null;
        this.translateService
          .get('gimmicks.weather.errorOnSearch')
          .subscribe((value) => {
            this.error += `<br>${value}`;
          });
      },
    });
  }

  fetchCities(query: string, lang: string) {
    if (!query || query.length < 2) {
      return of([]);
    }

    let url = `${environment.geoLocation.citiesApi}?q=${encodeURIComponent(
      query
    )}&country=${this.selectedCountry}&lang=${lang}`;

    return this.http.get<any[]>(url);
  }

  displayCity(city: any) {
    return city ? city.display_name : '';
  }

  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  getMatTriggerSelect() {
    return this.filteredCountries.find((c) => c.code === this.selectedCountry)
      ?.name;
  }

  toLocalIsoString(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  getCurrentPrecipitation_probability(hourly: any): any {
    const now = new Date();
    const currentHour = this.toLocalIsoString(now).slice(0, 13); // z. B. '2025-06-14T16'

    const index = hourly.time.findIndex((t: string) =>
      t.startsWith(currentHour)
    );
    if (index !== -1) {
      return hourly.precipitation_probability[index];
    } else {
      return 'undefined';
    }
  }

  groupForecastByDayAndHour(hourly: any): any[] {
    const result: any = {};

    for (let i = 0; i < hourly.time.length; i++) {
      const dateTime = new Date(hourly.time[i]);
      const day = dateTime.toISOString().split('T')[0];
      const hour = dateTime.getHours();

      if (!result[day]) {
        result[day] = [];
      }

      result[day].push({
        hour,
        temperature: hourly.temperature_2m[i],
        weathercode: hourly.weathercode[i],
        wind: hourly.wind_speed_10m[i],
        precipitation_probability: hourly.precipitation_probability[i],
        humidity: hourly.relative_humidity_2m[i],
        wind_direction: hourly.wind_direction_10m[i],
      });
    }

    return Object.entries(result).map(([day, hours]: any) => ({
      day,
      hours: hours.sort((a: any, b: any) => a.hour - b.hour), // sortiere nach Uhrzeit
    }));
  }
}
