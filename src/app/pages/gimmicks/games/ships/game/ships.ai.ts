// =============================================================
//  Computer-Gegner für "Schiffe versenken".
// =============================================================
// Den gibt es in der Whiteboard-App nicht – sie kennt nur den
// Online-Modus. Der Computer spielt hier fair: Er kennt die
// gegnerische Flotte NICHT. Er sieht nur das, was auch ein Mensch
// sieht – die eigenen Schüsse (Treffer/Wasser) und welche Schiffe
// dadurch versenkt wurden.
//
// Drei Spielstärken:
//   easy   – schießt rein zufällig
//   medium – "Suchen & Nachfassen": nach einem Treffer werden die
//            Nachbarfelder abgeklopft, gesucht wird im Schachbrett-
//            muster (kein Schiff ist kleiner als 2 Felder)
//   hard   – zusätzlich eine Wahrscheinlichkeitskarte: Für jedes
//            noch schwimmende Schiff wird gezählt, wie oft es über
//            ein Feld liegen könnte. Beschossen wird das Feld mit
//            den meisten Möglichkeiten.
// =============================================================
import { cellKey, inBounds, parseCell } from './board.utils';
import { GRID_SIZE, type ShipsLevel, type ShotResult } from './ships.types';

type Shots = Record<string, ShotResult>;

/**
 * Nächster Schuss des Computers.
 *
 * @param shots     Bisherige Schüsse des Computers ("x,y" -> hit/miss)
 * @param sunk      Felder von Schiffen, die bereits versenkt sind
 * @param remaining Größen der Schiffe, die noch schwimmen
 * @param level     Spielstärke
 * @returns         Zielfeld oder `null`, wenn nichts mehr frei ist
 */
export function bestShot(
  shots: Shots,
  sunk: ReadonlySet<string>,
  remaining: readonly number[],
  level: ShipsLevel,
): { x: number; y: number } | null {
  const open = openCells(shots);
  if (open.length === 0) return null;

  // Treffer, die zu einem noch nicht versenkten Schiff gehören.
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
      // Kleinstes Schiff bestimmt das Suchraster: Ein Schiff der Länge n
      // wird garantiert von jedem n-ten Feld getroffen.
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

// ---- Suchen & Nachfassen ------------------------------------------------

/**
 * Felder, die nach einem Treffer sinnvoll sind: Liegen zwei Treffer in einer
 * Linie, wird diese Linie an beiden Enden verlängert (Schiffe sind gerade).
 * Sonst werden die vier Nachbarfelder abgeklopft.
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
      // Gehört das Nachbarfeld auch zu einem Treffer? Dann kennen wir die
      // Richtung des Schiffs und verlängern die Reihe hinter dem Ende.
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

  // Bekannte Richtung schlägt blindes Abklopfen.
  return unique(lineTargets.length > 0 ? lineTargets : neighbourTargets);
}

// ---- Wahrscheinlichkeitskarte -------------------------------------------

/**
 * Wählt aus `candidates` das Feld, über das die meisten der noch
 * schwimmenden Schiffe passen könnten.
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
 * Zählt für jedes freie Feld, wie viele mögliche Schiffslagen darüber laufen.
 * Treffer, die noch zu keinem versenkten Schiff gehören, zählen als starker
 * Hinweis – Lagen durch solche Treffer werden höher gewichtet.
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
            // Wasser und bereits versenkte Schiffe blockieren die Lage.
            if (shots[key] === 'miss' || sunk.has(key)) {
              possible = false;
              break;
            }
            if (shots[key] === 'hit') hits++;
            cells.push(key);
          }
          if (!possible) continue;

          // Lagen, die einen offenen Treffer erklären, sind viel wahrscheinlicher.
          const weight = 1 + hits * 8;
          for (const key of cells) {
            if (shots[key]) continue; // schon beschossen -> kein Ziel
            score.set(key, (score.get(key) ?? 0) + weight);
          }
        }
      }
    }
  }
  return score;
}

// ---- Kleinkram ----------------------------------------------------------

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
