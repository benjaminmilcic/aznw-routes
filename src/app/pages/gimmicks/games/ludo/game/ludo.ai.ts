// =============================================================
//  Computer opponent for "Ludo".
// =============================================================
// The dice decide most things anyway – so the computer only picks
// the best one from the allowed moves (depending on the difficulty).
//
//   easy   – purely random, makes beginner mistakes
//   medium – mostly the best move, sometimes a random one
//   hard   – always the best-rated move (captures, rescues, goes home)
// =============================================================
import { trackCell } from './ludo.rules';
import {
  GOAL_BASE,
  HOME,
  TRACK_LEN,
  type LudoGame,
  type LudoLevel,
  type LudoMove,
  type LudoPos,
} from './ludo.types';

/** Picks the computer's move from the allowed moves. */
export function bestMove(
  g: LudoGame,
  playerId: string,
  moves: LudoMove[],
  level: LudoLevel,
): LudoMove | null {
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  if (level === 'easy') return moves[Math.floor(Math.random() * moves.length)];

  // "medium" misses now and then, so that children have a chance.
  if (level === 'medium' && Math.random() < 0.35) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = rate(g, playerId, move);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

/** Rates a move – the higher, the better. */
function rate(g: LudoGame, playerId: string, move: LudoMove): number {
  const from = (g.pieces[playerId] ?? [])[move.pieceIndex] ?? HOME;
  let score = 0;

  // Knocking out an opponent is almost always the best.
  if (move.captures) score += 120;

  // Turning into the home column – the further in, the better.
  if (move.to >= GOAL_BASE) score += 70 + (move.to - GOAL_BASE) * 6;

  // Bringing a piece out of the garage puts pressure on the board.
  if (from === HOME) score += 80;

  // Bringing a threatened piece to safety …
  if (isThreatened(g, playerId, from)) score += 45;
  // … but not into the next danger.
  if (isThreatened(g, playerId, move.to)) score -= 40;

  // Otherwise progress towards the goal counts.
  score += move.to * 0.5;

  return score;
}

/**
 * Is the piece on a square that an opponent can reach with a roll of 1–6?
 * Pieces in the garage or in the home column are safe.
 */
function isThreatened(g: LudoGame, id: string, pos: LudoPos): boolean {
  if (pos < 0 || pos >= TRACK_LEN) return false;
  const cell = trackCell(g, id, pos);

  for (const other of g.order) {
    if (other === id) continue;
    for (const p of g.pieces[other] ?? []) {
      if (p < 0 || p >= TRACK_LEN) continue;
      const dist = (cell - trackCell(g, other, p) + TRACK_LEN) % TRACK_LEN;
      // The opponent must be able to reach the square with one roll without
      // already turning into their own home column.
      if (dist >= 1 && dist <= 6 && p + dist < TRACK_LEN) return true;
    }
  }
  return false;
}
