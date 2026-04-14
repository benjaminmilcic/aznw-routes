import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  firstLoad = true;
  mapsReady = false;
  setSearchCity$ = new Subject<string>();
  saveMapTypeId$ = new Subject<void>();
}
