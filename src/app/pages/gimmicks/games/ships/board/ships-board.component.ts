import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GRID_SIZE, type CellView } from '../game/ships.types';

/** Ein 8x8-Meer mit Beschriftung. Wird für beide Spielfelder benutzt. */
@Component({
  selector: 'app-ships-board',
  templateUrl: './ships-board.component.html',
  styleUrl: './ships-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsBoardComponent {
  readonly rows = input.required<CellView[][]>();
  /** Darf hier gerade geklickt werden? */
  readonly interactive = input<boolean>(false);
  readonly cellClick = output<{ x: number; y: number }>();

  protected readonly size = GRID_SIZE;
  protected readonly letters = Array.from({ length: GRID_SIZE }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  /** Auf beschossene Felder kann man nicht nochmal schießen. */
  protected locked(cell: CellView): boolean {
    return cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk';
  }

  protected content(cell: CellView): string {
    switch (cell.state) {
      case 'hit':
        return '💥';
      case 'sunk':
        return '🔥';
      case 'miss':
        return '💧';
      case 'ship':
        return '🚢';
      default:
        return '';
    }
  }
}
