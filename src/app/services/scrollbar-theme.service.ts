import { DOCUMENT, Injectable, inject } from '@angular/core';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Colors the scrollbars to match the current page.
 *
 * The color is set as `data: { scrollbar: '...' }` on the route (the deepest
 * route wins, children inherit from their parent) and ends up as
 * `data-scrollbar` on <html>. The color pairs themselves are in styles.scss.
 * Without a value the scrollbars stay at the browser default.
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
