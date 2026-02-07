import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MoviesService } from '../movies.service';
import { PersonDetail, PersonMovieCredit } from '../movies.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MovieCardComponent } from '../movie-card/movie-card.component';
import { Subscription } from 'rxjs';
import { MoviesStateService } from '../movies-state.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

export type FilmographySortOption = 'year' | 'rating' | 'title' | 'popularity';

@Component({
  selector: 'app-actor-detail',
  imports: [
    MatProgressSpinnerModule,
    CommonModule,
    MovieCardComponent,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './actor-detail.component.html',
  styleUrl: './actor-detail.component.scss',
})
export class ActorDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private activatedRoute: ActivatedRoute,
    private movieService: MoviesService,
    private router: Router,
    private moviesStateService: MoviesStateService,
    private translateService: TranslateService
  ) {}

  actor = signal<PersonDetail | null>(null);
  loading = signal(true);
  private routeSubscription?: Subscription;
  private currentActorId: string = '';
  hasNavigationHistory = signal(false);
  private parentScrollContainer?: HTMLElement;
  langChangeSub?: Subscription;
  visibleFilmCount = signal(10);
  sortOption = signal<FilmographySortOption>('popularity');
  readonly sortOptions: FilmographySortOption[] = ['year', 'rating', 'title', 'popularity'];

  ngOnInit(): void {
    this.routeSubscription = this.activatedRoute.paramMap.subscribe(
      (params) => {
        const id = params.get('id');
        if (id) {
          const isNavigatingBack =
            this.moviesStateService.isNavigatingBackward();

          this.currentActorId = id;
          this.loadActor(+id);

          if (isNavigatingBack) {
            this.restoreScrollPosition(id);
            this.moviesStateService.setNavigatingBack(false);
          } else {
            // Scroll to top when navigating to new actor
            this.scrollToTop();
          }
        }

        this.hasNavigationHistory.set(
          this.moviesStateService.getHistoryLength() > 0
        );
      }
    );

    this.langChangeSub = this.translateService.onLangChange.subscribe(() => {
      this.loadActor(+this.currentActorId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.langChangeSub?.unsubscribe();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  }

  private restoreScrollPosition(actorId: string): void {
    setTimeout(() => {
      const scrollPos =
        this.moviesStateService.getActorScrollPosition(actorId);
      window.scrollTo(0, scrollPos);
    }, 100);
  }

  ngAfterViewInit(): void {
    const headerElement = document.getElementById('movies-scroll-container');
    if (headerElement) {
      this.parentScrollContainer = headerElement;
    }
  }

  loadActor(id: number): void {
    this.loading.set(true);
    this.visibleFilmCount.set(10);

    this.movieService.getActorDetail(id).subscribe({
      next: (actor) => {
        this.actor.set(actor);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading actor details:', error);
        this.loading.set(false);
      },
    });
  }

  getProfileUrl(path: string | null): string {
    return this.movieService.getImageUrl(path, 'h632');
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString(this.translateService.currentLang);
  }

  calculateAge(birthday: string | null, deathday: string | null): number | null {
    if (!birthday) return null;

    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();

    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && endDate.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  getTranslatedDepartment(department: string): string {
    const key = `gimmicks.movies.department.${department}`;
    const translated = this.translateService.instant(key);
    return translated !== key ? translated : department;
  }

  getFilmography(): PersonMovieCredit[] {
    const actor = this.actor();
    if (!actor?.movie_credits?.cast) return [];

    const filtered = actor.movie_credits.cast.filter(
      (movie) => movie.poster_path && movie.release_date
    );

    switch (this.sortOption()) {
      case 'year':
        return filtered.sort((a, b) => {
          const dateA = new Date(a.release_date).getTime();
          const dateB = new Date(b.release_date).getTime();
          return dateB - dateA;
        });
      case 'rating':
        return filtered.sort(
          (a, b) => (b.vote_average || 0) - (a.vote_average || 0)
        );
      case 'title':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'popularity':
        return filtered.sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0)
        );
      default:
        return filtered;
    }
  }

  onSortChange(option: FilmographySortOption): void {
    this.sortOption.set(option);
    this.visibleFilmCount.set(10);
  }

  getVisibleFilmography(): PersonMovieCredit[] {
    return this.getFilmography().slice(0, this.visibleFilmCount());
  }

  showMoreFilms(): void {
    this.visibleFilmCount.update((count) => count + 10);
  }

  hasMoreFilms(): boolean {
    return this.visibleFilmCount() < this.getFilmography().length;
  }

  onMovieCardClick(movieId: number) {
    const container = document.getElementById('movies-scroll-container');

    if (container && this.currentActorId) {
      const scrollPos = container.scrollTop;

      const actualScrollPos = Math.max(
        scrollPos,
        document.documentElement.scrollTop,
        window.scrollY
      );

      this.moviesStateService.saveActorScrollPosition(
        this.currentActorId,
        actualScrollPos
      );
      this.moviesStateService.pushToHistory(
        `/gimmicks/movies/actor/${this.currentActorId}`,
        actualScrollPos,
        'actor-detail',
        +this.currentActorId
      );
      this.hasNavigationHistory.set(true);

      this.router.navigate(['/gimmicks/movies/movie', movieId]);
    }
  }

  onBackClick(): void {
    const historyEntry = this.moviesStateService.popFromHistory();
    if (historyEntry) {
      this.hasNavigationHistory.set(
        this.moviesStateService.getHistoryLength() > 0
      );

      this.moviesStateService.setNavigatingBack(true);

      this.router.navigateByUrl(historyEntry.route);
    } else {
      this.onOverviewClick();
    }
  }

  onOverviewClick(): void {
    this.moviesStateService.clearHistory();
    this.moviesStateService.clearAllDetailScrollPositions();
    this.moviesStateService.clearAllActorScrollPositions();
    this.hasNavigationHistory.set(false);

    this.moviesStateService.clearState('/gimmicks/movies/popular');
    this.moviesStateService.clearState('/gimmicks/movies/top-rated');
    this.moviesStateService.clearState('/gimmicks/movies/now-playing');
    this.moviesStateService.clearState('/gimmicks/movies/search');

    this.router.navigate(['/gimmicks/movies/popular']);
  }
}
