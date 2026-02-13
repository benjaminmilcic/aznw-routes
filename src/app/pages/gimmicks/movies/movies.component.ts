import { Component, signal, ViewChild, ViewChildren, ElementRef, AfterViewInit, QueryList, effect, HostListener } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, NavigationStart } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MoviesStateService } from './movies-state.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { CommonModule, Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-movies',
  imports: [RouterOutlet, FormsModule, MatIconModule, MatButtonModule, MatRippleModule, TranslateModule, CommonModule],
  templateUrl: './movies.component.html',
  styleUrl: './movies.component.scss',
})
export class MoviesComponent implements AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('tabScrollContainer') tabScrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('indicatorEl') indicatorEl!: ElementRef<HTMLElement>;
  @ViewChildren('tabItem') tabItems!: QueryList<ElementRef<HTMLElement>>;

  selectedTabIndex = signal(0);
  isDetailView = signal(false);
  indicatorLeft = signal(0);
  indicatorWidth = signal(0);
  indicatorReady = signal(false);
  needsScroll = signal(false);
  showLeftArrow = signal(false);
  showRightArrow = signal(false);
  private lastListRoute: string = '';

  constructor(
    private router: Router,
    private moviesStateService: MoviesStateService,
    private location: Location,
    private translateService: TranslateService
  ) {
    // Set initial tab based on current route
    this.updateTabIndex(this.router.url);

    // Update indicator when tab changes
    effect(() => {
      this.selectedTabIndex();
      // Delay to ensure DOM is ready
      setTimeout(() => this.updateIndicator(), 0);
    });

    // Listen to route changes
    this.router.events.subscribe((event) => {
      // Save scroll position BEFORE navigation starts
      if (event instanceof NavigationStart) {
        const url = event.url;
        // If navigating to detail view (movie or actor) from list, save scroll position and push to history
        if (url.includes('/movies/movie/') || url.includes('/movies/actor/')) {
          const currentRoute = this.router.url;
          // Only push to history if coming from a list view (not from another detail view)
          if (
            !currentRoute.includes('/movie/') &&
            !currentRoute.includes('/actor/')
          ) {
            this.saveScrollPosition(currentRoute);

            // Push the list route to history so we can navigate back to it
            this.moviesStateService.pushToHistory(currentRoute, window.scrollY, 'list');
          }
        }
      }

      // Update UI after navigation completes
      if (event instanceof NavigationEnd) {
        const url = event.url;
        this.updateTabIndex(url);

        // If navigating back to list view, restore scroll position
        if (
          !url.includes('/movies/movie/') &&
          !url.includes('/movies/actor/') &&
          this.lastListRoute
        ) {
          this.restoreScrollPosition();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.checkScrollArrows();
    this.tabItems.changes.subscribe(() => {
      this.updateIndicator();
      this.checkScrollArrows();
    });

    // If translations are already loaded (navigated from another page), show indicator immediately
    if (this.translateService.currentLang) {
      document.fonts.ready.then(() => {
        setTimeout(() => {
          this.updateIndicator(false);
          this.checkScrollArrows();
          this.indicatorReady.set(true);
        }, 0);
      });
    }

    // Show indicator after translations load (initial page load) + language changes
    this.translateService.onLangChange.subscribe(() => {
      document.fonts.ready.then(() => {
        setTimeout(() => {
          this.updateIndicator(false);
          this.checkScrollArrows();
          this.indicatorReady.set(true);
        }, 0);
      });
    });
  }

  private updateIndicator(smooth = true): void {
    const items = this.tabItems?.toArray();
    if (!items?.length) return;
    const index = this.selectedTabIndex();
    const el = items[index]?.nativeElement;
    if (el) {
      this.indicatorLeft.set(el.offsetLeft);
      this.indicatorWidth.set(el.offsetWidth);
      this.scrollTabIntoView(el, smooth);
      setTimeout(() => this.checkScrollArrows(), smooth ? 350 : 0);
    }
  }

  private scrollTabIntoView(el: HTMLElement, smooth: boolean): void {
    const container = this.tabScrollContainer?.nativeElement;
    if (!container) return;
    const elLeft = el.offsetLeft;
    const elRight = elLeft + el.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    let target = scrollLeft;
    if (elLeft < scrollLeft) {
      target = elLeft;
    } else if (elRight > scrollLeft + containerWidth) {
      target = elRight - containerWidth;
    }

    if (target !== scrollLeft) {
      container.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'instant' });
    }
  }

  private saveScrollPosition(routePath: string): void {
    const scrollPosition = window.scrollY;
    const state = this.moviesStateService.getState(routePath) || {
      pageIndex: 0,
      pageSize: 20,
      scrollPosition: 0,
    };
    state.scrollPosition = scrollPosition;
    this.moviesStateService.saveState(routePath, state);
    this.lastListRoute = routePath;
  }

  private restoreScrollPosition(): void {
    const routePath = this.router.url;
    const state = this.moviesStateService.getState(routePath);
    if (state) {
      setTimeout(() => {
        window.scrollTo(0, state.scrollPosition);
      }, 100);
    }
  }

  private updateTabIndex(url: string): void {
    // Check if we're in detail view (movie or actor)
    this.isDetailView.set(
      url.includes('/movies/movie/') || url.includes('/movies/actor/')
    );

    if (url.includes('/movies/popular')) {
      this.selectedTabIndex.set(0);
    } else if (url.includes('/movies/top-rated')) {
      this.selectedTabIndex.set(1);
    } else if (url.includes('/movies/now-playing')) {
      this.selectedTabIndex.set(2);
    } else if (url.includes('/movies/search')) {
      this.selectedTabIndex.set(3);
    }
    // For movie and actor detail views, we don't change the tab index
  }

  @HostListener('window:resize')
  onResize(): void {
    const el = this.indicatorEl?.nativeElement;
    if (el) {
      el.style.transition = 'none';
    }
    this.updateIndicator(false);
    this.checkScrollArrows();
    requestAnimationFrame(() => {
      if (el) {
        el.style.transition = '';
      }
    });
  }

  scrollTabs(direction: 'left' | 'right'): void {
    const container = this.tabScrollContainer?.nativeElement;
    if (!container) return;
    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }

  onTabScroll(): void {
    this.checkScrollArrows();
  }

  private checkScrollArrows(): void {
    const container = this.tabScrollContainer?.nativeElement;
    if (!container) return;
    const overflows = container.scrollWidth > container.clientWidth;
    this.needsScroll.set(overflows);
    this.showLeftArrow.set(overflows && container.scrollLeft > 0);
    this.showRightArrow.set(
      overflows && container.scrollLeft + container.clientWidth < container.scrollWidth - 1
    );
  }

  onTabChange(index: number): void {
    // Clear states when switching tabs to ensure fresh data
    if (index === 0) {
      this.moviesStateService.clearState('/gimmicks/movies/popular');
      this.router.navigate(['/gimmicks/movies/popular']);
    } else if (index === 1) {
      this.moviesStateService.clearState('/gimmicks/movies/top-rated');
      this.router.navigate(['/gimmicks/movies/top-rated']);
    } else if (index === 2) {
      this.moviesStateService.clearState('/gimmicks/movies/now-playing');
      this.router.navigate(['/gimmicks/movies/now-playing']);
    } else if (index === 3) {
      this.moviesStateService.clearState('/gimmicks/movies/search');
      this.router.navigate(['/gimmicks/movies/search']);
    }
  }

  onBackClick(): void {
    // This method is now handled by the movie-detail component
    // but kept for backwards compatibility if needed
    const historyEntry = this.moviesStateService.popFromHistory();
    if (historyEntry) {
      this.router.navigateByUrl(historyEntry.route).then(() => {
        // Restore scroll position after navigation
        setTimeout(() => {
          window.scrollTo(0, historyEntry.scrollPosition);
        }, 100);
      });
    } else {
      const currentRoute = this.moviesStateService.getCurrentRoute();
      if (currentRoute) {
        this.router.navigate([currentRoute]);
      } else {
        this.location.back();
      }
    }
  }
}
