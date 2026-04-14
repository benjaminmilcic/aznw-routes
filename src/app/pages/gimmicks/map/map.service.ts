import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  firstLoad = true;
  mapsReady = false;
}
