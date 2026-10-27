import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { SEO_ROUTES, SeoRoute } from './seo-routes';

/**
 * Sets title, description and canonical address to match the current route.
 *
 * Before switching to path routing only the home page was reachable via search,
 * so a global title was enough. Now that all subpages have their own
 * addresses, they would otherwise be treated as duplicates.
 *
 * Without SSR this only works for visitors who run JavaScript - the
 * Googlebot does, the link previews of messengers usually don't.
 * For those the static head from index.html still applies.
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

  /** Last visited path, so that a language change can apply it again. */
  private aktuellerPfad = '/';

  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.aktuellerPfad = this.pfadAusUrl(e.urlAfterRedirects);
        this.anwenden();
      });

    // Without this the title would stay in the language in which the page
    // was loaded - the bug doesn't show on the first load.
    this.translate.onLangChange.subscribe(() => this.anwenden());

    this.anwenden();
  }

  /**
   * Reduces a router URL to the plain path: without query, without fragment
   * and without named outlets like /(print:print/29.8.2026).
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

    // If the translation is missing, ngx-translate returns the key.
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
