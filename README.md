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

<p align="center">
  <a href="https://angular.dev/" target="blank"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Angular_gradient_logo.png/960px-Angular_gradient_logo.png" width="120" alt="Angular Logo" /></a>
</p>
