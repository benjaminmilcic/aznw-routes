import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import * as maptilerSDK from '@maptiler/sdk';
import { Map } from '@maptiler/sdk';
import {
  WindLayer,
  TemperatureLayer,
  PrecipitationLayer,
  PressureLayer,
  ColorRamp,
} from '@maptiler/weather';
import { environment } from '../../../../../environments/environment';

type WeatherLayerType = 'wind' | 'temperature' | 'precipitation' | 'pressure';

@Component({
  selector: 'app-location-map',
  imports: [CommonModule, TranslateModule],
  templateUrl: './location-map.component.html',
  styleUrl: './location-map.component.css',
})
export class LocationMapComponent implements AfterViewInit, OnDestroy {
  @Input() lat: number;
  @Input() lng: number;
  @Output() errorOccurred = new EventEmitter<string>();
  @Output() removeError = new EventEmitter<string>();

  private map!: Map;
  private currentWeatherLayer: any = null;
  private currentLayerId: string | null = null;
  private langChangeSub: Subscription;

  activeLayer: WeatherLayerType = 'temperature';
  isGlobeProjection: boolean = false;

  // Legend data for each layer type
  legendData: { color: string; label: string }[] = [];

  constructor(private translateService: TranslateService) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    try {
      const lang = this.translateService.currentLang || 'de';

      // Define locale for control tooltips
      const locale: any = {};
      if (lang === 'de') {
        locale['NavigationControl.ResetBearing'] = 'Ausrichtung nach Norden zurücksetzen';
        locale['NavigationControl.ZoomIn'] = 'Vergrößern';
        locale['NavigationControl.ZoomOut'] = 'Verkleinern';
        locale['GeolocateControl.FindMyLocation'] = 'Meinen Standort finden';
        locale['GeolocateControl.LocationNotAvailable'] = 'Standort nicht verfügbar';
      } else if (lang === 'hr') {
        locale['NavigationControl.ResetBearing'] = 'Resetiraj orijentaciju prema sjeveru';
        locale['NavigationControl.ZoomIn'] = 'Povećaj';
        locale['NavigationControl.ZoomOut'] = 'Smanji';
        locale['GeolocateControl.FindMyLocation'] = 'Pronađi moju lokaciju';
        locale['GeolocateControl.LocationNotAvailable'] = 'Lokacija nije dostupna';
      }
      // English is default, no need to set

      this.map = new maptilerSDK.Map({
        container: 'map',
        style: maptilerSDK.MapStyle.STREETS,
        center: [this.lng, this.lat],
        zoom: 5,
        apiKey: environment.maptiler.apiKey,
        language: lang as any,
        navigationControl: 'top-right', // Use default navigation control with all buttons
        locale: Object.keys(locale).length > 0 ? locale : undefined
      });

      this.map.on('load', () => {
        this.addWeatherLayer(this.activeLayer);
        this.removeError.emit('gimmicks.weather.errorLoadingMap');
      });

      this.map.on('error', (e) => {
        console.error('Map error:', e);
        this.errorOccurred.emit(
          this.translateService.instant('gimmicks.weather.errorLoadingMap')
        );
      });

      this.langChangeSub = this.translateService.onLangChange.subscribe((event) => {
        if (this.map) {
          this.map.setLanguage(event.lang as any);
        }
      });
    } catch (error) {
      console.error('Fehler beim Initialisieren der Karte:', error);
      this.errorOccurred.emit(
        this.translateService.instant('gimmicks.weather.errorLoadingMap')
      );
    }
  }

  private async addWeatherLayer(layerType: WeatherLayerType): Promise<void> {
    if (!this.map) return;

    try {
      // Remove current layer if exists
      if (this.currentLayerId && this.map.getLayer(this.currentLayerId)) {
        this.map.removeLayer(this.currentLayerId);
        this.currentWeatherLayer = null;
        this.currentLayerId = null;
      }

      let layerId: string;
      let newLayer: any;

      switch (layerType) {
        case 'wind':
          layerId = 'wind-layer';
          newLayer = new WindLayer({
            id: layerId,
            opacity: 0.7
          });
          break;
        case 'temperature':
          layerId = 'temperature-layer';
          newLayer = new TemperatureLayer({
            id: layerId,
            opacity: 0.7
          });
          break;
        case 'precipitation':
          layerId = 'precipitation-layer';
          newLayer = new PrecipitationLayer({
            id: layerId,
            opacity: 0.7
          });
          break;
        case 'pressure':
          layerId = 'pressure-layer';
          newLayer = new PressureLayer({
            id: layerId,
            opacity: 0.7
          });
          break;
        default:
          return;
      }

      // Only add if not already on map
      if (!this.map.getLayer(layerId)) {
        this.map.addLayer(newLayer);
        this.currentWeatherLayer = newLayer;
        this.currentLayerId = layerId;
        // Animation disabled - showing only current weather data
        // newLayer.animateByFactor(3600);

        // Update legend with actual colors from the layer
        this.updateLegendFromLayer(newLayer);
        this.removeError.emit('gimmicks.weather.errorLoadingWeatherLayer');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Wetter-Layers:', error);
      this.errorOccurred.emit(
        this.translateService.instant('gimmicks.weather.errorLoadingWeatherLayer')
      );
    }
  }

  switchLayer(layerType: WeatherLayerType): void {
    this.activeLayer = layerType;
    this.addWeatherLayer(layerType);
  }

  toggleGlobeProjection(): void {
    if (!this.map) return;

    this.isGlobeProjection = !this.isGlobeProjection;

    if (this.isGlobeProjection) {
      this.map.enableGlobeProjection();
      // Zoom out to see the entire globe
      this.map.flyTo({
        zoom: 0.5,
        center: [this.lng, this.lat],
        duration: 1500
      });
    } else {
      this.map.enableMercatorProjection();
      // Zoom back to regional view
      this.map.flyTo({
        zoom: 5,
        center: [this.lng, this.lat],
        duration: 1500
      });
    }
  }

  private updateLegendFromLayer(layer: any): void {
    let colorRamp: ColorRamp;
    let values: number[];
    let unit: string;

    switch (this.activeLayer) {
      case 'temperature':
        // Default: ColorRamp.builtin.TEMPERATURE_2 (range: -70.15°C to 46.85°C)
        colorRamp = ColorRamp.builtin.TEMPERATURE_2;
        values = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
        unit = '°C';
        break;
      case 'wind':
        // Default: ColorRamp.builtin.VIRIDIS (range: 0 to 40 m/s)
        // VIRIDIS is defined in [0,1], so we use it without scaling
        colorRamp = ColorRamp.builtin.VIRIDIS;
        // We'll normalize these values to [0,1] when getting colors
        values = [0, 5, 10, 15, 20, 25, 30, 35, 40];
        unit = ' m/s';
        break;
      case 'precipitation':
        // Default: ColorRamp.builtin.PRECIPITATION (range: 0 to 50 mm/h)
        colorRamp = ColorRamp.builtin.PRECIPITATION;
        values = [0.5, 1, 2, 5, 10, 20, 30, 40, 50];
        unit = ' mm/h';
        break;
      case 'pressure':
        // Default: ColorRamp.builtin.PRESSURE_2 (range: 900 to 1080 hPa)
        colorRamp = ColorRamp.builtin.PRESSURE_2;
        values = [920, 940, 960, 980, 1000, 1020, 1040, 1060];
        unit = ' hPa';
        break;
      default:
        return;
    }

    // Generate legend data from the actual color ramp
    this.legendData = values.map(value => {
      let colorValue = value;

      // For wind layer, VIRIDIS is in [0,1], so normalize the value from [0,40] to [0,1]
      if (this.activeLayer === 'wind') {
        colorValue = value / 40; // Normalize to [0,1]
      }

      const color = colorRamp.getColor(colorValue);
      // Ensure alpha is set to 1 for visibility (some ColorRamps may have alpha=0)
      const alpha = color[3] > 0 ? color[3] : 1;
      return {
        color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`,
        label: `${value}${unit}`
      };
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    if (this.currentLayerId && this.map && this.map.getLayer(this.currentLayerId)) {
      this.map.removeLayer(this.currentLayerId);
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
