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
 * Until August 2026 the site ran with hash routing. Bookmarks, old
 * Google results and external links therefore have the form
 * https://benjamin-milcic.dev/#/gimmicks/map - without this rewrite
 * they would end up on the home page or, via the knownFragmentGuard, on
 * /404. Must run before the bootstrap.
 *
 * Deliberately history.replaceState instead of location.replace: the address is only
 * corrected in the browser, NO second request goes to the server. That
 * rules out a redirect loop, no matter what the server delivers for a
 * missing file - otherwise /#/kaputt.jpg could bounce back and forth between
 * the server 404 and this function.
 */
function rewriteLegacyHashUrl(): void {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) {
    return;
  }

  // With hash routing, query parameters could be before OR after the hash.
  // If the hash part already brings some, those apply.
  const path = hash.slice(1);
  const target = path.includes('?') ? path : path + window.location.search;

  window.history.replaceState(null, '', target);
}

// Before enableRtdbDebugFromUrl(), because that reads ?fbdebug from location.search.
rewriteLegacyHashUrl();

// Must run before the first database access (see rtdb-debug.ts).
enableRtdbDebugFromUrl();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
