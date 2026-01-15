import { Component, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, NavigationStart } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MoviesStateService } from './movies-state.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Location } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movies',
  imports: [RouterOutlet, MatTabsModule, FormsModule, MatIconModule, MatButtonModule, TranslateModule],
  templateUrl: './movies.component.html',
  styleUrl: './movies.component.scss',
})
export class MoviesComponent implements AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  selectedTabIndex = signal(0);
  isDetailView = signal(false);
  private lastListRoute: string = '';

  constructor(
    private router: Router,
    private moviesStateService: MoviesStateService,
    private location: Location
  ) {
    // Set initial tab based on current route
    this.updateTabIndex(this.router.url);

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
            const scrollPos = this.scrollContainer?.nativeElement.scrollTop || 0;
            this.moviesStateService.pushToHistory(currentRoute, scrollPos, 'list');
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
    // Component is ready
  }

  private saveScrollPosition(routePath: string): void {
    if (this.scrollContainer) {
      const scrollPosition = this.scrollContainer.nativeElement.scrollTop;
      const state = this.moviesStateService.getState(routePath) || {
        pageIndex: 0,
        pageSize: 20,
        scrollPosition: 0,
      };
      state.scrollPosition = scrollPosition;
      this.moviesStateService.saveState(routePath, state);
      this.lastListRoute = routePath;
    }
  }

  private restoreScrollPosition(): void {
    if (this.scrollContainer) {
      const routePath = this.router.url;
      const state = this.moviesStateService.getState(routePath);
      if (state) {
        setTimeout(() => {
          this.scrollContainer.nativeElement.scrollTop = state.scrollPosition;
        }, 100);
      }
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
          if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop = historyEntry.scrollPosition;
          }
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
