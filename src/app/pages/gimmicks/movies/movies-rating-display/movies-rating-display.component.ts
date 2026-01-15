import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-movies-rating-display',
  imports: [MatIconModule, DecimalPipe],
  templateUrl: './movies-rating-display.component.html',
  styleUrl: './movies-rating-display.component.scss',
})
export class RatingDisplayComponent {
  rating = input.required<number>();
  voteCount = input<number>();
}
