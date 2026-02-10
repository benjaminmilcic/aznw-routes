import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CountriesService } from '../countries.service';
import {
  CountriesCountry,
  CountriesWeatherData,
  CountriesWikipediaSummary,
  CountriesWorldBankData,
} from '../countries.model';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { CountriesWeatherMapComponent } from '../countries-weather-map/countries-weather-map.component';

@Component({
  selector: 'app-countries-detail',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslateModule,
    MatChipsModule,
    CountriesWeatherMapComponent,
  ],
  templateUrl: './countries-detail.component.html',
  styleUrl: './countries-detail.component.css',
})
export class CountriesDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly countryService = inject(CountriesService);
  private readonly translate = inject(TranslateService);

  private readonly langToTranslationKey: Record<string, string> = {
    de: 'deu',
    en: 'eng',
    hr: 'hrv',
  };

  country: CountriesCountry | null = null;
  neighborCountries: CountriesCountry[] = [];
  wikipedia: CountriesWikipediaSummary | null = null;
  weather: CountriesWeatherData | null = null;
  worldBankData: CountriesWorldBankData | null = null;
  loading = true;
  private langSub?: Subscription;
  currentLang: string = 'en';

  // Wikipedia article name overrides per language (when translation doesn't match Wikipedia title)
  private readonly wikipediaNameOverrides: Record<
    string,
    Record<string, string>
  > = {
    de: {
      'Kongo (Dem. Rep.)': 'Demokratische Republik Kongo',
      'Kongo (Rep.)': 'Republik Kongo',
      Nordmazedonien: 'Nordmazedonien',
      Vatikanstadt: 'Vatikanstadt',
      Osttimor: 'Osttimor',
      "Côte d'Ivoire": 'Elfenbeinküste',
      Elfenbeinküste: 'Elfenbeinküste',
      Eswatini: 'Eswatini',
      'Cabo Verde': 'Kap Verde',
      'Kap Verde': 'Kap Verde',
      Tschechien: 'Tschechien',
      Myanmar: 'Myanmar',
      Südkorea: 'Südkorea',
      Nordkorea: 'Nordkorea',
      'Vereinigte Staaten': 'Vereinigte Staaten',
      'Vereinigtes Königreich': 'Vereinigtes Königreich',
    },
    en: {
      'DR Congo': 'Democratic Republic of the Congo',
      'Congo Republic': 'Republic of the Congo',
      'Ivory Coast': 'Ivory Coast',
      'Cape Verde': 'Cape Verde',
      'South Korea': 'South Korea',
      'North Korea': 'North Korea',
      'Timor-Leste': 'East Timor',
    },
    hr: {
      'DR Kongo': 'Demokratska Republika Kongo',
      Kongo: 'Republika Kongo',
      'Obala Bjelokosti': 'Obala Bjelokosti',
      'Zelenortska Republika': 'Zelenortski Otoci',
      'Južna Koreja': 'Južna Koreja',
      'Sjeverna Koreja': 'Sjeverna Koreja',
    },
  };

  private readonly capitalTranslations: Record<string, Record<string, string>> =
    {
      de: {
        Prague: 'Prag',
        Praha: 'Prag',
        Moscow: 'Moskau',
        Moskva: 'Moskau',
        Warsaw: 'Warschau',
        Warszawa: 'Warschau',
        Vienna: 'Wien',
        Rome: 'Rom',
        Roma: 'Rom',
        Athens: 'Athen',
        Athína: 'Athen',
        Lisbon: 'Lissabon',
        Lisboa: 'Lissabon',
        Brussels: 'Brüssel',
        Bruxelles: 'Brüssel',
        Copenhagen: 'Kopenhagen',
        København: 'Kopenhagen',
        Luxembourg: 'Luxemburg',
        Bucharest: 'Bukarest',
        București: 'Bukarest',
        Belgrade: 'Belgrad',
        Beograd: 'Belgrad',
        Kyiv: 'Kiew',
        Kiev: 'Kiew',
        Київ: 'Kiew',
        Vilnius: 'Wilna',
        'Vatican City': 'Vatikanstadt',
        Nicosia: 'Nikosia',
        Beijing: 'Peking',
        Tokyo: 'Tokio',
        Tōkyō: 'Tokio',
        'New Delhi': 'Neu-Delhi',
        Singapore: 'Singapur',
        Taipei: 'Taipeh',
        'Hong Kong': 'Hongkong',
        Tehran: 'Teheran',
        Tehrān: 'Teheran',
        Baghdad: 'Bagdad',
        Damascus: 'Damaskus',
        Dimashq: 'Damaskus',
        Riyadh: 'Riad',
        'Kuwait City': 'Kuwait-Stadt',
        Muscat: 'Maskat',
        "Sana'a": 'Sanaa',
        Tbilisi: 'Tiflis',
        Yerevan: 'Jerewan',
        Tashkent: 'Taschkent',
        Bishkek: 'Bischkek',
        Dushanbe: 'Duschanbe',
        Pyongyang: 'Pjöngjang',
        Cairo: 'Kairo',
        'Al-Qāhirah': 'Kairo',
        Algiers: 'Algier',
        Tripoli: 'Tripolis',
        Khartoum: 'Khartum',
        'Addis Ababa': 'Addis Abeba',
        'Dar es Salaam': 'Daressalam',
        'Cape Town': 'Kapstadt',
        'Mexico City': 'Mexiko-Stadt',
        'Ciudad de México': 'Mexiko-Stadt',
        Havana: 'Havanna',
        'La Habana': 'Havanna',
        'Guatemala City': 'Guatemala-Stadt',
        'Panama City': 'Panama-Stadt',
        Santiago: 'Santiago de Chile',
      },
      hr: {
        Vienna: 'Beč',
        Rome: 'Rim',
        Roma: 'Rim',
        Athens: 'Atena',
        Athína: 'Atena',
        Lisbon: 'Lisabon',
        Lisboa: 'Lisabon',
        Brussels: 'Bruxelles',
        Copenhagen: 'Kopenhagen',
        København: 'Kopenhagen',
        Luxembourg: 'Luksemburg',
        Bucharest: 'Bukurešt',
        București: 'Bukurešt',
        Belgrade: 'Beograd',
        Kyiv: 'Kijev',
        Kiev: 'Kijev',
        Київ: 'Kijev',
        Prague: 'Prag',
        Praha: 'Prag',
        Moscow: 'Moskva',
        Moskva: 'Moskva',
        Warsaw: 'Varšava',
        Warszawa: 'Varšava',
        'Vatican City': 'Vatikan',
        Nicosia: 'Nikozija',
        Beijing: 'Peking',
        Tokyo: 'Tokio',
        Tōkyō: 'Tokio',
        'New Delhi': 'New Delhi',
        Singapore: 'Singapur',
        Taipei: 'Taipei',
        'Hong Kong': 'Hong Kong',
        Tehran: 'Teheran',
        Tehrān: 'Teheran',
        Baghdad: 'Bagdad',
        Damascus: 'Damask',
        Dimashq: 'Damask',
        Cairo: 'Kairo',
        'Al-Qāhirah': 'Kairo',
        Algiers: 'Alžir',
        Tripoli: 'Tripoli',
        'Addis Ababa': 'Adis Abeba',
        'Cape Town': 'Cape Town',
        'Mexico City': 'Ciudad de México',
        Havana: 'Havana',
        Santiago: 'Santiago de Chile',
        Pyongyang: 'Pjongjang',
        Yerevan: 'Erevan',
        Tbilisi: 'Tbilisi',
      },
    };

  private readonly regionTranslations: Record<string, Record<string, string>> =
    {
      de: {
        Africa: 'Afrika',
        Americas: 'Amerika',
        Asia: 'Asien',
        Europe: 'Europa',
        Oceania: 'Ozeanien',
        Antarctic: 'Antarktis',
      },
      hr: {
        Africa: 'Afrika',
        Americas: 'Amerika',
        Asia: 'Azija',
        Europe: 'Europa',
        Oceania: 'Oceanija',
        Antarctic: 'Antarktika',
      },
    };

  private readonly continentTranslations: Record<
    string,
    Record<string, string>
  > = {
    de: {
      Africa: 'Afrika',
      Antarctica: 'Antarktis',
      Asia: 'Asien',
      Europe: 'Europa',
      'North America': 'Nordamerika',
      Oceania: 'Ozeanien',
      'South America': 'Südamerika',
    },
    hr: {
      Africa: 'Afrika',
      Antarctica: 'Antarktika',
      Asia: 'Azija',
      Europe: 'Europa',
      'North America': 'Sjeverna Amerika',
      Oceania: 'Oceanija',
      'South America': 'Južna Amerika',
    },
  };

  private readonly subregionTranslations: Record<
    string,
    Record<string, string>
  > = {
    de: {
      'Northern Africa': 'Nordafrika',
      'Eastern Africa': 'Ostafrika',
      'Middle Africa': 'Zentralafrika',
      'Southern Africa': 'Südliches Afrika',
      'Western Africa': 'Westafrika',
      Caribbean: 'Karibik',
      'Central America': 'Zentralamerika',
      'South America': 'Südamerika',
      'Northern America': 'Nordamerika',
      'North America': 'Nordamerika',
      'Central Asia': 'Zentralasien',
      'Eastern Asia': 'Ostasien',
      'South-Eastern Asia': 'Südostasien',
      'Southern Asia': 'Südasien',
      'Western Asia': 'Westasien',
      'Central Europe': 'Mitteleuropa',
      'Southeast Europe': 'Südosteuropa',
      'Eastern Europe': 'Osteuropa',
      'Northern Europe': 'Nordeuropa',
      'Southern Europe': 'Südeuropa',
      'Western Europe': 'Westeuropa',
      'Australia and New Zealand': 'Australien und Neuseeland',
      Melanesia: 'Melanesien',
      Micronesia: 'Mikronesien',
      Polynesia: 'Polynesien',
    },
    en: {
      'Northern Africa': 'Northern Africa',
      'Eastern Africa': 'Eastern Africa',
      'Middle Africa': 'Central Africa',
      'Southern Africa': 'Southern Africa',
      'Western Africa': 'Western Africa',
      Caribbean: 'Caribbean',
      'Central America': 'Central America',
      'South America': 'South America',
      'Northern America': 'North America',
      'North America': 'North America',
      'Central Asia': 'Central Asia',
      'Eastern Asia': 'East Asia',
      'South-Eastern Asia': 'Southeast Asia',
      'Southern Asia': 'South Asia',
      'Western Asia': 'West Asia',
      'Central Europe': 'Central Europe',
      'Southeast Europe': 'Southeast Europe',
      'Eastern Europe': 'Eastern Europe',
      'Northern Europe': 'Northern Europe',
      'Southern Europe': 'Southern Europe',
      'Western Europe': 'Western Europe',
      'Australia and New Zealand': 'Australia and New Zealand',
      Melanesia: 'Melanesia',
      Micronesia: 'Micronesia',
      Polynesia: 'Polynesia',
    },
    hr: {
      'Northern Africa': 'Sjeverna Afrika',
      'Eastern Africa': 'Istočna Afrika',
      'Middle Africa': 'Srednja Afrika',
      'Southern Africa': 'Južna Afrika',
      'Western Africa': 'Zapadna Afrika',
      Caribbean: 'Karibi',
      'Central America': 'Srednja Amerika',
      'South America': 'Južna Amerika',
      'Northern America': 'Sjeverna Amerika',
      'North America': 'Sjeverna Amerika',
      'Central Asia': 'Srednja Azija',
      'Eastern Asia': 'Istočna Azija',
      'South-Eastern Asia': 'Jugoistočna Azija',
      'Southern Asia': 'Južna Azija',
      'Western Asia': 'Zapadna Azija',
      'Central Europe': 'Srednja Europa',
      'Southeast Europe': 'Jugoistočna Europa',
      'Eastern Europe': 'Istočna Europa',
      'Northern Europe': 'Sjeverna Europa',
      'Southern Europe': 'Južna Europa',
      'Western Europe': 'Zapadna Europa',
      'Australia and New Zealand': 'Australija i Novi Zeland',
      Melanesia: 'Melanezija',
      Micronesia: 'Mikronezija',
      Polynesia: 'Polinezija',
    },
  };

  private readonly currencyTranslations: Record<
    string,
    Record<string, string>
  > = {
    de: {
      Euro: 'Euro',
      'British pound': 'Britisches Pfund',
      'Swiss franc': 'Schweizer Franken',
      'Swedish krona': 'Schwedische Krone',
      'Norwegian krone': 'Norwegische Krone',
      'Danish krone': 'Dänische Krone',
      'Polish złoty': 'Polnischer Złoty',
      'Czech koruna': 'Tschechische Krone',
      'Hungarian forint': 'Ungarischer Forint',
      'Romanian leu': 'Rumänischer Leu',
      'Bulgarian lev': 'Bulgarischer Lew',
      'Croatian kuna': 'Kroatische Kuna',
      'Serbian dinar': 'Serbischer Dinar',
      'Russian ruble': 'Russischer Rubel',
      'Ukrainian hryvnia': 'Ukrainische Hrywnja',
      'Bosnian convertible mark': 'Bosnische Konvertible Mark',
      'Turkish lira': 'Türkische Lira',
      'Icelandic króna': 'Isländische Krone',
      'United States dollar': 'US-Dollar',
      'Canadian dollar': 'Kanadischer Dollar',
      'Mexican peso': 'Mexikanischer Peso',
      'Brazilian real': 'Brasilianischer Real',
      'Japanese yen': 'Japanischer Yen',
      'Chinese yuan': 'Chinesischer Yuan',
      'South Korean won': 'Südkoreanischer Won',
      'Indian rupee': 'Indische Rupie',
      'Saudi riyal': 'Saudi-Riyal',
      'Emirati dirham': 'VAE-Dirham',
      'UAE dirham': 'VAE-Dirham',
      'Israeli new shekel': 'Israelischer Schekel',
      'Thai baht': 'Thailändischer Baht',
      'Singapore dollar': 'Singapur-Dollar',
      'Indonesian rupiah': 'Indonesische Rupiah',
      'Hong Kong dollar': 'Hongkong-Dollar',
      'New Taiwan dollar': 'Neuer Taiwan-Dollar',
      'South African rand': 'Südafrikanischer Rand',
      'Egyptian pound': 'Ägyptisches Pfund',
      'Australian dollar': 'Australischer Dollar',
      'New Zealand dollar': 'Neuseeland-Dollar',
      'Iranian rial': 'Iranischer Rial',
      'Iraqi dinar': 'Irakischer Dinar',
      'Lebanese pound': 'Libanesisches Pfund',
      'Syrian pound': 'Syrisches Pfund',
      'Kuwaiti dinar': 'Kuwaitischer Dinar',
      'Qatari riyal': 'Katarischer Riyal',
      'West African CFA franc': 'Westafrikanischer CFA-Franc',
      'Central African CFA franc': 'Zentralafrikanischer CFA-Franc',
      'Fijian dollar': 'Fidschi-Dollar',
      'Kuwait City': 'Kuwait-Stadt',
    },
    hr: {
      Euro: 'Euro',
      'British pound': 'Britanska funta',
      'Swiss franc': 'Švicarski franak',
      'Swedish krona': 'Švedska kruna',
      'Norwegian krone': 'Norveška kruna',
      'Danish krone': 'Danska kruna',
      'Polish złoty': 'Poljski zlot',
      'Czech koruna': 'Češka kruna',
      'Hungarian forint': 'Mađarska forinta',
      'Romanian leu': 'Rumunjski lej',
      'Bulgarian lev': 'Bugarski lev',
      'Serbian dinar': 'Srpski dinar',
      'Russian ruble': 'Ruska rublja',
      'Ukrainian hryvnia': 'Ukrajinska grivna',
      'Bosnian convertible mark': 'Bosanskohercegovačka konvertibilna marka',
      'Turkish lira': 'Turska lira',
      'Icelandic króna': 'Islandska kruna',
      'United States dollar': 'Američki dolar',
      'Canadian dollar': 'Kanadski dolar',
      'Mexican peso': 'Meksički peso',
      'Brazilian real': 'Brazilski real',
      'Japanese yen': 'Japanski jen',
      'Chinese yuan': 'Kineski juan',
      'South Korean won': 'Južnokorejski von',
      'Indian rupee': 'Indijska rupija',
      'Saudi riyal': 'Saudijski rijal',
      'Emirati dirham': 'UAE dirham',
      'UAE dirham': 'UAE dirham',
      'Israeli new shekel': 'Izraelski šekel',
      'Thai baht': 'Tajlandski baht',
      'Singapore dollar': 'Singapurski dolar',
      'Indonesian rupiah': 'Indonezijska rupija',
      'Hong Kong dollar': 'Hongkonški dolar',
      'New Taiwan dollar': 'Novi tajvanski dolar',
      'South African rand': 'Južnoafrički rand',
      'Egyptian pound': 'Egipatska funta',
      'Australian dollar': 'Australski dolar',
      'New Zealand dollar': 'Novozelandski dolar',
      'Iranian rial': 'Iranski rijal',
      'Iraqi dinar': 'Irački dinar',
      'Lebanese pound': 'Libanonska funta',
      'Syrian pound': 'Sirijska funta',
      'Kuwaiti dinar': 'Kuvajtski dinar',
      'Qatari riyal': 'Katarski rijal',
    },
  };

  private readonly languageTranslations: Record<
    string,
    Record<string, string>
  > = {
    de: {
      German: 'Deutsch',
      English: 'Englisch',
      French: 'Französisch',
      Spanish: 'Spanisch',
      Italian: 'Italienisch',
      Portuguese: 'Portugiesisch',
      Dutch: 'Niederländisch',
      Polish: 'Polnisch',
      Russian: 'Russisch',
      Chinese: 'Chinesisch',
      Japanese: 'Japanisch',
      Korean: 'Koreanisch',
      Arabic: 'Arabisch',
      Hindi: 'Hindi',
      Turkish: 'Türkisch',
      Greek: 'Griechisch',
      Swedish: 'Schwedisch',
      Norwegian: 'Norwegisch',
      Danish: 'Dänisch',
      Finnish: 'Finnisch',
      Czech: 'Tschechisch',
      Hungarian: 'Ungarisch',
      Romanian: 'Rumänisch',
      Bulgarian: 'Bulgarisch',
      Croatian: 'Kroatisch',
      Serbian: 'Serbisch',
      Slovak: 'Slowakisch',
      Slovenian: 'Slowenisch',
      Ukrainian: 'Ukrainisch',
      Hebrew: 'Hebräisch',
      Thai: 'Thailändisch',
      Vietnamese: 'Vietnamesisch',
      Indonesian: 'Indonesisch',
      Malay: 'Malaiisch',
      Swahili: 'Suaheli',
      Persian: 'Persisch',
      Bengali: 'Bengalisch',
      Urdu: 'Urdu',
      Tamil: 'Tamil',
      Catalan: 'Katalanisch',
      Basque: 'Baskisch',
      Galician: 'Galicisch',
      Irish: 'Irisch',
      Welsh: 'Walisisch',
      'Scottish Gaelic': 'Schottisch-Gälisch',
      Icelandic: 'Isländisch',
      Estonian: 'Estnisch',
      Latvian: 'Lettisch',
      Lithuanian: 'Litauisch',
      Maltese: 'Maltesisch',
      Albanian: 'Albanisch',
      Macedonian: 'Mazedonisch',
      Bosnian: 'Bosnisch',
      Montenegrin: 'Montenegrinisch',
      Luxembourgish: 'Luxemburgisch',
      Romansh: 'Rätoromanisch',
    },
    hr: {
      German: 'Njemački',
      English: 'Engleski',
      French: 'Francuski',
      Spanish: 'Španjolski',
      Italian: 'Talijanski',
      Portuguese: 'Portugalski',
      Dutch: 'Nizozemski',
      Polish: 'Poljski',
      Russian: 'Ruski',
      Chinese: 'Kineski',
      Japanese: 'Japanski',
      Korean: 'Korejski',
      Arabic: 'Arapski',
      Hindi: 'Hindi',
      Turkish: 'Turski',
      Greek: 'Grčki',
      Swedish: 'Švedski',
      Norwegian: 'Norveški',
      Danish: 'Danski',
      Finnish: 'Finski',
      Czech: 'Češki',
      Hungarian: 'Mađarski',
      Romanian: 'Rumunjski',
      Bulgarian: 'Bugarski',
      Croatian: 'Hrvatski',
      Serbian: 'Srpski',
      Slovak: 'Slovački',
      Slovenian: 'Slovenski',
      Ukrainian: 'Ukrajinski',
      Hebrew: 'Hebrejski',
      Thai: 'Tajlandski',
      Vietnamese: 'Vijetnamski',
      Indonesian: 'Indonezijski',
      Malay: 'Malajski',
      Swahili: 'Svahili',
      Persian: 'Perzijski',
      Bengali: 'Bengalski',
      Urdu: 'Urdu',
      Tamil: 'Tamilski',
      Catalan: 'Katalonski',
      Basque: 'Baskijski',
      Galician: 'Galicijski',
      Irish: 'Irski',
      Welsh: 'Velški',
      'Scottish Gaelic': 'Škotski gelski',
      Icelandic: 'Islandski',
      Estonian: 'Estonski',
      Latvian: 'Latvijski',
      Lithuanian: 'Litavski',
      Maltese: 'Malteški',
      Albanian: 'Albanski',
      Macedonian: 'Makedonski',
      Bosnian: 'Bosanski',
      Montenegrin: 'Crnogorski',
      Luxembourgish: 'Luksemburški',
      Romansh: 'Retoromanski',
    },
  };

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const code = params['code'];
      if (code) {
        this.loadCountry(code);
      }
    });
    this.currentLang = this.translate.currentLang || 'en';

    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.loadWikipediaSummary();
      this.currentLang = this.translate.currentLang || 'en';
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private loadCountry(codeOrName: string): void {
    this.loading = true;
    this.country = null;
    this.neighborCountries = [];
    this.wikipedia = null;
    this.weather = null;
    this.worldBankData = null;

    const isName = codeOrName.length > 3;
    const request$ = isName
      ? this.countryService.getCountryByName(codeOrName)
      : this.countryService.getCountryByCode(codeOrName);

    request$.subscribe({
      next: (country) => {
        if (!country && !isName) {
          this.countryService.getCountryByName(codeOrName).subscribe({
            next: (c) => this.handleCountryLoaded(c),
            error: () => (this.loading = false),
          });
        } else {
          this.handleCountryLoaded(country);
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private handleCountryLoaded(country: CountriesCountry | null): void {
    this.country = country;
    this.loading = false;

    if (!country) return;

    // Debug: log coordinates
    console.log(
      'Country loaded:',
      country.name.common,
      'cca2:',
      country.cca2,
      'latlng:',
      country.latlng,
    );

    if (country.borders?.length) {
      this.countryService.getCountriesByCodes(country.borders).subscribe({
        next: (neighbors) => (this.neighborCountries = neighbors),
      });
    }

    this.loadWikipediaSummary();

    if (country.latlng?.length >= 2) {
      this.countryService
        .getWeather(country.latlng[0], country.latlng[1])
        .subscribe({
          next: (weather) => (this.weather = weather),
        });
    }

    // Load World Bank data
    this.countryService.getWorldBankData(country.cca2).subscribe({
      next: (data) => (this.worldBankData = data),
    });
  }

  private loadWikipediaSummary(): void {
    if (!this.country) return;
    const currentLang = this.translate.currentLang || 'de';
    const translatedName =
      this.country.translations?.[this.translationKey]?.common ||
      this.country.name.common;
    const overrides = this.wikipediaNameOverrides[currentLang] || {};
    const wikiName = overrides[translatedName] || translatedName;
    this.countryService.getWikipediaSummary(wikiName, currentLang).subscribe({
      next: (wiki) => (this.wikipedia = wiki),
    });
  }

  get translationKey(): string {
    return this.langToTranslationKey[this.translate.currentLang] || 'deu';
  }

  get countryName(): string {
    return (
      this.country?.translations?.[this.translationKey]?.common ||
      this.country?.name?.common ||
      ''
    );
  }

  get countryOfficialName(): string {
    return (
      this.country?.translations?.[this.translationKey]?.official ||
      this.country?.name?.official ||
      ''
    );
  }

  get wikipediaExtract(): string | null {
    return this.wikipedia?.extract || null;
  }

  get capitalDisplay(): string {
    if (!this.country?.capital) return '';
    const lang = this.translate.currentLang || 'de';
    const translations = this.capitalTranslations[lang] || {};
    return this.country.capital.map((c) => translations[c] || c).join(', ');
  }

  get regionDisplay(): string {
    if (!this.country?.region) return '';
    const lang = this.translate.currentLang || 'de';
    const regionMap = this.regionTranslations[lang] || {};
    const subregionMap = this.subregionTranslations[lang] || {};
    const region = regionMap[this.country.region] || this.country.region;
    const subregion = this.country.subregion
      ? subregionMap[this.country.subregion] || this.country.subregion
      : null;
    return subregion ? `${region} (${subregion})` : region;
  }

  get continentsDisplay(): string {
    if (!this.country?.continents) return '';
    const lang = this.translate.currentLang || 'de';
    const translations = this.continentTranslations[lang] || {};
    return this.country.continents.map((c) => translations[c] || c).join(', ');
  }

  get currencies(): string[] {
    if (!this.country?.currencies) return [];
    const lang = this.translate.currentLang || 'de';
    const translations = this.currencyTranslations[lang] || {};
    return Object.values(this.country.currencies).map((c) => {
      const name = translations[c.name] || c.name;
      return `${name} (${c.symbol})`;
    });
  }

  get languages(): string[] {
    if (!this.country?.languages) return [];
    const currentLang = this.translate.currentLang || 'de';
    const translations = this.languageTranslations[currentLang] || {};
    return Object.values(this.country.languages).map(
      (lang) => translations[lang] || lang,
    );
  }

  get phoneCode(): string | null {
    if (!this.country?.idd?.root) return null;
    const suffixes = this.country.idd.suffixes || [];
    if (suffixes.length === 1) {
      return `${this.country.idd.root}${suffixes[0]}`;
    }
    return this.country.idd.root;
  }

  get tldDisplay(): string | null {
    if (!this.country?.tld?.length) return null;
    return this.country.tld.join(', ');
  }

  get sortedTimezones(): string[] {
    if (!this.country?.timezones?.length) return [];

    // Calculate expected timezone based on longitude (15° per hour)
    const lon = this.country.latlng?.[1] || 0;
    const expectedOffset = Math.round(lon / 15);

    // Parse timezone offset from string like "UTC+01:00" or "UTC-05:00"
    const parseOffset = (tz: string): number => {
      if (tz === 'UTC') return 0;
      const match = tz.match(/UTC([+-])(\d{2}):?(\d{2})?/);
      if (!match) return 999; // Put unparseable at the end
      const sign = match[1] === '+' ? 1 : -1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3] || '0', 10);
      return sign * (hours + minutes / 60);
    };

    // Sort by distance from expected offset
    return [...this.country.timezones].sort((a, b) => {
      const offsetA = parseOffset(a);
      const offsetB = parseOffset(b);
      const distA = Math.abs(offsetA - expectedOffset);
      const distB = Math.abs(offsetB - expectedOffset);
      return distA - distB;
    });
  }

  get giniInfo(): string | null {
    if (!this.country?.gini) return null;
    const years = Object.keys(this.country.gini);
    if (years.length === 0) return null;
    const latestYear = years.sort().reverse()[0];
    return `${this.country.gini[latestYear]} (${latestYear})`;
  }

  get coatOfArmsSvg(): string | null {
    return this.country?.coatOfArms?.svg || null;
  }

  get wikipediaUrl(): string {
    if (this.wikipedia?.content_urls?.desktop?.page) {
      return this.wikipedia.content_urls.desktop.page;
    }
    if (!this.country) return '';
    const lang = this.translate.currentLang || 'de';
    const name =
      this.country.translations?.[this.translationKey]?.common ||
      this.country.name.common;
    return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(name)}`;
  }

  get hasCoordinates(): boolean {
    const lat = this.country?.latlng?.[0];
    const lon = this.country?.latlng?.[1];
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon)
    );
  }

  get countryLat(): number {
    const lat = this.country?.latlng?.[0];
    return typeof lat === 'number' && !isNaN(lat) ? lat : 0;
  }

  get countryLon(): number {
    const lon = this.country?.latlng?.[1];
    return typeof lon === 'number' && !isNaN(lon) ? lon : 0;
  }
}
