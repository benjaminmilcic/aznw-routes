import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private climateDataCache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  getWeatherWithForecast(lat: number, lon: number): Observable<any> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set(
        'current',
        'temperature_2m,weathercode,wind_speed_10m,relative_humidity_2m,is_day'
      )
      .set(
        'daily',
        'temperature_2m_max,temperature_2m_min,weathercode,wind_speed_10m_max,precipitation_probability_mean'
      )
      .set(
        'hourly',
        'temperature_2m,weathercode,wind_speed_10m,precipitation_probability,relative_humidity_2m,wind_direction_10m'
      )
      .set('timezone', 'auto');

    return this.http.get('https://api.open-meteo.com/v1/forecast', { params });
  }

  getClimateData(lat: number, lon: number): Observable<any> {
    // Create cache key (rounded to 2 decimal places to group nearby locations)
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

    // Check if data is in cache
    if (this.climateDataCache.has(cacheKey)) {
      return of(this.climateDataCache.get(cacheKey));
    }


    // Berechne die letzten 30 Jahre dynamisch
    const today = new Date();
    const endYear = today.getFullYear() - 1; // Vorheriges Jahr für vollständige Daten
    const startYear = endYear - 29; // 30 Jahre (inkl. endYear)

    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;

    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('daily', 'temperature_2m_mean,precipitation_sum')
      .set('timezone', 'auto');

    return this.http.get('https://archive-api.open-meteo.com/v1/archive', { params }).pipe(
      tap(data => {
        // Cache the result
        this.climateDataCache.set(cacheKey, data);
      })
    );
  }
}
