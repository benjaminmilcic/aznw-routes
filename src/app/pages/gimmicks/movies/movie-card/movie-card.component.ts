import { Component, input, output, signal } from '@angular/core';
import { Movie } from '../movies.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MoviesService } from '../movies.service';
import { RatingDisplayComponent } from '../movies-rating-display/movies-rating-display.component';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movie-card',
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, RatingDisplayComponent, TranslateModule],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.css',
})
export class MovieCardComponent {
  media = input.required<Movie>();
  cardClick = output<void>();
  imageLoaded = signal(false);

  constructor(private moviesService: MoviesService, private router: Router) {}

  get posterUrl(): string {
    return this.moviesService.getImageUrl(this.media().poster_path, 'w342');
  }

  onCardClick() {
    // Emit event so parent can save state before navigation
    this.cardClick.emit();
    this.router.navigate(['/gimmicks/movies/movie', this.media().id]);
  }
}
