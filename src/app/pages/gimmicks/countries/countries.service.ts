import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CountriesCountry, CountriesWeatherData, CountriesWikipediaSummary, CountriesWorldBankData } from './countries.model';

@Injectable({
  providedIn: 'root',
})
export class CountriesService {
  private readonly http = inject(HttpClient);
  // Static snapshot of the former restcountries.com v3.1 data set.
  // The live v3.1 API was shut down (now redirects to a deprecation notice);
  // v5 requires an API key and is rate limited. Country data is effectively
  // static, so we ship it as a local asset instead.
  private readonly dataUrl = 'assets/data/countries-v3.1.json';
  readonly loading = signal(true);
  private readonly countriesCache$ = new ReplaySubject<CountriesCountry[]>(1);
  private cacheLoaded = false;

  constructor() {
    this.loadAllCountries();
  }

  private loadAllCountries(): void {
    this.http
      .get<CountriesCountry[]>(this.dataUrl)
      .pipe(
        catchError((err) => {
          console.error('Failed to load country data:', err);
          return of([] as CountriesCountry[]);
        }),
      )
      .subscribe((countries) => {
        console.log('Country data loaded:', countries.length, 'countries');
        this.countriesCache$.next(countries);
        this.cacheLoaded = true;
        this.loading.set(false);
      });
  }

  getAllCountries(): Observable<CountriesCountry[]> {
    return this.getAllCountriesCached();
  }

  private getAllCountriesCached(): Observable<CountriesCountry[]> {
    return this.countriesCache$.asObservable();
  }

  getCountryByName(name: string): Observable<CountriesCountry | null> {
    const lowerName = name.toLowerCase();
    return this.getAllCountriesCached().pipe(
      map((countries) => {
        // Try exact match first
        let found = countries.find(
          (c) =>
            c.name.common.toLowerCase() === lowerName ||
            c.name.official.toLowerCase() === lowerName,
        );
        // Try partial match if no exact match
        if (!found) {
          found = countries.find(
            (c) =>
              c.name.common.toLowerCase().includes(lowerName) ||
              lowerName.includes(c.name.common.toLowerCase()),
          );
        }
        return found || null;
      }),
    );
  }

  getCountryByCode(code: string): Observable<CountriesCountry | null> {
    const upperCode = code.toUpperCase();
    return this.getAllCountriesCached().pipe(
      map(
        (countries) =>
          countries.find((c) => c.cca2 === upperCode || c.cca3 === upperCode) ||
          null,
      ),
    );
  }

  getCountriesByCodes(codes: string[]): Observable<CountriesCountry[]> {
    if (codes.length === 0) return of([]);
    const upperCodes = codes.map((c) => c.toUpperCase());
    return this.getAllCountriesCached().pipe(
      map((countries) =>
        countries.filter(
          (c) => upperCodes.includes(c.cca2) || upperCodes.includes(c.cca3),
        ),
      ),
    );
  }

  getWikipediaSummary(
    countryName: string,
    lang: string = 'de',
  ): Observable<CountriesWikipediaSummary | null> {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`;
    return this.http
      .get<CountriesWikipediaSummary>(url)
      .pipe(catchError(() => of(null)));
  }

  getWeather(
    lat: number,
    lon: number,
  ): Observable<CountriesWeatherData | null> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response?.current) return null;
        const current = response.current;
        return {
          temperature: current.temperature_2m,
          weatherCode: current.weather_code,
          weatherDescription: this.getWeatherDescription(current.weather_code),
          windSpeed: current.wind_speed_10m,
          humidity: current.relative_humidity_2m,
          isDay: current.is_day === 1,
        };
      }),
      catchError(() => of(null)),
    );
  }

  private getWeatherDescription(code: number): string {
    const descriptions: { [key: number]: string } = {
      0: 'Klar',
      1: 'Überwiegend klar',
      2: 'Teilweise bewölkt',
      3: 'Bewölkt',
      45: 'Nebel',
      48: 'Gefrierender Nebel',
      51: 'Leichter Nieselregen',
      53: 'Nieselregen',
      55: 'Starker Nieselregen',
      61: 'Leichter Regen',
      63: 'Regen',
      65: 'Starker Regen',
      66: 'Gefrierender Regen',
      67: 'Starker gefrierender Regen',
      71: 'Leichter Schneefall',
      73: 'Schneefall',
      75: 'Starker Schneefall',
      77: 'Schneegriesel',
      80: 'Leichte Regenschauer',
      81: 'Regenschauer',
      82: 'Starke Regenschauer',
      85: 'Leichte Schneeschauer',
      86: 'Starke Schneeschauer',
      95: 'Gewitter',
      96: 'Gewitter mit Hagel',
      99: 'Gewitter mit starkem Hagel',
    };
    return descriptions[code] || 'Unbekannt';
  }

  getWorldBankData(countryCode: string): Observable<CountriesWorldBankData> {
    const indicators = [
      'NY.GDP.PCAP.CD', // GDP per capita
      'NY.GDP.MKTP.CD', // GDP total
      'SP.DYN.LE00.IN', // Life expectancy
      'SP.POP.GROW', // Population growth
      'SL.UEM.TOTL.ZS', // Unemployment rate
      'EN.ATM.CO2E.PC', // CO2 per capita
      'SE.ADT.LITR.ZS', // Literacy rate
      'SP.DYN.IMRT.IN', // Infant mortality
      'EG.ELC.ACCS.ZS', // Electricity access
      'IT.NET.USER.ZS', // Internet users
      'IT.CEL.SETS.P2', // Mobile subscriptions per 100
      'SH.XPD.CHEX.GD.ZS', // Health expenditure % of GDP
    ];

    const requests = indicators.map((indicator) =>
      this.http
        .get<
          any[]
        >(`https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=1`)
        .pipe(
          map((response) => {
            const data = response?.[1]?.[0];
            return { indicator, value: data?.value, year: data?.date };
          }),
          catchError(() => of({ indicator, value: null, year: null })),
        ),
    );

    return forkJoin(requests).pipe(
      map((results) => {
        const data: CountriesWorldBankData = {};
        let latestYear: number | undefined;

        results.forEach((r) => {
          if (r.value !== null) {
            if (r.year && (!latestYear || parseInt(r.year) > latestYear)) {
              latestYear = parseInt(r.year);
            }
            switch (r.indicator) {
              case 'NY.GDP.PCAP.CD':
                data.gdpPerCapita = r.value;
                break;
              case 'NY.GDP.MKTP.CD':
                data.gdpTotal = r.value;
                break;
              case 'SP.DYN.LE00.IN':
                data.lifeExpectancy = r.value;
                break;
              case 'SP.POP.GROW':
                data.populationGrowth = r.value;
                break;
              case 'SL.UEM.TOTL.ZS':
                data.unemploymentRate = r.value;
                break;
              case 'EN.ATM.CO2E.PC':
                data.co2PerCapita = r.value;
                break;
              case 'SE.ADT.LITR.ZS':
                data.literacyRate = r.value;
                break;
              case 'SP.DYN.IMRT.IN':
                data.infantMortality = r.value;
                break;
              case 'EG.ELC.ACCS.ZS':
                data.electricityAccess = r.value;
                break;
              case 'IT.NET.USER.ZS':
                data.internetUsers = r.value;
                break;
              case 'IT.CEL.SETS.P2':
                data.mobileSubscriptions = r.value;
                break;
              case 'SH.XPD.CHEX.GD.ZS':
                data.healthExpenditure = r.value;
                break;
            }
          }
        });

        data.year = latestYear;
        return data;
      }),
    );
  }
}
