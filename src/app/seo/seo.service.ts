import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { SEO_ROUTES, SeoRoute } from './seo-routes';

/**
 * Setzt Titel, Beschreibung und Canonical-Adresse passend zur aktuellen Route.
 *
 * Vor der Umstellung auf Pfad-Routing war nur die Startseite ueber die Suche
 * erreichbar, ein globaler Titel reichte also. Seit alle Unterseiten eigene
 * Adressen haben, wuerden sie sonst als Dubletten gewertet.
 *
 * Ohne SSR wirkt das nur bei Besuchern, die JavaScript ausfuehren - der
 * Googlebot tut das, die Linkvorschauen von Messengern in der Regel nicht.
 * Fuer die gilt weiterhin der statische Kopf aus index.html.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly standardTitel = 'Benjamin Milčić - Full Stack Web Developer';
  private readonly domain = 'https://benjamin-milcic.dev';

  /** Zuletzt aufgerufener Pfad, damit ein Sprachwechsel ihn erneut anwenden kann. */
  private aktuellerPfad = '/';

  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.aktuellerPfad = this.pfadAusUrl(e.urlAfterRedirects);
        this.anwenden();
      });

    // Ohne das bliebe der Titel in der Sprache stehen, in der die Seite
    // geladen wurde - der Fehler faellt beim ersten Laden nicht auf.
    this.translate.onLangChange.subscribe(() => this.anwenden());

    this.anwenden();
  }

  /**
   * Reduziert eine Router-URL auf den reinen Pfad: ohne Query, ohne Fragment
   * und ohne benannte Outlets wie /(print:print/29.8.2026).
   */
  private pfadAusUrl(url: string): string {
    const pfad = url.split('?')[0].split('#')[0].split('(')[0];
    if (pfad.length > 1 && pfad.endsWith('/')) {
      return pfad.slice(0, -1);
    }
    return pfad || '/';
  }

  private anwenden(): void {
    const eintrag = SEO_ROUTES.find((r) => r.path === this.aktuellerPfad);

    this.title.setTitle(this.titelFuer(eintrag));

    const beschreibung = this.translate.instant(
      'seo.description.' + (eintrag?.descriptionKey ?? 'home'),
    );
    this.meta.updateTag({ name: 'description', content: beschreibung });
    this.meta.updateTag({ property: 'og:title', content: this.titelFuer(eintrag) });
    this.meta.updateTag({ property: 'og:description', content: beschreibung });
    this.meta.updateTag({ property: 'og:url', content: this.domain + this.aktuellerPfad });

    this.canonicalSetzen(this.domain + this.aktuellerPfad);
    this.document.documentElement.lang = this.translate.currentLang || 'de';
  }

  private titelFuer(eintrag?: SeoRoute): string {
    if (!eintrag || eintrag.path === '/') {
      return this.standardTitel;
    }

    const name = eintrag.titleKey
      ? this.translate.instant(eintrag.titleKey)
      : eintrag.title;

    // Fehlt die Uebersetzung, liefert ngx-translate den Schluessel zurueck.
    if (!name || name === eintrag.titleKey) {
      return this.standardTitel;
    }

    return `${name} · ${this.translate.instant('seo.titleSuffix')}`;
  }

  private canonicalSetzen(adresse: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', adresse);
  }
}
