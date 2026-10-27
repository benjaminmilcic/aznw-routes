import { DOCUMENT, Injectable, inject } from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Faerbt die Scrollbalken passend zur aktuellen Seite.
 *
 * Die Farbe steht als `data: { scrollbar: '...' }` an der Route (die tiefste
 * Route gewinnt, Kinder erben vom Elternteil) und landet als
 * `data-scrollbar` am <html>. Die Farbpaare selbst stehen in styles.scss.
 * Ohne Angabe bleiben die Scrollbalken im Browser-Standard.
 */
@Injectable({ providedIn: 'root' })
export class ScrollbarThemeService {
  private router = inject(Router);
  private document = inject(DOCUMENT);

  init(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        let route = this.router.routerState.snapshot.root;
        let theme: string | undefined;
        while (route) {
          theme = route.data['scrollbar'] ?? theme;
          route = route.children.find((child) => child.outlet === PRIMARY_OUTLET)!;
        }

        const html = this.document.documentElement;
        if (theme) {
          html.dataset['scrollbar'] = theme;
        } else {
          delete html.dataset['scrollbar'];
        }
      });
  }
}
