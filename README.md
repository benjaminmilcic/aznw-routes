# AznwRoutes

This is the code of my personal homepage.

<p align="center">
  <strong>Visit my homepage here:</strong><br><br>
  <a href="https://benjamin-milcic.dev/" target="_blank">
    <img src="https://benjamin-milcic.dev/assets/homepage-image.png" width="300" alt="benjamin-milcic.dev" />
  </a>
  <br>
  <a href="https://benjamin-milcic.dev/" target="_blank">https://benjamin-milcic.dev</a>
</p>

The page is build with Angular.

The repository is public, because I made this website to demonstrate my skills.
The backend that is used by this website can be viewed here: [Backend repository for this frontend](https://github.com/benjaminmilcic/nest-aznw-api). It is also public.

If you have any hints or questions feel free to write me an email to [benjamin.milcic@gmail.com](mailto:benjamin.milcic@gmail.com).

## Serverkonfiguration (benjamin-milcic.dev)

Die App nutzt Pfad-Routing (kein `/#/` mehr). Jede Unterseite haengt damit am
SPA-Fallback des Webservers: Pfade ohne Dateiendung, die keiner echten Datei
entsprechen, muessen `index.html` ausliefern.

**Diese Einstellungen leben ausschliesslich im Apache-vHost**
(`/etc/apache2/sites-available/benjamin-milcic.dev.conf`), nicht im Repo:

- der SPA-Fallback (`RewriteRule ^ /index.html`),
- die Cache-Header (`no-store` fuer `index.html`, `immutable` nur fuer
  gehashte Bundles `\.[0-9a-fA-F]{8,}\.(js|css|mjs)$`).

Eine `.htaccess` im Build-Output waere wirkungslos, weil der `<Directory>`-Block
des vHosts `AllowOverride None` setzt. Frueher lag hier eine — sie wurde nie
gelesen und hat bei der Fehlersuche in die Irre gefuehrt.

Nicht gehashte Dateien unter `src/assets/` (z. B.
`assets/iframe-content/script.js`) duerfen **kein** `immutable` bekommen: sie
werden beim Deploy unter gleichem Namen ueberschrieben.

Pruefen, ob der Fallback steht - muss `200` liefern:

```
curl -o /dev/null -w '%{http_code}\n' https://benjamin-milcic.dev/gimmicks/map
```

Der Deploy-Workflow testet das seit der Umstellung selbst mit.

## Tests (Cypress)

Die Oberflaeche ist mit [Cypress](https://www.cypress.io/) getestet: Navigation,
Formulare, Anmeldung, Spiele, Diagramme und die SEO-Angaben. Die Tests laufen
gegen den Angular-Dev-Server auf Port 4200.

**Alles Externe ist abgeklemmt.** Vor jedem Test faengt
`cypress/support/e2e.ts` Schriften, Icon-Kits, das Google-Maps-Skript,
Kartenkacheln, die Besucherstatistik und jeden Aufruf der eigenen API ab.
Kein Testlauf verschickt eine Mail, legt einen Gaestebucheintrag an, verbraucht
ein API-Kontingent oder taucht in der Auswertung auf.

### Starten

Ein Befehl, egal ob gerade ein Dev-Server laeuft oder nicht:

```bash
npm run e2e
```

`npm run e2e` benutzt einen laufenden Server auf Port 4200 mit und laesst ihn
danach in Ruhe. Antwortet dort nichts, startet es selbst einen und beendet ihn
nach dem Durchlauf wieder. Damit kann nie ein zweiter `ng serve` daneben
stehen - zwei davon beschaedigen den Webpack-Cache in `.angular/cache` und der
Dev-Server liefert danach dauerhaft veraltete Bundles aus.

Zum Entwickeln der Tests das Cypress-Fenster:

```bash
npm start          # Terminal 1: Dev-Server
npm run cy:open    # Terminal 2: Cypress-Fenster
```

Im Fenster "E2E Testing" waehlen, Browser waehlen, Spec anklicken. Links laeuft
die Seite, rechts die Befehlsliste - jeder Schritt ist anklickbar und zeigt den
Zustand der Seite in genau diesem Moment. Beim Speichern einer Spec-Datei laeuft
sie sofort neu.

| Befehl | Wirkung |
| --- | --- |
| `npm run e2e` | alles, Server wird bei Bedarf selbst gestartet |
| `npm run e2e -- --spec "cypress/e2e/games/tiktaktoe.cy.ts"` | nur eine Datei |
| `npm run cy:open` | Cypress-Fenster, zum Entwickeln und Nachsehen |
| `npm run cy:run` | headless, setzt einen laufenden Server voraus |
| `npm run cy:component` | die Component-Tests (siehe Hinweis unten) |

Fehlgeschlagene Tests hinterlassen Screenshots in `cypress/screenshots`.

### Component Testing

Konfiguration und ein Beispiel (`cypress/component/rating-display.cy.ts`) liegen
bereit, laufen aber noch nicht: Cypress braucht dafuer
`@angular-devkit/build-angular`, das dieses Projekt nicht hat - gebaut wird mit
`@angular/build` und `@angular-builders/custom-webpack`.

```bash
npm i -D --legacy-peer-deps @angular-devkit/build-angular
```

Das Paket bringt eine eigene Webpack-Toolchain mit. Vor dem Einsatz einmal
`npm run build` pruefen, damit der Produktionsbau davon unberuehrt bleibt. Die
E2E-Tests brauchen es nicht.

### Aufbau

```
cypress/
  e2e/navigation/   Routing, 404, Navigationsleiste, Sprache, Suche, Responsivitaet
  e2e/forms/        Kontakt, Gaestebuch, Anmeldung, Rezepte, Filme
  e2e/games/        ein Kurztest je Spiel plus vier vollstaendig gespielte
  e2e/visual/       Karten, Diagramme, Kalender, Wetter, Bildgenerator
  e2e/seo/          Titel, Beschreibung, Canonical, Barrierefreiheit
  component/        Component-Tests einzelner Bausteine
  fixtures/         API-Antworten als JSON
  support/          eigene Befehle, Routenverzeichnis, API-Matcher
```

### Zwei Regeln beim Schreiben neuer Tests

**Elemente ueber `data-cy` ansprechen**, nicht ueber Tailwind-Klassen - die
aendern sich beim naechsten Redesign. Kurzform: `cy.byCy('login-submit')`.

**Bei Angular-Material-Feldern erst `focus()`, dann tippen**, wenn Cypress das
Feld als verdeckt meldet. Das Label eines leeren Feldes liegt ueber der
Eingabe, bis es den Fokus bekommt - bei langen Beschriftungen reicht es bis
ueber die Mitte, und genau dort prueft Cypress. `focus().type(..)` bildet den
Klick eines Besuchers nach und behaelt alle uebrigen Pruefungen; `force`
schaltet sie ab und verdeckt damit echte Fehler.

**Seiten mit `cy.visitApp()` oeffnen**, nicht mit `cy.visit()`. Der Befehl setzt
Sprache, angemeldeten Benutzer und einen festen Zufallsgenerator, bevor die
Anwendung startet - und wartet, bis der Ladebildschirm verschwunden ist:

```ts
cy.visitApp('/gimmicks/auth/main', { auth: true });        // angemeldet starten
cy.visitApp('/', { lang: 'en' });                          // englische Oberflaeche
cy.visitApp('/gimmicks/games/minesweeper', { randomSeed: 7 }); // fester Zufall
```

Fuer eigene API-Antworten `apiRoute()` aus `cypress/support/api.ts` benutzen.
Ein Muster wie `'**/guestbook'` wuerde sonst auch die SEITE
`/gimmicks/guestbook` treffen und den Seitenaufruf zerstoeren.

### Warum die Tests ueber `scripts/cypress.mjs` laufen

Das integrierte Terminal von VS Code setzt `ELECTRON_RUN_AS_NODE=1`. Erbt
Cypress diese Variable, laeuft sein Electron als reines Node und bricht mit
`bad option: --smoke-test` ab - ohne Hinweis auf die Ursache.

[`scripts/cypress.mjs`](scripts/cypress.mjs) entfernt die Variable und reicht
alle Argumente unveraendert weiter; alle `npm run cy:*`-Befehle gehen darueber.
Ein direkter Aufruf von `npx cypress run` in VS Code scheitert weiterhin - dann
vorher einmal `Remove-Item Env:ELECTRON_RUN_AS_NODE`.


<p align="center">
  <a href="https://angular.dev/" target="blank"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Angular_gradient_logo.png/960px-Angular_gradient_logo.png" width="120" alt="Angular Logo" /></a>
</p>
