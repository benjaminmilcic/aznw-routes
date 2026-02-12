import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-countries-weather-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countries-weather-map.component.html',
  styleUrl: './countries-weather-map.component.scss',
})
export class CountriesWeatherMapComponent implements OnChanges {
  @Input() lat: number | undefined;
  @Input() lon: number | undefined;
  @Input() lang = 'en';
  @Input() area: number | undefined; // Landesfläche in km²

  private readonly sanitizer = inject(DomSanitizer);
  private cacheBuster = Date.now();

  mapUrl: SafeResourceUrl | null = null;
  isReady = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['lat'] ||
      changes['lon'] ||
      changes['area'] ||
      changes['lang']
    ) {
      this.updateMapUrl();
    }
  }

  resetMap(): void {
    this.cacheBuster = Date.now();
    this.updateMapUrl();
  }

  private isValidCoordinate(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  private calculateZoom(): number {
    // Zoom basierend auf Landesfläche berechnen
    if (!this.area || this.area <= 0) return 5;

    if (this.area > 5000000) return 2; // Riesig: Russland, Kanada, USA, China
    if (this.area > 2000000) return 3; // Sehr groß: Brasilien, Australien, Indien
    if (this.area > 500000) return 4; // Groß: DR Kongo, Argentinien
    if (this.area > 100000) return 5; // Mittel: Deutschland, Japan, Frankreich
    if (this.area > 30000) return 6; // Klein: Niederlande, Belgien, Schweiz
    if (this.area > 5000) return 7; // Sehr klein: Luxemburg, Zypern
    if (this.area > 500) return 8; // Winzig: Malta, Andorra
    return 9; // Mikrostaaten: Monaco, Vatikan, San Marino
  }

  private updateMapUrl(): void {
    this.isReady = false;
    this.mapUrl = null;

    if (
      !this.isValidCoordinate(this.lat) ||
      !this.isValidCoordinate(this.lon)
    ) {
      return;
    }

    if (this.lat <= -85 || this.lat >= 85) {
      return;
    }

    // Windy hat einen Bug: Latitude 0 wird als "leer" interpretiert
    // Workaround: kleinen Offset hinzufügen wenn lat genau 0 ist
    let lat = this.lat;
    if (lat === 0) {
      lat = 0.1;
    }

    // Windy embed URL mit dynamischem Zoom
    const zoom = this.calculateZoom();
    const url =
      `https://embed.windy.com/embed.html` +
      `?type=map` +
      `&location=coordinates` +
      `&metricRain=mm` +
      `&metricTemp=%C2%B0C` +
      `&metricWind=km%2Fh` +
      `&zoom=${zoom}` +
      `&overlay=temp` +
      `&product=ecmwf` +
      `&level=surface` +
      `&lat=${lat.toFixed(2)}` +
      `&lon=${this.lon.toFixed(2)}` +
      `&lang=${this.lang}`;

    console.log('WeatherMap URL:', url);

    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isReady = true;
  }
}
