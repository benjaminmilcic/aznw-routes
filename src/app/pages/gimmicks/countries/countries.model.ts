export interface CountriesCountry {
  name: {
    common: string;
    official: string;
    nativeName?: { [key: string]: { official: string; common: string } };
  };
  cca2: string;
  cca3: string;
  capital?: string[];
  region: string;
  subregion?: string;
  population: number;
  area: number;
  currencies?: { [key: string]: { name: string; symbol: string } };
  languages?: { [key: string]: string };
  timezones: string[];
  continents: string[];
  flags: {
    png: string;
    svg: string;
    alt?: string;
  };
  coatOfArms?: {
    png: string;
    svg: string;
  };
  maps: {
    googleMaps: string;
    openStreetMaps: string;
  };
  borders?: string[];
  latlng: number[];
  landlocked: boolean;
  independent?: boolean;
  unMember: boolean;
  startOfWeek: string;
  car: {
    signs: string[];
    side: string;
  };
  gini?: { [year: string]: number };
  fifa?: string;
  idd?: {
    root: string;
    suffixes: string[];
  };
  tld?: string[];
  demonyms?: {
    eng: { f: string; m: string };
  };
  translations?: {
    [langCode: string]: { official: string; common: string };
  };
}

export interface CountriesWikipediaSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop: { page: string };
    mobile: { page: string };
  };
}

export interface CountriesWeatherData {
  temperature: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
}

export interface CountriesWorldBankData {
  gdpPerCapita?: number;
  gdpTotal?: number;
  lifeExpectancy?: number;
  populationGrowth?: number;
  unemploymentRate?: number;
  co2PerCapita?: number;
  literacyRate?: number;
  infantMortality?: number;
  electricityAccess?: number;
  internetUsers?: number;
  mobileSubscriptions?: number;
  healthExpenditure?: number;
  year?: number;
}