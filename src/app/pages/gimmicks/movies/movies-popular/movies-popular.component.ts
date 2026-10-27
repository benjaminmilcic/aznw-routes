import { Component, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { Movie, MovieSearchResponse } from '../movies.model';
import { MoviesService } from '../movies.service';
import { catchError, forkJoin, Observable, of, Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MoviesStateService } from '../movies-state.service';
import { CustomPaginatorIntl } from '../custom-paginator-intl';

@Component({
  selector: 'app-movies-popular',
  imports: [
    MatProgressSpinnerModule,
    MovieCardComponent,
    MatPaginatorModule,
    MatIconModule,
    TranslateModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }],
  templateUrl: './movies-popular.component.html',
  styleUrl: './movies-popular.component.scss',
})
export class MoviesPopularComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  results = signal<Movie[]>([]);
  paginatedResults = signal<Movie[]>([]);
  loading = signal(false);
  pageSize = 20;
  pageIndex = 0;
  langChangeSub: Subscription;
  movieType: 'popular' | 'top-rated' | 'now-playing' = 'popular';

  constructor(
    private movieService: MoviesService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private moviesStateService: MoviesStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Determine which movies to load based on the route
    this.movieType = this.getMovieTypeFromSegments(this.route.snapshot.url);

    // Load data for initial route
    this.loadDataForRoute();

    // Listen to route changes to handle switching between popular, top-rated, and now-playing
    // This is needed because all routes use the same component
    this.route.url.subscribe((segments) => {
      const newMovieType = this.getMovieTypeFromSegments(segments);
      if (newMovieType !== this.movieType) {
        this.movieType = newMovieType;
        // Route changed between popular, top-rated, and now-playing
        // Only reload if we don't have saved state (which would mean user is coming from tab switch)
        const routePath = this.router.url;
        const savedState = this.moviesStateService.getState(routePath);

        if (!savedState) {
          // No saved state, load fresh data
          this.pageIndex = 0;
          this.results.set([]);
          this.paginatedResults.set([]);
          this.search();
        } else {
          // Has saved state, restore it (user came back from detail view)
          this.loadDataForRoute();
        }
      }
    });

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.pageIndex = 0;
      this.search();
    });
  }

  private loadDataForRoute(): void {
    // Get the route path to save/restore state
    const routePath = this.router.url;

    // Try to restore state
    const savedState = this.moviesStateService.getState(routePath);

    if (savedState && savedState.results) {
      // Restore from saved state
      this.pageIndex = savedState.pageIndex;
      this.pageSize = savedState.pageSize;
      this.results.set(savedState.results);
      this.updatePaginatedResults();
    } else {
      // No saved state, load fresh data
      this.search();
    }
  }

  onPageChange(event: PageEvent): void {
    const pageSizeChanged = event.pageSize !== this.pageSize;
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedResults();
    if (!pageSizeChanged) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get displayStart(): number {
    return this.pageIndex * this.pageSize + 1;
  }

  get displayEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.results().length);
  }

  updatePaginatedResults(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedResults.set(this.results().slice(startIndex, endIndex));
  }

  private getMovieTypeFromSegments(
    segments: { path: string }[]
  ): 'popular' | 'top-rated' | 'now-playing' {
    if (segments.some((segment) => segment.path === 'top-rated')) {
      return 'top-rated';
    } else if (segments.some((segment) => segment.path === 'now-playing')) {
      return 'now-playing';
    }
    return 'popular';
  }

  private getMovies(page: number): Observable<MovieSearchResponse> {
    switch (this.movieType) {
      case 'top-rated':
        return this.movieService.getTopRatedMovies(page);
      case 'now-playing':
        return this.movieService.getNowPlayingMovies(page);
      default:
        return this.movieService.getPopularMovies(page);
    }
  }

  search(): void {
    this.loading.set(true);
    // Load the first page to get total_pages
    this.getMovies(1).subscribe({
      next: (firstResponse) => {
        const totalPages = firstResponse.total_pages;
        // Load at most 20 pages to avoid rate limiting
        const maxPages = Math.min(totalPages, 20);

        // <= instead of ===: for an empty result the API reports
        // total_pages: 0. With === this case would run into the else branch, where
        // the list of follow-up requests would stay empty, and forkJoin([])
        // completes without ever delivering a value - loading would stay
        // true forever and the page would spin the loading circle endlessly.
        if (maxPages <= 1) {
          // Only one page available (or no result at all)
          this.results.set(firstResponse.results);
          this.pageIndex = 0;
          this.updatePaginatedResults();
          this.loading.set(false);
        } else {
          // Several pages: load all further pages in parallel
          const pageRequests = [];
          for (let page = 2; page <= maxPages; page++) {
            // Wrap every request with catchError to return empty results on errors
            pageRequests.push(
              this.getMovies(page).pipe(
                catchError((error) => {
                  console.error(`Error loading page ${page}:`, error);
                  // Return an empty response so that forkJoin does not fail completely
                  return of({
                    page,
                    results: [],
                    total_pages: 0,
                    total_results: 0,
                  });
                })
              )
            );
          }

          forkJoin(pageRequests).subscribe({
            next: (responses) => {
              // Combine all results (only successful ones)
              const allMovies = [
                ...firstResponse.results,
                ...responses.flatMap((r) => r.results),
              ];
              this.results.set(allMovies);
              this.pageIndex = 0;
              this.updatePaginatedResults();
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error loading additional pages:', error);
              // On error at least show the first page
              this.results.set(firstResponse.results);
              this.pageIndex = 0;
              this.updatePaginatedResults();
              this.loading.set(false);
            },
          });
        }
      },
      error: (error) => {
        console.error('Error:', error);
        this.loading.set(false);
      },
    });
  }

  onMovieCardClick(): void {
    // Save pagination and results before navigating to detail view
    const routePath = this.router.url;

    this.moviesStateService.saveState(routePath, {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      scrollPosition: 0, // Will be updated by parent component
      results: this.results(),
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
  }
}
