import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MotifComponent } from '../motif/motif.component';

/** A memory card with a 3D flip animation. */
@Component({
  selector: 'app-memo-card',
  imports: [MotifComponent],
  templateUrl: './memo-card.component.html',
  styleUrl: './memo-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoCardComponent {
  readonly motifId = input.required<string>();
  /** The card is face up (turned over or already found). */
  readonly faceUp = input<boolean>(false);
  /** The pair has already been found. */
  readonly matched = input<boolean>(false);
  /** I found this pair (for the color highlight). */
  readonly mine = input<boolean>(false);
  /** The card is currently clickable. */
  readonly clickable = input<boolean>(false);

  readonly flip = output<void>();

  protected onClick(): void {
    if (this.clickable()) this.flip.emit();
  }
}
