// =============================================================
//  Hilfsfunktionen rund um das Spielfeld von "Schiffe versenken".
// =============================================================
import {
  FLEET,
  GRID_SIZE,
  type CellView,
  type Orientation,
  type PlacedShip,
  type ShotResult,
} from './ships.types';

/** Feld-Schlüssel im Format "x,y". */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Zerlegt "x,y" wieder in Zahlen. */
export function parseCell(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

/**
 * Felder für ein Schiff ab (x,y) – oder `null`, wenn es nicht passt
 * (über den Rand hinaus oder auf ein belegtes Feld).
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

/** Verteilt die komplette Flotte zufällig auf dem Feld. */
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

/** Baut das Raster für die Anzeige – `stateFor` entscheidet je Feld. */
export function buildGrid(stateFor: (key: string) => CellView['state']): CellView[][] {
  const grid: CellView[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellView[] = [];
    for (let x = 0; x < GRID_SIZE; x++) row.push({ state: stateFor(cellKey(x, y)) });
    grid.push(row);
  }
  return grid;
}

/** Alle Felder von Schiffen, die komplett getroffen (= versenkt) sind. */
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

/** Anzahl versenkter Schiffe. */
export function countSunk(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): number {
  return fleet.filter((s) => s.cells.every((c) => shots[c] === 'hit')).length;
}

/** Größen der Schiffe, die noch nicht versenkt sind. */
export function remainingSizes(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): number[] {
  return fleet.filter((s) => !s.cells.every((c) => shots[c] === 'hit')).map((s) => s.size);
}

/** Ist die komplette Flotte versenkt? */
export function fleetDestroyed(
  fleet: readonly PlacedShip[],
  shots: Record<string, ShotResult>,
): boolean {
  const cells = fleet.flatMap((s) => s.cells);
  return cells.length > 0 && cells.every((c) => shots[c] === 'hit');
}
