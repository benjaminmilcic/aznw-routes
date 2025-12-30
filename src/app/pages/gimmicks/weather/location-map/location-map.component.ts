import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-map',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './location-map.component.html',
  styleUrl: './location-map.component.css',
})
export class LocationMapComponent implements AfterViewInit, OnDestroy {
  @Input() lat: number;
  @Input() lng: number;
  @Output() errorOccurred = new EventEmitter<string>();
  private map!: L.Map;
  private restaurantMarkers: L.Marker[] = [];
  private supermarketMarkers: L.Marker[] = [];
  private gasStationMarkers: L.Marker[] = [];

  // UI Controls
  showRestaurants = false;
  showSupermarkets = false;
  showGasStations = false;
  restaurantRadius = 500;
  supermarketRadius = 500;
  gasStationRadius = 500;

  // Loading States
  isLoadingRestaurants = false;
  isLoadingSupermarkets = false;
  isLoadingGasStations = false;

  // Debounce Timeouts
  private restaurantDebounceTimer: any;
  private supermarketDebounceTimer: any;
  private gasStationDebounceTimer: any;

  // Custom Icons
  private restaurantIcon = L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><span style="font-size: 14px;">🍴</span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  private supermarketIcon = L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><span style="font-size: 14px;">🛒</span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  private gasStationIcon = L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color: #f97316; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><span style="font-size: 14px;">⛽</span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  constructor(
    private http: HttpClient,
    private translateService: TranslateService
  ) {}

  ngAfterViewInit(): void {
    this.initMap();
    if (this.showRestaurants) {
      this.loadRestaurants();
    }
    if (this.showSupermarkets) {
      this.loadSupermarkets();
    }
    if (this.showGasStations) {
      this.loadGasStations();
    }

    // Bei Sprachwechsel POIs neu laden, damit Popups aktualisiert werden
    this.translateService.onLangChange.subscribe(() => {
      this.reloadAllMarkers();
    });
  }

  private reloadAllMarkers(): void {
    if (this.showRestaurants && this.restaurantRadius > 0) {
      this.clearRestaurantMarkers();
      this.loadRestaurants();
    }
    if (this.showSupermarkets && this.supermarketRadius > 0) {
      this.clearSupermarketMarkers();
      this.loadSupermarkets();
    }
    if (this.showGasStations && this.gasStationRadius > 0) {
      this.clearGasStationMarkers();
      this.loadGasStations();
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([this.lat, this.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    L.circleMarker([this.lat, this.lng], {
      radius: 8,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(this.map);
  }

  onRestaurantToggle(): void {
    if (this.showRestaurants && this.restaurantRadius > 0) {
      this.loadRestaurants();
    } else {
      this.clearRestaurantMarkers();
    }
  }

  onSupermarketToggle(): void {
    if (this.showSupermarkets && this.supermarketRadius > 0) {
      this.loadSupermarkets();
    } else {
      this.clearSupermarketMarkers();
    }
  }

  onGasStationToggle(): void {
    if (this.showGasStations && this.gasStationRadius > 0) {
      this.loadGasStations();
    } else {
      this.clearGasStationMarkers();
    }
  }

  onRestaurantRadiusChange(): void {
    // Lösche vorherigen Timer
    if (this.restaurantDebounceTimer) {
      clearTimeout(this.restaurantDebounceTimer);
    }

    // Wenn Input leer ist, Marker sofort entfernen
    if (!this.restaurantRadius || this.restaurantRadius <= 0) {
      this.clearRestaurantMarkers();
      return;
    }

    // Setze neuen Timer - API wird erst nach 500ms ohne weitere Eingabe aufgerufen
    this.restaurantDebounceTimer = setTimeout(() => {
      if (this.showRestaurants && this.restaurantRadius > 0) {
        this.clearRestaurantMarkers();
        this.loadRestaurants();
      }
    }, 500);
  }

  onSupermarketRadiusChange(): void {
    // Lösche vorherigen Timer
    if (this.supermarketDebounceTimer) {
      clearTimeout(this.supermarketDebounceTimer);
    }

    // Wenn Input leer ist, Marker sofort entfernen
    if (!this.supermarketRadius || this.supermarketRadius <= 0) {
      this.clearSupermarketMarkers();
      return;
    }

    // Setze neuen Timer - API wird erst nach 500ms ohne weitere Eingabe aufgerufen
    this.supermarketDebounceTimer = setTimeout(() => {
      if (this.showSupermarkets && this.supermarketRadius > 0) {
        this.clearSupermarketMarkers();
        this.loadSupermarkets();
      }
    }, 500);
  }

  onGasStationRadiusChange(): void {
    // Lösche vorherigen Timer
    if (this.gasStationDebounceTimer) {
      clearTimeout(this.gasStationDebounceTimer);
    }

    // Wenn Input leer ist, Marker sofort entfernen
    if (!this.gasStationRadius || this.gasStationRadius <= 0) {
      this.clearGasStationMarkers();
      return;
    }

    // Setze neuen Timer - API wird erst nach 500ms ohne weitere Eingabe aufgerufen
    this.gasStationDebounceTimer = setTimeout(() => {
      if (this.showGasStations && this.gasStationRadius > 0) {
        this.clearGasStationMarkers();
        this.loadGasStations();
      }
    }, 500);
  }

  private clearRestaurantMarkers(): void {
    this.restaurantMarkers.forEach((marker) => marker.remove());
    this.restaurantMarkers = [];
  }

  private clearSupermarketMarkers(): void {
    this.supermarketMarkers.forEach((marker) => marker.remove());
    this.supermarketMarkers = [];
  }

  private clearGasStationMarkers(): void {
    this.gasStationMarkers.forEach((marker) => marker.remove());
    this.gasStationMarkers = [];
  }

  private overpassServers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
  ];
  private currentServerIndex = 0;

  private queryOverpass(query: string, retryCount = 0): Promise<any> {
    const server = this.overpassServers[this.currentServerIndex];

    return new Promise((resolve, reject) => {
      this.http
        .post(server, query, {
          headers: { 'Content-Type': 'text/plain' },
          responseType: 'text',
        })
        .subscribe({
          next: (response: string) => {
            try {
              const data = JSON.parse(response);
              resolve(data);
            } catch (e) {
              console.error('JSON Parse Error:', e);
              console.error('Response:', response.substring(0, 200));

              // Versuche nächsten Server
              if (retryCount < this.overpassServers.length - 1) {
                this.currentServerIndex =
                  (this.currentServerIndex + 1) % this.overpassServers.length;
                console.log(
                  `Versuche nächsten Server: ${
                    this.overpassServers[this.currentServerIndex]
                  }`
                );
                this.queryOverpass(query, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              } else {
                reject(new Error('Alle Overpass Server sind nicht erreichbar'));
              }
            }
          },
          error: (error) => {
            console.error(`Server ${server} Fehler:`, error);

            // Versuche nächsten Server
            if (retryCount < this.overpassServers.length - 1) {
              this.currentServerIndex =
                (this.currentServerIndex + 1) % this.overpassServers.length;
              console.log(
                `Versuche nächsten Server: ${
                  this.overpassServers[this.currentServerIndex]
                }`
              );
              this.queryOverpass(query, retryCount + 1)
                .then(resolve)
                .catch(reject);
            } else {
              reject(error);
            }
          },
        });
    });
  }

  loadRestaurants(): void {
    this.isLoadingRestaurants = true;
    const radius = this.restaurantRadius || 500;
    const query = `[out:json][timeout:25];(node["amenity"="restaurant"](around:${radius},${this.lat},${this.lng}););out body;`;

    this.queryOverpass(query)
      .then((res) => {
        if (res.elements) {
          res.elements.forEach((el: any) => {
            const marker = L.marker([el.lat, el.lon], {
              icon: this.restaurantIcon,
            })
              .addTo(this.map)
              .bindPopup(
                `<b>${
                  el.tags.name || this.translateService.instant('gimmicks.weather.restaurant')
                }</b><br><small>${this.translateService.instant('gimmicks.weather.restaurant')}</small>`
              );
            this.restaurantMarkers.push(marker);
          });
          console.log(`${res.elements.length} Restaurants geladen`);
        }
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Restaurants:', error);
        this.errorOccurred.emit(
          this.translateService.instant('gimmicks.weather.errorLoadingRestaurants')
        );
      })
      .finally(() => {
        this.isLoadingRestaurants = false;
      });
  }

  loadSupermarkets(): void {
    this.isLoadingSupermarkets = true;
    const radius = this.supermarketRadius || 500;
    const query = `[out:json][timeout:25];(node["shop"="supermarket"](around:${radius},${this.lat},${this.lng}););out body;`;

    this.queryOverpass(query)
      .then((res) => {
        if (res.elements) {
          res.elements.forEach((el: any) => {
            const marker = L.marker([el.lat, el.lon], {
              icon: this.supermarketIcon,
            })
              .addTo(this.map)
              .bindPopup(
                `<b>${
                  el.tags.name || this.translateService.instant('gimmicks.weather.supermarket')
                }</b><br><small>${this.translateService.instant('gimmicks.weather.supermarket')}</small>`
              );
            this.supermarketMarkers.push(marker);
          });
          console.log(`${res.elements.length} Supermärkte geladen`);
        }
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Supermärkte:', error);
        this.errorOccurred.emit(
          this.translateService.instant('gimmicks.weather.errorLoadingSupermarkets')
        );
      })
      .finally(() => {
        this.isLoadingSupermarkets = false;
      });
  }

  loadGasStations(): void {
    this.isLoadingGasStations = true;
    const radius = this.gasStationRadius || 500;
    const query = `[out:json][timeout:25];(node["amenity"="fuel"](around:${radius},${this.lat},${this.lng}););out body;`;

    this.queryOverpass(query)
      .then((res) => {
        if (res.elements) {
          res.elements.forEach((el: any) => {
            const marker = L.marker([el.lat, el.lon], {
              icon: this.gasStationIcon,
            })
              .addTo(this.map)
              .bindPopup(
                `<b>${
                  el.tags.name || this.translateService.instant('gimmicks.weather.gasStation')
                }</b><br><small>${this.translateService.instant('gimmicks.weather.gasStation')}</small>`
              );
            this.gasStationMarkers.push(marker);
          });
          console.log(`${res.elements.length} Tankstellen geladen`);
        }
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Tankstellen:', error);
        this.errorOccurred.emit(
          this.translateService.instant('gimmicks.weather.errorLoadingGasStations')
        );
      })
      .finally(() => {
        this.isLoadingGasStations = false;
      });
  }

  ngOnDestroy(): void {
    // Cleanup: Timer löschen
    if (this.restaurantDebounceTimer) {
      clearTimeout(this.restaurantDebounceTimer);
    }
    if (this.supermarketDebounceTimer) {
      clearTimeout(this.supermarketDebounceTimer);
    }
    if (this.gasStationDebounceTimer) {
      clearTimeout(this.gasStationDebounceTimer);
    }
  }
}
