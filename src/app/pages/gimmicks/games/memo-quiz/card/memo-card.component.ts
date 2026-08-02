import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MotifComponent } from '../motif/motif.component';

/** Eine Memory-Karte mit 3D-Umdreh-Animation. */
@Component({
  selector: 'app-memo-card',
  imports: [MotifComponent],
  templateUrl: './memo-card.component.html',
  styleUrl: './memo-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoCardComponent {
  readonly motifId = input.required<string>();
  /** Karte liegt offen (umgedreht oder bereits gefunden). */
  readonly faceUp = input<boolean>(false);
  /** Paar wurde bereits gefunden. */
  readonly matched = input<boolean>(false);
  /** Ich habe dieses Paar gefunden (für die Farbmarkierung). */
  readonly mine = input<boolean>(false);
  /** Karte ist aktuell anklickbar. */
  readonly clickable = input<boolean>(false);

  readonly flip = output<void>();

  protected onClick(): void {
    if (this.clickable()) this.flip.emit();
  }
}
