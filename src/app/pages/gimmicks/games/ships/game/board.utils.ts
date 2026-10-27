// =============================================================
//  Helper functions around the board of "Battleship".
// =============================================================
import {
  FLEET,
  GRID_SIZE,
  type CellView,
  type Orientation,
  type PlacedShip,
  type ShotResult,
} from './ships.types';

/** Cell key in the format "x,y". */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Splits "x,y" back into numbers. */
export function parseCell(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

/**
 * Cells for a ship starting at (x,y) – or `null` if it does not fit
 * (beyond the edge or on an occupied cell).
 */
export function cellsFor(
  x: number,
  y: number,
  size: number,
  orient: Orientation,
  occupied: ReadonlySet<string>,
): string[] | null {
  const cells: string[] = [];
  for (let i = 0; i < size; i++) {
    const cx = orient === 'h' ? x + i : x;
    const cy = orient === 'v' ? y + i : y;
    if (!inBounds(cx, cy)) return null;
    const key = cellKey(cx, cy);
    if (occupied.has(key)) return null;
    cells.push(key);
  }
  return cells;
}

/** Distributes the complete fleet randomly on the board. */
export function randomFleet(): PlacedShip[] {
  const occupied = new Set<string>();
  const ships: PlacedShip[] = [];
  for (const spec of FLEET) {
    for (let tries = 0; tries < 400; tries++) {
      const orient: Orientation = Math.random() < 0.5 ? 'h' : 'v';
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const cells = cellsFor(x, y, spec.size, orient, occupied);
      if (cells) {
        cells.forEach((c) => occupied.add(c));
        ships.push({ specId: spec.id, size: spec.size, cells });
        break;
      }
    }
  }
  return ships;
}

/** Builds the grid for display – `stateFor` decides per cell. */
export function buildGrid(stateFor: (key: string) => CellView['state']): CellView[][] {
  const grid: CellView[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellView[] = [];
    for (let x = 0; x < GRID_SIZE; x++) row.push({ state: stateFor(cellKey(x, y)) });
    grid.push(row);
  }
  return grid;
}

/** All cells of ships that are completely hit (= sunk). */
export function sunkCells(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): Set<string> {
  const set = new Set<string>();
  for (const ship of fleet) {
    if (ship.cells.every((c) => shots[c] === 'hit')) {
      ship.cells.forEach((c) => set.add(c));
    }
  }
  return set;
}

/** Number of sunk ships. */
export function countSunk(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): number {
  return fleet.filter((s) => s.cells.every((c) => shots[c] === 'hit')).length;
}

/** Sizes of the ships that have not been sunk yet. */
export function remainingSizes(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): number[] {
  return fleet.filter((s) => !s.cells.every((c) => shots[c] === 'hit')).map((s) => s.size);
}

/** Is the complete fleet sunk? */
export function fleetDestroyed(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): boolean {
  const cells = fleet.flatMap((s) => s.cells);
  return cells.length > 0 && cells.every((c) => shots[c] === 'hit');
}
