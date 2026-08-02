// =============================================================
//  Computer-Gegner für "4 Gewinnt".
// =============================================================
// Minimax mit Alpha-Beta-Kürzung auf dem flachen Spielfeld. Die Suchtiefe
// hängt von der gewählten Spielstärke ab; "leicht" spielt zusätzlich
// absichtlich hin und wieder daneben, damit auch Kinder gewinnen können.
import { COLS, ROWS, dropIndex, isWin, validCols } from './board.utils';
import type { C4Level } from './game.types';

const WIN_SCORE = 1_000_000;

const DEPTH: Record<C4Level, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

/** Wahrscheinlichkeit, mit der ein Zug rein zufällig gewählt wird. */
const BLUNDER: Record<C4Level, number> = {
  easy: 0.5,
  medium: 0.2,
  hard: 0.02,
};

/**
 * Bester Zug für `me`. Liefert die Spalte oder -1, wenn kein Zug möglich ist.
 * `board` wird während der Suche nur temporär verändert und danach
 * unverändert zurückgelassen.
 */
export function bestMove(board: string[], me: string, opp: string, level: C4Level): number {
  const options = validCols(board);
  if (options.length === 0) return -1;

  // Sofortgewinn immer mitnehmen – auch auf "leicht".
  for (const c of options) {
    const i = dropIndex(board, c);
    board[i] = me;
    const win = isWin(board, i, me);
    board[i] = '';
    if (win) return c;
  }

  if (Math.random() < BLUNDER[level]) {
    return options[Math.floor(Math.random() * options.length)];
  }

  let best: number[] = [];
  let bestScore = -Infinity;
  for (const c of centerFirst(options)) {
    const i = dropIndex(board, c);
    board[i] = me;
    const score = isWin(board, i, me)
      ? WIN_SCORE
      : search(board, DEPTH[level] - 1, -Infinity, Infinity, false, me, opp);
    board[i] = '';

    if (score > bestScore) {
      bestScore = score;
      best = [c];
    } else if (score === bestScore) {
      best.push(c);
    }
  }
  return best[Math.floor(Math.random() * best.length)];
}

/** Mittlere Spalten zuerst prüfen – das macht die Alpha-Beta-Kürzung wirksamer. */
function centerFirst(cols: number[]): number[] {
  const center = (COLS - 1) / 2;
  return [...cols].sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
}

function search(
  board: string[],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: string,
  opp: string,
): number {
  const options = validCols(board);
  if (options.length === 0) return 0; // unentschieden
  if (depth <= 0) return evaluate(board, me, opp);

  const player = maximizing ? me : opp;
  let best = maximizing ? -Infinity : Infinity;

  for (const c of centerFirst(options)) {
    const i = dropIndex(board, c);
    board[i] = player;
    let score: number;
    if (isWin(board, i, player)) {
      // Frühe Siege sind mehr wert als späte – so verschleppt der Computer nichts.
      score = maximizing ? WIN_SCORE + depth : -WIN_SCORE - depth;
    } else {
      score = search(board, depth - 1, alpha, beta, !maximizing, me, opp);
    }
    board[i] = '';

    if (maximizing) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

/** Stellungsbewertung: alle Vierer-Fenster zählen, Mitte etwas höher gewichten. */
function evaluate(board: string[], me: string, opp: string): number {
  let score = 0;

  // Mittlere Spalte ist strategisch am wertvollsten.
  const middle = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (board[r * COLS + middle] === me) score += 3;
    else if (board[r * COLS + middle] === opp) score -= 3;
  }

  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        const endR = r + 3 * dr;
        const endC = c + 3 * dc;
        if (endR < 0 || endR >= ROWS || endC < 0 || endC >= COLS) continue;

        let mine = 0;
        let theirs = 0;
        for (let s = 0; s < 4; s++) {
          const cell = board[(r + s * dr) * COLS + (c + s * dc)];
          if (cell === me) mine++;
          else if (cell === opp) theirs++;
        }
        if (mine && theirs) continue; // Fenster ist für beide wertlos
        if (mine === 3) score += 50;
        else if (mine === 2) score += 8;
        else if (mine === 1) score += 1;
        else if (theirs === 3) score -= 70; // Gegner-Drohungen etwas stärker gewichten
        else if (theirs === 2) score -= 8;
        else if (theirs === 1) score -= 1;
      }
    }
  }
  return score;
}
