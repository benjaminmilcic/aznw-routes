import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { combineLatest, take, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { CountriesService } from '../countries.service';
import { CountriesCountry } from '../countries.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-countries-worldmap',
  imports: [CommonModule, MatProgressSpinnerModule,TranslateModule],
  templateUrl: './countries-worldmap.component.html',
  styleUrl: './countries-worldmap.component.css',
})
export class CountriesWorldmapComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly countryService = inject(CountriesService);

  private map!: L.Map;
  private geoJsonLayer!: L.GeoJSON;
  private highlightedLayer: L.Path | null = null;
  private countryNameMap = new Map<string, string>();
  private countries: CountriesCountry[] = [];
  private langSub?: Subscription;

  /** Maps ngx-translate language codes to REST Countries API translation keys */
  private readonly langToTranslationKey: Record<string, string> = {
    de: 'deu',
    en: 'eng',
    hr: 'hrv',
  };

  private readonly defaultStyle: L.PathOptions = {
    fillColor: '#3b82f6',
    weight: 1,
    opacity: 1,
    color: '#1e40af',
    fillOpacity: 0.6,
  };

  private readonly hoverStyle: L.PathOptions = {
    fillColor: '#b91c1c',
    weight: 2,
    color: '#7f1d1d',
    fillOpacity: 0.8,
  };

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.loadGeoJson();
  }

  private loadGeoJson(): void {
    const geoJsonUrl =
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

    // Load both GeoJSON and country data, then combine
    combineLatest([
      this.http.get<GeoJSON.FeatureCollection>(geoJsonUrl),
      this.countryService.getAllCountries(),
    ])
      .pipe(take(1))
      .subscribe({
        next: ([geoData, countries]) => {
          this.countries = countries;
          this.buildCountryNameMap(countries);

          this.geoJsonLayer = L.geoJSON(geoData, {
            style: () => this.defaultStyle,
            onEachFeature: (feature, layer) =>
              this.onEachFeature(feature, layer),
          }).addTo(this.map);

          // Update tooltips when language changes
          this.langSub = this.translate.onLangChange.subscribe(() => {
            this.buildCountryNameMap(this.countries);
            this.updateTooltips();
          });
        },
        error: (err) => {
          console.error('Failed to load data:', err);
        },
      });
  }

  private buildCountryNameMap(countries: CountriesCountry[]): void {
    this.countryNameMap.clear();
    const currentLang = this.translate.currentLang || 'de';
    const translationKey = this.langToTranslationKey[currentLang] || 'deu';

    countries.forEach((country) => {
      const translatedName =
        country.translations?.[translationKey]?.common || country.name.common;
      if (country.cca2) {
        this.countryNameMap.set(country.cca2.toUpperCase(), translatedName);
      }
      if (country.cca3) {
        this.countryNameMap.set(country.cca3.toUpperCase(), translatedName);
      }
      if (country.name.common) {
        this.countryNameMap.set(country.name.common.toLowerCase(), translatedName);
      }
    });
  }

  private getTranslatedName(
    isoCode2: string | undefined,
    isoCode3: string | undefined,
    englishName: string,
  ): string {
    if (isoCode2 && isoCode2 !== '-99' && isoCode2 !== '-1') {
      const found = this.countryNameMap.get(isoCode2.toUpperCase());
      if (found) return found;
    }
    if (isoCode3 && isoCode3 !== '-99' && isoCode3 !== '-1') {
      const found = this.countryNameMap.get(isoCode3.toUpperCase());
      if (found) return found;
    }
    const foundByName = this.countryNameMap.get(englishName.toLowerCase());
    if (foundByName) return foundByName;

    return englishName;
  }

  private updateTooltips(): void {
    if (!this.geoJsonLayer) return;
    this.geoJsonLayer.eachLayer((layer) => {
      const feature = (layer as any).feature as GeoJSON.Feature;
      if (!feature) return;
      const props = feature.properties || {};
      const englishName =
        props['ADMIN'] || props['name'] || props['NAME'] || props['NAME_EN'] || 'Unknown';
      const isoCode2 =
        props['ISO3166-1-Alpha-2'] || props['ISO_A2'] || props['iso_a2'];
      const isoCode3 =
        props['ISO3166-1-Alpha-3'] || props['ISO_A3'] || props['iso_a3'];
      const translatedName = this.getTranslatedName(isoCode2, isoCode3, englishName);
      (layer as L.Layer).unbindTooltip();
      (layer as L.Layer).bindTooltip(translatedName, {
        permanent: false,
        direction: 'top',
        sticky: true,
        className: 'country-tooltip',
      });
    });
  }

  private onEachFeature(feature: GeoJSON.Feature, layer: L.Layer): void {
    const props = feature.properties || {};
    const englishName =
      props['ADMIN'] ||
      props['name'] ||
      props['NAME'] ||
      props['NAME_EN'] ||
      'Unknown';
    const isoCode2 =
      props['ISO3166-1-Alpha-2'] || props['ISO_A2'] || props['iso_a2'];
    const isoCode3 =
      props['ISO3166-1-Alpha-3'] || props['ISO_A3'] || props['iso_a3'];

    const translatedName = this.getTranslatedName(isoCode2, isoCode3, englishName);

    layer.bindTooltip(translatedName, {
      permanent: false,
      direction: 'top',
      sticky: true,
      className: 'country-tooltip',
    });

    // Use best available code for navigation
    const navCode =
      isoCode2 && isoCode2 !== '-99' && isoCode2 !== '-1'
        ? isoCode2
        : isoCode3 && isoCode3 !== '-99' && isoCode3 !== '-1'
          ? isoCode3
          : englishName;

    layer.on({
      mouseover: (e) => this.highlightFeature(e),
      mouseout: (e) => this.resetHighlight(e),
      click: () => this.onCountryClick(navCode, englishName),
    });
  }

  private highlightFeature(e: L.LeafletMouseEvent): void {
    const layer = e.target as L.Path;

    // Reset previously highlighted layer if different
    if (this.highlightedLayer && this.highlightedLayer !== layer) {
      this.highlightedLayer.setStyle(this.defaultStyle);
      this.highlightedLayer.closeTooltip();
    }

    this.highlightedLayer = layer;
    layer.setStyle(this.hoverStyle);
    layer.bringToFront();
  }

  private resetHighlight(e: L.LeafletMouseEvent): void {
    const layer = e.target as L.Path;

    // Only reset if this is still the highlighted layer
    if (this.highlightedLayer === layer) {
      layer.setStyle(this.defaultStyle);
      this.highlightedLayer = null;
    }
  }

  private onCountryClick(code: string, countryName: string): void {
    this.router.navigate(['/gimmicks/countries/country', code || countryName]);
  }
}
