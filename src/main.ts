import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { enableRtdbDebugFromUrl } from './app/pages/gimmicks/games/shared/firebase/rtdb-debug';
if (environment.production) {
  enableProdMode();
}

/**
 * Bis August 2026 lief die Seite mit Hash-Routing. Lesezeichen, alte
 * Google-Treffer und externe Links haben deshalb die Form
 * https://benjamin-milcic.dev/#/gimmicks/map - ohne diese Umschreibung
 * wuerden sie auf der Startseite bzw. ueber den knownFragmentGuard auf
 * /404 landen. Muss vor dem Bootstrap laufen.
 *
 * Bewusst history.replaceState statt location.replace: die Adresse wird nur
 * im Browser korrigiert, es geht KEIN zweiter Request an den Server. Damit
 * ist eine Umleitungsschleife ausgeschlossen, egal was der Server bei einer
 * fehlenden Datei ausliefert - andernfalls koennte /#/kaputt.jpg zwischen
 * Server-404 und dieser Funktion hin- und herpendeln.
 */
function rewriteLegacyHashUrl(): void {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) {
    return;
  }

  // Bei Hash-Routing konnten Query-Parameter vor ODER hinter dem Hash
  // stehen. Bringt der Hash-Teil schon welche mit, gelten die.
  const path = hash.slice(1);
  const target = path.includes('?') ? path : path + window.location.search;

  window.history.replaceState(null, '', target);
}

// Vor enableRtdbDebugFromUrl(), weil das ?fbdebug aus location.search liest.
rewriteLegacyHashUrl();

// Muss vor dem ersten Datenbankzugriff laufen (siehe rtdb-debug.ts).
enableRtdbDebugFromUrl();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
