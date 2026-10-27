import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ShipsBoardComponent } from '../board/ships-board.component';
import { cellsFor, randomFleet } from '../game/board.utils';
import { ShipsService } from '../game/ships.service';
import {
  FLEET,
  GRID_SIZE,
  type CellView,
  type Orientation,
  type PlacedShip,
  type ShipSpec,
} from '../game/ships.types';

/** Place the fleet: tapping a cell places the next ship. */
@Component({
  selector: 'app-ships-setup',
  imports: [ShipsBoardComponent, TranslateModule],
  templateUrl: './ships-setup.component.html',
  styleUrl: './ships-setup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsSetupComponent {
  protected readonly svc = inject(ShipsService);

  /** specId -> occupied cells ("x,y") */
  private readonly placed = signal<Record<string, string[]>>({});
  protected readonly orient = signal<Orientation>('h');
  /** Short warning below the board (translation key). */
  protected readonly flash = signal<string | null>(null);

  protected readonly nextSpec = computed<ShipSpec | null>(
    () => FLEET.find((s) => !this.placed()[s.id]) ?? null,
  );
  protected readonly allPlaced = computed(() => this.nextSpec() === null);

  private readonly occupied = computed<Set<string>>(() => {
    const set = new Set<string>();
    for (const cells of Object.values(this.placed())) cells.forEach((c) => set.add(c));
    return set;
  });

  protected readonly rows = computed<CellView[][]>(() => {
    const occ = this.occupied();
    const grid: CellView[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: CellView[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push({ state: occ.has(`${x},${y}`) ? 'ship' : 'water' });
      }
      grid.push(row);
    }
    return grid;
  });

  /** Full translation key for a ship name. */
  protected shipNameKey(spec: ShipSpec): string {
    return `gimmicks.games.shipsGame.ships.${spec.nameKey}`;
  }

  protected toggleOrient(): void {
    this.orient.set(this.orient() === 'h' ? 'v' : 'h');
  }

  protected onCell(c: { x: number; y: number }): void {
    const key = `${c.x},${c.y}`;
    const map = { ...this.placed() };

    // Tapped on a ship already placed -> take it away again.
    for (const [id, cells] of Object.entries(map)) {
      if (cells.includes(key)) {
        delete map[id];
        this.placed.set(map);
        return;
      }
    }

    const spec = this.nextSpec();
    if (!spec) {
      this.warn('warnAllPlaced');
      return;
    }
    const cells = cellsFor(c.x, c.y, spec.size, this.orient(), this.occupied());
    if (!cells) {
      this.warn('warnNoFit');
      return;
    }
    map[spec.id] = cells;
    this.placed.set(map);
    this.flash.set(null);
  }

  protected randomize(): void {
    const map: Record<string, string[]> = {};
    for (const ship of randomFleet()) map[ship.specId] = ship.cells;
    this.placed.set(map);
    this.flash.set(null);
  }

  protected clear(): void {
    this.placed.set({});
    this.flash.set(null);
  }

  protected ready(): void {
    const map = this.placed();
    const ships: PlacedShip[] = FLEET.filter((s) => map[s.id]).map((s) => ({
      specId: s.id,
      size: s.size,
      cells: map[s.id],
    }));
    if (ships.length !== FLEET.length) return;
    this.svc.submitFleet(ships);
  }

  protected leave(): void {
    this.svc.askLeave();
  }

  private warn(key: string): void {
    this.flash.set(`gimmicks.games.shipsGame.setup.${key}`);
    setTimeout(() => this.flash.set(null), 1500);
  }
}
