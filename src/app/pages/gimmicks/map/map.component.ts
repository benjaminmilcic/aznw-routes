import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  Injector,
  OnInit,
  ViewChild,
} from '@angular/core';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ResizableModule, ResizeEvent } from 'angular-resizable-element';
import LatLng = google.maps.LatLng;
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonLabel,
  IonItem,
  IonIcon,
  IonButton,
  IonCheckbox,
  IonInput,
} from '@ionic/angular/standalone';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { City, CityInfo, MapDimension } from './map.models';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { FilterButtonComponent } from './filter-button/filter-button.component';
import {
  createCustomElement,
  NgElement,
  WithProperties,
} from '@angular/elements';
import { SearchFieldComponent } from './search-field/search-field.component';
import { MapService } from './map.service';

@Component({
    selector: 'app-map',
    imports: [
        GoogleMapsModule,
        CommonModule,
        ResizableModule,
        FormsModule,
        IonLabel,
        IonItem,
        IonIcon,
        IonButton,
        IonCheckbox,
        IonInput,
        MatTableModule,
        MatPaginatorModule,
        CdkDrag,
        CdkDragHandle,
        MatSortModule,
        MatAutocompleteModule,
        MatInputModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        AsyncPipe,
        MatTooltipModule,
        TranslateModule,
        FilterButtonComponent,
        SearchFieldComponent,
    ],
    templateUrl: './map.component.html',
    styleUrl: './map.component.css'
})
export class MapComponent implements OnInit, AfterViewInit {
  style: { width: string; height: string };

  @ViewChild(GoogleMap) googleMap: GoogleMap;
  map: google.maps.Map;

  mapOptions: google.maps.MapOptions = {
    fullscreenControlOptions: {
      position: google.maps.ControlPosition.BOTTOM_RIGHT,
    },
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
    streetViewControl: false,
  };

  showFilter: boolean = false;

  federalStatesGeoJson: any;

  badenWuerttemberg = false;
  bavaria = false;
  berlin = false;
  brandenburg = false;
  bremen = false;
  hamburg = false;
  hesse = false;
  mecklenburgWesternPomerania = false;
  lowerSaxony = false;
  northrhineWestphalia = false;
  rhinelandPalatinate = false;
  saarland = false;
  saxony = false;
  saxonyAnhalt = false;
  schleswigHolstein = false;
  thuringia = false;

  bounds!: google.maps.LatLngBounds;

  federalStatePolygons: google.maps.Polygon[] = [];
  federalStatesToShow: number[] = [];
  allFederalStates: boolean[] = [];

  icon: google.maps.Icon = {
    url: '/assets/red2.png',
    scaledSize: new google.maps.Size(6, 6),
  };

  cities: City[] = [];
  citiesFiltered: City[] = [];
  markers: google.maps.Marker[] = [];

  minPopulation = 50000;
  maxPopulation = 3800000;

  showCityInfo = false;
  cityInfo: CityInfo = {
    federalState: '',
    link: '',
    name: '',
    population: null,
  };

  columnsToDisplay = ['rang', 'name', 'population', 'federalStateName', 'link'];
  dataSource: MatTableDataSource<City>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    let dimension: MapDimension;
    if (localStorage.getItem('mapDimension')) {
      dimension = JSON.parse(localStorage.getItem('mapDimension'));
    } else {
      dimension.width = window.innerWidth;
      dimension.height = window.innerHeight - 40;
    }

    if (event.target.innerWidth < 1280) {
      this.style = {
        width: '100%',
        height: `${dimension.height}px`,
      };
      localStorage.setItem(
        'mapDimension',
        JSON.stringify({
          width: event.target.innerWidth,
          height: dimension.height,
        })
      );
    } else {
      this.style = {
        width: '100%',
        height: 'calc(100vh - 40px)',
      };
    }
  }

  selectedCity = new FormControl('');
  cityOptions: string[];
  selectedCityOptions: Observable<string[]>;

  constructor(
    private cdr: ChangeDetectorRef,
    injector: Injector,
    private mapService: MapService
  ) {
    if (this.mapService.firstLoad) {
      const FilterButtonElement = createCustomElement(FilterButtonComponent, {
        injector,
      });
      customElements.define('filter-button-element', FilterButtonElement);
      const SearchFieldElement = createCustomElement(SearchFieldComponent, {
        injector,
      });
      customElements.define('search-field-element', SearchFieldElement);
      mapService.firstLoad = false;
    }
  }

  async ngOnInit() {
    this.setMapDimension();
    await this.getData();
    this.zoomToGermany();
    this.changeMarkersAndTable([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    await fetch('/assets/json/bundeslaender.geo.json')
      .then((response) => response.json())
      .then((json) => {
        this.federalStatesGeoJson = json;
      });

    this.cityOptions = this.cities.map((city) => {
      return city.name;
    });
    this.selectedCityOptions = this.selectedCity.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || ''))
    );
  }

  async ngAfterViewInit() {
    this.map = this.googleMap.googleMap;
    this.addCustomMapControls();
    this.mapService.firstLoad = false;
    this.cdr.detectChanges();
  }

  addCustomMapControls() {
    const searchFieldEl: NgElement & WithProperties<SearchFieldComponent> =
      document.createElement('search-field-element') as any;
    searchFieldEl.addEventListener('selected', (city: any) =>
      this.selectCity(city.detail)
    );
    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(searchFieldEl);

    const filterButtonEl: NgElement & WithProperties<FilterButtonComponent> =
      document.createElement('filter-button-element') as any;
    filterButtonEl.addEventListener(
      'toggle',
      () => (this.showFilter = !this.showFilter)
    );
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
      filterButtonEl
    );
  }

  private setMapDimension() {
    let dimension: MapDimension = {
      width: null,
      height: null,
    };

    if (localStorage.getItem('mapDimension')) {
      dimension = JSON.parse(localStorage.getItem('mapDimension'));
    } else {
      dimension.width = window.innerWidth;
      dimension.height = window.innerHeight / 2;
    }

    if (window.innerWidth < 1280) {
      this.style = {
        width: `100%`,
        height: `${dimension.height}px`,
      };
    } else {
      this.style = {
        width: `100%`,
        height: 'calc(100vh - 40px)',
      };
    }
  }

  private async getData() {
    await fetch('/assets/json/cities.json')
      .then((response) => response.json())
      .then((json) => {
        this.cities = json;
      });
    this.dataSource = new MatTableDataSource<City>(this.cities);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  changeMarkersAndTable(federalStateIndices: number[]) {
    this.filterTableData();
    this.setMarkers(federalStateIndices);
  }

  async setMarkers(federalStateIndices: number[]) {
    if (federalStateIndices.length === 0) {
      federalStateIndices = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ];
    }
    if (this.markers.length > 0) {
      this.markers.forEach((marker) => {
        marker.setMap(null);
      });
      this.markers = [];
    }
    let markerLatLng: LatLng;

    let citiesFiltered = this.cities.filter((city) => {
      return (
        federalStateIndices.includes(city.federalStateIndex) &&
        city.population > this.minPopulation &&
        city.population < this.maxPopulation
      );
    });

    citiesFiltered.forEach(async (city) => {
      markerLatLng = city.location;
      let marker = new google.maps.Marker({
        position: markerLatLng,
        map: this.map,
        icon: this.icon,
      });
      marker.addListener('click', (event) => {
        this.showCityInfo = true;
        this.cityInfo = {
          name: city.name,
          population: city.population,
          federalState: city.federalStateName,
          link: city.link,
        };
        this.cdr.detectChanges();
      });
      this.markers.push(marker);
    });
  }

  onResizeEnd(event: ResizeEvent): void {
    this.style = {
      width: `${event.rectangle.width}px`,
      height: `${event.rectangle.height}px`,
    };
    this.cdr.detectChanges();
    localStorage.setItem(
      'mapDimension',
      JSON.stringify({
        width: event.rectangle.width,
        height: event.rectangle.height,
      })
    );
  }

  async drawFederalStates() {
    this.federalStatePolygons.forEach((federalStatePolygon) => {
      federalStatePolygon.setMap(null);
    });
    this.federalStatePolygons = [];
    let polygons: any[] = [];
    const bounds = new google.maps.LatLngBounds();

    this.federalStatesToShow.forEach((federalState) => {
      if ([1, 3, 5, 7, 8, 9, 10, 11, 12, 14].includes(federalState)) {
        this.federalStatesGeoJson['features'][federalState]['geometry'][
          'coordinates'
        ].forEach((coords: any) => {
          coords.forEach((coords2: any) => {
            let polygon: { lat: number; lng: number }[] = [];
            coords2.forEach((element: any) => {
              polygon.push({ lat: element[1], lng: element[0] });
            });
            const polygonField = new google.maps.Polygon({
              map: this.map,
              paths: polygon,
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillOpacity: 0,
            });
            polygons.push(polygon);
            this.federalStatePolygons.push(polygonField);
          });
        });
      } else {
        this.federalStatesGeoJson['features'][federalState]['geometry'][
          'coordinates'
        ].forEach((coords: any) => {
          let polygon: { lat: number; lng: number }[] = [];
          coords.forEach((element: any) => {
            polygon.push({ lat: element[1], lng: element[0] });
          });
          const polygonField = new google.maps.Polygon({
            map: this.map,
            paths: polygon,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillOpacity: 0,
          });
          polygons.push(polygon);
          this.federalStatePolygons.push(polygonField);
        });
      }
    });

    const pat: LatLng[] = [];
    polygons.forEach((polygon) => {
      polygon.forEach((arr: any) =>
        pat.push(new google.maps.LatLng(+arr.lat, +arr.lng))
      );

      pat.forEach((a) => {
        bounds.extend(a);
      });
    });

    this.map?.panToBounds(bounds);
    this.map?.fitBounds(bounds);
  }

  selectFederalStates() {
    this.allFederalStates = [
      this.badenWuerttemberg,
      this.bavaria,
      this.berlin,
      this.brandenburg,
      this.bremen,
      this.hamburg,
      this.hesse,
      this.mecklenburgWesternPomerania,
      this.lowerSaxony,
      this.northrhineWestphalia,
      this.rhinelandPalatinate,
      this.saarland,
      this.saxony,
      this.saxonyAnhalt,
      this.schleswigHolstein,
      this.thuringia,
    ];
    this.federalStatesToShow = [];
    if (this.berlin) {
      this.federalStatesToShow.push(0);
    }
    if (this.saxonyAnhalt) {
      this.federalStatesToShow.push(1);
    }
    if (this.rhinelandPalatinate) {
      this.federalStatesToShow.push(2);
    }
    if (this.mecklenburgWesternPomerania) {
      this.federalStatesToShow.push(3);
    }
    if (this.thuringia) {
      this.federalStatesToShow.push(4);
    }
    if (this.hesse) {
      this.federalStatesToShow.push(5);
    }
    if (this.saarland) {
      this.federalStatesToShow.push(6);
    }
    if (this.lowerSaxony) {
      this.federalStatesToShow.push(7);
    }
    if (this.northrhineWestphalia) {
      this.federalStatesToShow.push(8);
    }
    if (this.brandenburg) {
      this.federalStatesToShow.push(9);
    }
    if (this.hamburg) {
      this.federalStatesToShow.push(10);
    }
    if (this.bremen) {
      this.federalStatesToShow.push(11);
    }
    if (this.badenWuerttemberg) {
      this.federalStatesToShow.push(12);
    }
    if (this.saxony) {
      this.federalStatesToShow.push(13);
    }
    if (this.schleswigHolstein) {
      this.federalStatesToShow.push(14);
    }
    if (this.bavaria) {
      this.federalStatesToShow.push(15);
    }
    if (this.allFederalStates.every((v) => v === false)) {
      this.federalStatePolygons.forEach((federalStatePolygon) => {
        federalStatePolygon.setMap(null);
      });
      this.federalStatePolygons = [];

      this.zoomToGermany();
    } else {
      this.drawFederalStates();
    }
    this.changeMarkersAndTable(this.federalStatesToShow);
  }

  openWikipedia(link: string) {
    window.open('https://de.wikipedia.org' + link, '_blank');
  }

  private async zoomToGermany() {
    let geocoder = new google.maps.Geocoder();
    let bounds;
    await geocoder.geocode(
      {
        placeId: 'ChIJa76xwh5ymkcRW-WRjmtd6HU',
      },
      (results, status) => {
        bounds = results[0].geometry.viewport;
      }
    );

    this.map?.panToBounds(bounds);
    this.map?.fitBounds(bounds);
  }
  mapToSmall(size: number): boolean {
    if (this.style.height === '50vh') {
      return false;
    } else if (
      +this.style.height.slice(0, -2) > size ||
      this.style.height === 'calc(100vh - 40px)' ||
      this.style.height === 'nullpx'
    ) {
      return false;
    } else {
      return true;
    }
  }

  filterTableData(onlyCity: string = '') {
    this.citiesFiltered = this.cities.filter((city) => {
      if (onlyCity != '') {
        let onlyCityFederalStateIndex = this.cities.filter((city2) => {
          return city2.name === onlyCity;
        })[0].federalStateIndex;
        return [onlyCityFederalStateIndex].includes(city.federalStateIndex);
      } else if (this.federalStatesToShow.length === 0) {
        return (
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(
            city.federalStateIndex
          ) &&
          city.population > this.minPopulation &&
          city.population < this.maxPopulation
        );
      } else {
        return (
          this.federalStatesToShow.includes(city.federalStateIndex) &&
          city.population > this.minPopulation &&
          city.population < this.maxPopulation
        );
      }
    });
    this.dataSource = new MatTableDataSource<City>(this.citiesFiltered);
    if (onlyCity != '') {
      const onlyCityIndex = this.dataSource.data
        .map((city) => {
          return city.name;
        })
        .indexOf(onlyCity);
      const pageNumber = Math.floor(onlyCityIndex / this.paginator.pageSize);
      this.paginator.pageIndex = pageNumber;
    } else {
      this.paginator.firstPage();
    }
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.cityOptions
      .filter((option) => option.toLowerCase().includes(filterValue))
      .slice(0, 20);
  }

  async selectCity(cityName: string) {
    let geocoder = new google.maps.Geocoder();
    let bounds = new google.maps.LatLngBounds();
    await geocoder.geocode(
      {
        address: cityName + ', Germany',
      },
      (results, status) => {
        bounds = results[0].geometry.viewport;
      }
    );

    const selectedCity = this.cities.filter((city) => {
      return city.name === cityName;
    })[0];

    this.cityInfo = {
      name: selectedCity.name,
      population: selectedCity.population,
      federalState: selectedCity.federalStateName,
      link: selectedCity.link,
    };

    this.showCityInfo = true;

    this.map?.panToBounds(bounds);
    this.map?.fitBounds(bounds);
    this.filterTableData(cityName);
  }

  // createButton() {
  //   const controlI = document.createElement('i');
  //   controlI.classList.add('fa-solid', 'fa-eye');
  //   const controlButton = document.createElement('button');
  //   controlButton.appendChild(controlI);
  //   controlButton.setAttribute('matTooltip', 'Filter');
  //   controlButton.classList.add(
  //     'bg-blue-500',
  //     'text-black',
  //     'rounded-lg',
  //     'w-10',
  //     'h-10',
  //     'flex',
  //     'justify-center',
  //     'place-items-center',
  //     'cursor-pointer'
  //   );
  //   controlButton.addEventListener('click', () => {
  //     this.showFilter = !this.showFilter;
  //   });
  //   const controlDiv = document.createElement('div');
  //   controlDiv.appendChild(controlButton);
  //   return controlDiv;
  // }
}
