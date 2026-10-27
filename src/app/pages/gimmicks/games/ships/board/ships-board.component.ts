import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GRID_SIZE, type CellView } from '../game/ships.types';

/** An 8x8 sea with labels. Used for both boards. */
@Component({
  selector: 'app-ships-board',
  templateUrl: './ships-board.component.html',
  styleUrl: './ships-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsBoardComponent {
  readonly rows = input.required<CellView[][]>();
  /** May you click here right now? */
  readonly interactive = input<boolean>(false);
  readonly cellClick = output<{ x: number; y: number }>();

  protected readonly size = GRID_SIZE;
  protected readonly letters = Array.from({ length: GRID_SIZE }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  /** You cannot shoot again at cells that have already been shot at. */
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
