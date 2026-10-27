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
  @Input() area: number | undefined; // Land area in km²

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
    // Compute the zoom based on the land area
    if (!this.area || this.area <= 0) return 5;

    if (this.area > 5000000) return 2; // Huge: Russia, Canada, USA, China
    if (this.area > 2000000) return 3; // Very large: Brazil, Australia, India
    if (this.area > 500000) return 4; // Large: DR Congo, Argentina
    if (this.area > 100000) return 5; // Medium: Germany, Japan, France
    if (this.area > 30000) return 6; // Small: Netherlands, Belgium, Switzerland
    if (this.area > 5000) return 7; // Very small: Luxembourg, Cyprus
    if (this.area > 500) return 8; // Tiny: Malta, Andorra
    return 9; // Microstates: Monaco, Vatican, San Marino
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

    // Windy has a bug: latitude 0 is interpreted as "empty"
    // Workaround: add a small offset if lat is exactly 0
    let lat = this.lat;
    if (lat === 0) {
      lat = 0.1;
    }

    // Windy embed URL with dynamic zoom
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
