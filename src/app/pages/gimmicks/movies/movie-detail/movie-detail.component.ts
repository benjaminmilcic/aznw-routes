import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MoviesService } from '../movies.service';
import { CountryWatchProviders, MovieDetail } from '../movies.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { RatingDisplayComponent } from '../movies-rating-display/movies-rating-display.component';
import { MatChipsModule } from '@angular/material/chips';
import { YouTubePlayer } from '@angular/youtube-player';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { Subscription } from 'rxjs';
import { MoviesStateService } from '../movies-state.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MoviesWatchProvidersComponent } from '../movies-watch-providers/movies-watch-providers.component';

@Component({
  selector: 'app-movie-detail',
  imports: [
    MatProgressSpinnerModule,
    CommonModule,
    RatingDisplayComponent,
    MatChipsModule,
    YouTubePlayer,
    MovieCardComponent,
    MatButtonModule,
    MatIconModule,
    MoviesWatchProvidersComponent,
    TranslateModule,
  ],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss',
})
export class MovieDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private activatedRoute: ActivatedRoute,
    private movieService: MoviesService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private moviesStateService: MoviesStateService,
    private translateService: TranslateService
  ) {}

  movie = signal<MovieDetail | null>(null);
  loading = signal(true);
  maxGenreDisplay = signal<number>(5);
  @ViewChild('youTubePlayer') youTubePlayer?: ElementRef<HTMLDivElement>;
  videoHeight: number | undefined;
  videoWidth: number | undefined;
  private routeSubscription?: Subscription;
  private currentMovieId: string = '';
  hasNavigationHistory = signal(false);
  private parentScrollContainer?: HTMLElement;
  langChangeSub: Subscription;
  watchProviders = signal<CountryWatchProviders | null>(null);

  ngOnInit(): void {
    // Subscribe to route parameter changes to reload movie when navigating between different movies
    this.routeSubscription = this.activatedRoute.paramMap.subscribe(
      (params) => {
        const id = params.get('id');
        if (id) {
          const isNavigatingBack =
            this.moviesStateService.isNavigatingBackward();

          this.currentMovieId = id;
          this.loadMovie(+id);

          // If navigating back, restore scroll position
          // Note: scrollToTop for similar movies is handled in loadMovie after content loads
          if (isNavigatingBack) {
            this.restoreScrollPosition(id);
            this.moviesStateService.setNavigatingBack(false);
          }
        }

        // Update navigation history indicator
        this.hasNavigationHistory.set(
          this.moviesStateService.getHistoryLength() > 0
        );
      }
    );
    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.loadMovie(+this.currentMovieId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private scrollToTop(): void {
    if (this.parentScrollContainer) {
      this.parentScrollContainer.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }

  private restoreScrollPosition(movieId: string): void {
    setTimeout(() => {
      if (this.parentScrollContainer) {
        const scrollPos =
          this.moviesStateService.getDetailScrollPosition(movieId);
        this.parentScrollContainer.scrollTop = scrollPos;
      }
    }, 100);
  }

  ngAfterViewInit(): void {
    this.onResize();
    window.addEventListener('resize', this.onResize.bind(this));

    // Find the parent scroll container from movies.component
    const headerElement = document.getElementById('movies-scroll-container');
    if (headerElement) {
      this.parentScrollContainer = headerElement;
    }
  }

  onResize(): void {
    // Check if youTubePlayer exists before accessing it
    if (!this.youTubePlayer?.nativeElement) {
      return;
    }

    this.videoWidth = this.youTubePlayer.nativeElement.clientWidth;

    // so you keep the ratio
    this.videoHeight = this.videoWidth * 0.6;
    this.changeDetectorRef.detectChanges();
  }

  loadMovie(id: number): void {
    this.loading.set(true);

    // Check if we should scroll to top after loading
    const shouldScrollToTop = this.moviesStateService.isNavigatingToSimilar();

    // Load movie details
    this.movieService.getMovieDetail(id).subscribe({
      next: (movie) => {
        this.movie.set(movie);
        this.loading.set(false);

        // Call onResize and scroll after view updates
        this.changeDetectorRef.detectChanges();

        setTimeout(() => {
          this.onResize();

          // Scroll to top if navigating to similar movie
          if (shouldScrollToTop) {
            if (this.parentScrollContainer) {
              this.parentScrollContainer.scrollTop = 0;
            }
            this.moviesStateService.setNavigatingToSimilarMovie(false);
          }
        }, 200);
      },
      error: (error) => {
        console.error('Error loading movie details:', error);
        this.loading.set(false);
      },
    });

    // Load watch providers
    this.movieService.getMovieWatchProviders(id).subscribe({
      next: (response) => {
        let countryCode = 'DE';
        switch (this.translateService.currentLang) {
          case 'de':
            countryCode = 'DE';
            break;
          case 'hr':
            countryCode = 'HR';
            break;

          default:
            countryCode = 'US';
            break;
        }
        this.watchProviders.set(response.results[countryCode] || null);
      },
      error: (error) => {
        console.error('Error loading watch providers:', error);
        this.watchProviders.set(null);
      },
    });
  }

  getBackdropUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'original');
  }

  getPosterUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w500');
  }

  formatRuntime(minutes: number | null): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  getDirector(): string {
    const movie = this.movie();
    if (!movie?.credits?.crew) return '';

    const director = movie.credits.crew.find((c) => c.job === 'Director');
    return director?.name || '';
  }

  formatBudget(budget: number): string {
    if (!budget) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(budget);
  }

  getTranslatedStatus(status: string): string {
    const key = `gimmicks.movies.movieStatus.${status}`;
    const translated = this.translateService.instant(key);
    return translated !== key ? translated : status;
  }

  getProfileUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'w185');
  }

  getTrailerKey(): string | null {
    const movie = this.movie();
    if (!movie?.videos?.results.length) return null;

    const trailer = movie.videos.results.find(
      (v) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    return trailer?.key || movie.videos.results[0]?.key || null;
  }

  onMovieCardClick() {
    // Get fresh reference to parent scroll container
    const container = document.getElementById('movies-scroll-container');

    if (container && this.currentMovieId) {
      const scrollPos = container.scrollTop;

      // Use the actual scroll position (could be from window or container)
      const actualScrollPos = Math.max(
        scrollPos,
        document.documentElement.scrollTop,
        window.scrollY
      );

      this.moviesStateService.saveDetailScrollPosition(
        this.currentMovieId,
        actualScrollPos
      );
      this.moviesStateService.pushToHistory(
        `/gimmicks/movies/movie/${this.currentMovieId}`,
        actualScrollPos,
        'movie-detail',
        +this.currentMovieId
      );
      this.hasNavigationHistory.set(true);

      // Set flag to indicate we're navigating to a similar movie
      this.moviesStateService.setNavigatingToSimilarMovie(true);
    }
  }

  onActorClick(actorId: number) {
    // Get fresh reference to parent scroll container
    const container = document.getElementById('movies-scroll-container');

    if (container && this.currentMovieId) {
      const scrollPos = container.scrollTop;

      // Use the actual scroll position (could be from window or container)
      const actualScrollPos = Math.max(
        scrollPos,
        document.documentElement.scrollTop,
        window.scrollY
      );

      this.moviesStateService.saveDetailScrollPosition(
        this.currentMovieId,
        actualScrollPos
      );
      this.moviesStateService.pushToHistory(
        `/gimmicks/movies/movie/${this.currentMovieId}`,
        actualScrollPos,
        'movie-detail',
        +this.currentMovieId
      );
      this.hasNavigationHistory.set(true);

      // Navigate to actor detail
      this.router.navigate(['/gimmicks/movies/actor', actorId]);
    }
  }

  onBackClick(): void {
    const historyEntry = this.moviesStateService.popFromHistory();
    if (historyEntry) {
      this.hasNavigationHistory.set(
        this.moviesStateService.getHistoryLength() > 0
      );

      // Set flag to indicate we are navigating back
      this.moviesStateService.setNavigatingBack(true);

      // Navigate to previous route
      this.router.navigateByUrl(historyEntry.route);
    } else {
      // No history, go back to list
      this.onOverviewClick();
    }
  }

  onOverviewClick(): void {
    // Clear all navigation history and scroll positions
    this.moviesStateService.clearHistory();
    this.moviesStateService.clearAllDetailScrollPositions();
    this.hasNavigationHistory.set(false);

    // Clear all list states (pagination and scroll positions)
    this.moviesStateService.clearState('/gimmicks/movies/popular');
    this.moviesStateService.clearState('/gimmicks/movies/top-rated');
    this.moviesStateService.clearState('/gimmicks/movies/now-playing');
    this.moviesStateService.clearState('/gimmicks/movies/search');

    // Always navigate to popular list when clicking overview
    this.router.navigate(['/gimmicks/movies/popular']);
  }
}
