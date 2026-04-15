import LatLng = google.maps.LatLng;

export interface City {
  rang: number;
  name: string;
  nameEn?: string;
  nameHr?: string;
  federalStateIndex: number;
  federalStateName: string;
  population: number;
  link: string;
  linkEn?: string;
  linkHr?: string;
  enTakeDe?: boolean;
  hrTakeDe?: boolean;
  hrTakeEn?: boolean;
  location: LatLng;
}

export interface CityInfo {
  name: string;
  population: number;
  federalState: string;
  link: string;
}

export interface MapDimension {
  width: number;
  height: number;
}
