// =============================================================
//  Computer opponent for "Battleship".
// =============================================================
// It does not exist in the whiteboard app – that one only knows the
// online mode. The computer plays fair here: it does NOT know the
// opponent's fleet. It only sees what a human would
// see – its own shots (hit/water) and which ships were
// sunk by them.
//
// Three difficulty levels:
//   easy   – shoots purely at random
//   medium – "hunt & target": after a hit the neighboring cells
//            are tapped, the search uses a checkerboard
//            pattern (no ship is smaller than 2 cells)
//   hard   – additionally a probability map: for every ship
//            still afloat it counts how often it could lie over
//            a cell. The cell with the most possibilities
//            is shot at.
// =============================================================
import { cellKey, inBounds, parseCell } from './board.utils';
import { GRID_SIZE, type ShipsLevel, type ShotResult } from './ships.types';

type Shots = Record<string, ShotResult>;

/**
 * The computer's next shot.
 *
 * @param shots     Previous shots of the computer ("x,y" -> hit/miss)
 * @param sunk      Cells of ships that are already sunk
 * @param remaining Sizes of the ships still afloat
 * @param level     Difficulty
 * @returns         Target cell or `null` if nothing is free anymore
 */
export function bestShot(
  shots: Shots,
  sunk: ReadonlySet<string>,
  remaining: readonly number[],
  level: ShipsLevel,
): { x: number; y: number } | null {
  const open = openCells(shots);
  if (open.length === 0) return null;

  // Hits that belong to a ship that has not been sunk yet.
  const activeHits = Object.keys(shots).filter((k) => shots[k] === 'hit' && !sunk.has(k));

  if (level !== 'easy' && activeHits.length > 0) {
    const targets = followUpTargets(activeHits, shots);
    if (targets.length > 0) {
      return level === 'hard'
        ? parseCell(pickByDensity(targets, shots, sunk, remaining))
        : parseCell(pickRandom(targets));
    }
  }

  switch (level) {
    case 'easy':
      return parseCell(pickRandom(open));

    case 'medium': {
      // The smallest ship determines the search grid: a ship of length n
      // is guaranteed to be hit by every n-th cell.
      const step = Math.max(2, Math.min(...(remaining.length ? remaining : [2])));
      const parity = open.filter((k) => {
        const { x, y } = parseCell(k);
        return (x + y) % step === 0;
      });
      return parseCell(pickRandom(parity.length ? parity : open));
    }

    case 'hard':
      return parseCell(pickByDensity(open, shots, sunk, remaining));
  }
}

// ---- Hunt & target ------------------------------------------------------

/**
 * Cells that make sense after a hit: if two hits lie in a
 * line, this line is extended at both ends (ships are straight).
 * Otherwise the four neighboring cells are tapped.
 */
function followUpTargets(activeHits: readonly string[], shots: Shots): string[] {
  const hitSet = new Set(activeHits);
  const lineTargets: string[] = [];
  const neighbourTargets: string[] = [];

  for (const key of activeHits) {
    const { x, y } = parseCell(key);

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      // Does the neighboring cell also belong to a hit? Then we know the
      // direction of the ship and extend the row beyond its end.
      if (hitSet.has(cellKey(x + dx, y + dy))) {
        let nx = x - dx;
        let ny = y - dy;
        while (inBounds(nx, ny) && hitSet.has(cellKey(nx, ny))) {
          nx -= dx;
          ny -= dy;
        }
        if (inBounds(nx, ny) && !shots[cellKey(nx, ny)]) lineTargets.push(cellKey(nx, ny));
      } else if (inBounds(x + dx, y + dy) && !shots[cellKey(x + dx, y + dy)]) {
        neighbourTargets.push(cellKey(x + dx, y + dy));
      }
    }
  }

  // A known direction beats blind tapping.
  return unique(lineTargets.length > 0 ? lineTargets : neighbourTargets);
}

// ---- Probability map ----------------------------------------------------

/**
 * Picks the cell from `candidates` over which most of the ships still
 * afloat could fit.
 */
function pickByDensity(
  candidates: readonly string[],
  shots: Shots,
  sunk: ReadonlySet<string>,
  remaining: readonly number[],
): string {
  const score = densityMap(shots, sunk, remaining);
  let best: string[] = [];
  let bestScore = -1;
  for (const key of candidates) {
    const value = score.get(key) ?? 0;
    if (value > bestScore) {
      bestScore = value;
      best = [key];
    } else if (value === bestScore) {
      best.push(key);
    }
  }
  return pickRandom(best.length ? best : candidates);
}

/**
 * Counts for every free cell how many possible ship positions run over it.
 * Hits that do not belong to a sunk ship yet count as a strong
 * hint – positions through such hits are weighted higher.
 */
function densityMap(
  shots: Shots,
  sunk: ReadonlySet<string>,
  remaining: readonly number[],
): Map<string, number> {
  const score = new Map<string, number>();

  for (const size of remaining) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ] as const) {
          const cells: string[] = [];
          let possible = true;
          let hits = 0;

          for (let i = 0; i < size; i++) {
            const cx = x + dx * i;
            const cy = y + dy * i;
            if (!inBounds(cx, cy)) {
              possible = false;
              break;
            }
            const key = cellKey(cx, cy);
            // Water and already sunk ships block the position.
            if (shots[key] === 'miss' || sunk.has(key)) {
              possible = false;
              break;
            }
            if (shots[key] === 'hit') hits++;
            cells.push(key);
          }
          if (!possible) continue;

          // Positions that explain an open hit are much more likely.
          const weight = 1 + hits * 8;
          for (const key of cells) {
            if (shots[key]) continue; // already shot at -> no target
            score.set(key, (score.get(key) ?? 0) + weight);
          }
        }
      }
    }
  }
  return score;
}

// ---- Odds and ends ------------------------------------------------------

function openCells(shots: Shots): string[] {
  const open: string[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = cellKey(x, y);
      if (!shots[key]) open.push(key);
    }
  }
  return open;
}

function unique(list: readonly string[]): string[] {
  return [...new Set(list)];
}

function pickRandom(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
