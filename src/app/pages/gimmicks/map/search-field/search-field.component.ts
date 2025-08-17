import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { map, Observable, startWith } from 'rxjs';
import { City } from '../map.models';

@Component({
    selector: 'app-search-field',
    imports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatOptionModule,
        AsyncPipe,
    ],
    templateUrl: './search-field.component.html',
    styleUrl: './search-field.component.css'
})
export class SearchFieldComponent implements OnInit {
  selectedCity = new FormControl('');
  selectedCityOptions: Observable<string[]>;
  cityOptions: string[];
  cities: City[] = [];
  @Output() selected = new EventEmitter<string>();

  async ngOnInit() {
    await fetch('/assets/json/cities.json')
      .then((response) => response.json())
      .then((json) => {
        this.cities = json;
      });
    this.cityOptions = this.cities.map((city) => {
      return city.name;
    });
    this.selectedCityOptions = this.selectedCity.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || ''))
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.cityOptions
      .filter((option) => option.toLowerCase().includes(filterValue))
      .slice(0, 20);
  }
}
