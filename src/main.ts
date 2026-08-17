import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { enableRtdbDebugFromUrl } from './app/pages/gimmicks/games/shared/firebase/rtdb-debug';
if (environment.production) {
  enableProdMode();
}

// Muss vor dem ersten Datenbankzugriff laufen (siehe rtdb-debug.ts).
enableRtdbDebugFromUrl();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
