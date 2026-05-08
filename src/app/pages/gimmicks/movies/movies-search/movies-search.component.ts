import { Component, signal, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CustomPaginatorIntl } from '../custom-paginator-intl';
import { Movie } from '../movies.model';
import { MoviesService } from '../movies.service';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, Subscription } from 'rxjs';
import { MoviesStateService } from '../movies-state.service';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movies-search',
  imports: [
    MatFormFieldModule,
    MatIconModule,
    ReactiveFormsModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MovieCardComponent,
    MatPaginatorModule,
    TranslateModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }],
  templateUrl: './movies-search.component.html',
  styleUrl: './movies-search.component.scss',
})
export class MoviesSearchComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchControl = new FormControl('');
  results = signal<Movie[]>([]);
  paginatedResults = signal<Movie[]>([]);
  loading = signal(false);
  pageSize = 20;
  pageIndex = 0;
  private searchSubscription?: Subscription;

  constructor(
    private movieService: MoviesService,
    private moviesStateService: MoviesStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load data for initial route
    this.loadDataForRoute();

    // Set up search subscription
    this.searchSubscription = this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        if (query && query.length > 2) {
          this.search(query);
        } else {
          this.results.set([]);
          this.paginatedResults.set([]);
        }
      });
  }

  private loadDataForRoute(): void {
    // Get the route path to save/restore state
    const routePath = this.router.url;

    // Try to restore state
    const savedState = this.moviesStateService.getState(routePath);

    if (savedState && savedState.searchQuery) {
      // Restore from saved state
      this.pageIndex = savedState.pageIndex;
      this.pageSize = savedState.pageSize;
      this.searchControl.setValue(savedState.searchQuery, { emitEvent: false });

      if (savedState.results) {
        this.results.set(savedState.results);
        this.updatePaginatedResults();
      }
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

  search(query: string): void {
    this.loading.set(true);
    // Erste Seite laden um total_pages zu erhalten
    this.movieService.searchMovies(query, 1).subscribe({
      next: (firstResponse) => {
        const totalPages = firstResponse.total_pages;
        // Maximal 20 Seiten laden, um Rate Limiting zu vermeiden
        const maxPages = Math.min(totalPages, 20);

        if (maxPages === 1) {
          // Nur eine Seite vorhanden
          this.results.set(firstResponse.results);
          this.pageIndex = 0;
          this.updatePaginatedResults();
          this.loading.set(false);
        } else {
          // Mehrere Seiten: alle weiteren Seiten parallel laden
          const pageRequests = [];
          for (let page = 2; page <= maxPages; page++) {
            // Jeden Request mit catchError wrappen, um bei Fehlern leere Ergebnisse zurückzugeben
            pageRequests.push(
              this.movieService.searchMovies(query, page).pipe(
                catchError((error) => {
                  console.error(`Error loading page ${page}:`, error);
                  // Leere Response zurückgeben, damit forkJoin nicht komplett fehlschlägt
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
              // Alle Ergebnisse kombinieren (nur erfolgreiche)
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
              // Bei Fehler zumindest die erste Seite anzeigen
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
    // Save pagination, search query and results before navigating to detail view
    const routePath = this.router.url;

    this.moviesStateService.saveState(routePath, {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      scrollPosition: 0, // Will be updated by parent component
      searchQuery: this.searchControl.value || undefined,
      results: this.results(),
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
