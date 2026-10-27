// =============================================================
//  Rules of "Ludo" as pure functions.
// =============================================================
// Deliberately without Angular/Firebase: the same code decides on the moves
// on the device, in the online game and for the computer opponent.
// =============================================================
import {
  GOAL_BASE,
  GOAL_LEN,
  HOME,
  PIECES,
  SEAT_START,
  TRACK_LEN,
  type LudoGame,
  type LudoMove,
  type LudoPos,
} from './ludo.types';

/** Seat (0 … 3) of a player – determines color, start, garage and goal. */
export function seatOf(g: LudoGame, id: string): number {
  return g.seats?.[id] ?? 0;
}

/** Board square (0 … 39) of a piece on the track, otherwise -1. */
export function trackCell(g: LudoGame, id: string, pos: LudoPos): number {
  if (pos < 0 || pos >= TRACK_LEN) return -1;
  return (SEAT_START[seatOf(g, id)] + pos) % TRACK_LEN;
}

/** Fresh pieces: all four are in the garage. */
export function freshPieces(): LudoPos[] {
  return Array.from({ length: PIECES }, () => HOME);
}

/** Does the player have all four pieces home? Then they no longer play. */
export function isDone(g: LudoGame, id: string): boolean {
  const mine = g.pieces[id] ?? [];
  return mine.length > 0 && mine.every((p) => p >= GOAL_BASE);
}

/** All players who are still on their way. */
export function activePlayers(g: LudoGame): string[] {
  return g.order.filter((id) => !isDone(g, id));
}

/** The player whose turn comes after `id` – finished players are skipped. */
export function nextPlayer(g: LudoGame, id: string): string {
  const i = g.order.indexOf(id);
  const start = i < 0 ? 0 : i;
  for (let step = 1; step <= g.order.length; step++) {
    const candidate = g.order[(start + step) % g.order.length];
    if (!isDone(g, candidate)) return candidate;
  }
  return g.order[start] ?? id;
}

/** Is one of the player's own pieces on the target position `to`? */
function hasOwnPieceAt(g: LudoGame, id: string, to: LudoPos): boolean {
  const mine = g.pieces[id] ?? [];
  if (to < TRACK_LEN) {
    const cell = trackCell(g, id, to);
    return mine.some((p) => p >= 0 && p < TRACK_LEN && trackCell(g, id, p) === cell);
  }
  // Home column: exactly the same target position.
  return mine.some((p) => p === to);
}

/** Would a move to `to` capture an opposing piece? (track only) */
export function capturesAt(g: LudoGame, id: string, to: LudoPos): boolean {
  if (to >= TRACK_LEN || to < 0) return false;
  const cell = trackCell(g, id, to);
  return g.order.some(
    (other) =>
      other !== id &&
      (g.pieces[other] ?? []).some(
        (p) => p >= 0 && p < TRACK_LEN && trackCell(g, other, p) === cell,
      ),
  );
}

/** All legal moves of player `id` with pip count `dice`. */
export function computeMoves(g: LudoGame, id: string, dice: number): LudoMove[] {
  const moves: LudoMove[] = [];
  const mine = g.pieces[id] ?? [];

  for (let i = 0; i < mine.length; i++) {
    const pos = mine[i];

    if (pos === HOME) {
      // Out of the garage only with a 6 and onto the own start square (pos 0).
      if (dice !== 6) continue;
      if (hasOwnPieceAt(g, id, 0)) continue; // own start square occupied
      moves.push({ pieceIndex: i, to: 0, captures: capturesAt(g, id, 0) });
      continue;
    }

    const to = pos + dice;
    if (to > GOAL_BASE + GOAL_LEN - 1) continue; // beyond the goal → invalid
    if (hasOwnPieceAt(g, id, to)) continue; // own piece blocks

    moves.push({ pieceIndex: i, to, captures: capturesAt(g, id, to) });
  }
  return moves;
}

/**
 * May the player roll up to three times? That applies if they could only move
 * with a 6: at least one piece is in the garage and no pip count 1–5 allows a
 * move (e.g. the other pieces are stuck in the home column). Just like at the
 * start of the game, when all pieces are in the garage.
 */
export function onlySixHelps(g: LudoGame, id: string): boolean {
  const hasGaragePiece = (g.pieces[id] ?? []).some((p) => p === HOME);
  if (!hasGaragePiece) return false;
  for (let v = 1; v <= 5; v++) {
    if (computeMoves(g, id, v).length > 0) return false;
  }
  return true;
}

/** How far has a player got in total? (for the remaining places) */
function progress(g: LudoGame, id: string): number {
  return (g.pieces[id] ?? []).reduce((sum, p) => sum + (p < 0 ? 0 : p + 1), 0);
}

/**
 * Is the game decided? That is the case when only one player is still on
 * their way – or when only computers would still be playing. Nobody wants to
 * watch two computers play out third and fourth place.
 *
 * The players who have not finished are then appended to the ranking
 * by their progress.
 */
export function finishIfDecided(g: LudoGame): LudoGame {
  const active = activePlayers(g);
  const humansLeft = active.filter((id) => !g.players[id]?.cpu);
  if (active.length > 1 && humansLeft.length > 0) return g;

  const rest = [...active].sort((a, b) => progress(g, b) - progress(g, a));
  const ranking = [...g.ranking, ...rest];
  return {
    ...g,
    status: 'finished',
    ranking,
    winnerId: ranking[0] ?? g.winnerId,
    dice: null,
    updatedAt: Date.now(),
  };
}

/** Sets the player on turn: reset the dice, number of rolls depending on the garage. */
export function withTurn(g: LudoGame, playerId: string): LudoGame {
  const next: LudoGame = { ...g, currentTurn: playerId, dice: null };
  next.rollsLeft = onlySixHelps(next, playerId) ? 3 : 1;
  return next;
}

/** Stores the rolled pip count – the move only comes after that. */
export function applyRoll(g: LudoGame, playerId: string, dice: number): LudoGame {
  return {
    ...g,
    dice,
    lastAction: { by: playerId, dice, at: Date.now() },
    updatedAt: Date.now(),
  };
}

/**
 * Confirms a pip count that cannot be used. A 6 (or another attempt with all
 * pieces in the garage) gives a new roll, otherwise it is the next player's
 * turn.
 */
export function applyPass(g: LudoGame, playerId: string): LudoGame {
  const dice = g.dice;
  if (dice === null) return g;

  let next: LudoGame;
  if (dice === 6) {
    // A 6 always gives a new roll – even if it could not be used.
    next = { ...g, dice: null, rollsLeft: 1 };
  } else if (g.rollsLeft > 1 && onlySixHelps(g, playerId)) {
    // Only a 6 could help → up to three attempts to roll a 6.
    next = { ...g, dice: null, rollsLeft: g.rollsLeft - 1 };
  } else {
    next = withTurn(g, nextPlayer(g, playerId));
  }
  return { ...next, updatedAt: Date.now() };
}

/** Moves the selected piece according to the current die. */
export function applyMove(g: LudoGame, playerId: string, move: LudoMove): LudoGame {
  const dice = g.dice ?? 0;

  const pieces: Record<string, LudoPos[]> = {};
  for (const id of g.order) pieces[id] = [...(g.pieces[id] ?? freshPieces())];

  // Capturing: all opposing pieces on the target square go back to the garage.
  let captured = false;
  if (move.to < TRACK_LEN) {
    const targetCell = trackCell(g, playerId, move.to);
    for (const other of g.order) {
      if (other === playerId) continue;
      const theirs = pieces[other];
      for (let i = 0; i < theirs.length; i++) {
        if (theirs[i] >= 0 && theirs[i] < TRACK_LEN && trackCell(g, other, theirs[i]) === targetCell) {
          theirs[i] = HOME;
          captured = true;
        }
      }
    }
  }

  pieces[playerId][move.pieceIndex] = move.to;

  let moved: LudoGame = {
    ...g,
    pieces,
    lastAction: { by: playerId, dice, captured, at: Date.now() },
  };

  // All four pieces home: secure the place and take them out of the race.
  const justFinished = pieces[playerId].every((p) => p >= GOAL_BASE);
  if (justFinished) {
    const ranking = [...moved.ranking, playerId];
    moved = { ...moved, ranking, winnerId: moved.winnerId ?? ranking[0] };

    // If the remaining places are already decided, the game is over.
    const decided = finishIfDecided(moved);
    if (decided.status === 'finished') return decided;
  }

  // A 6 gives another move – but not anymore once you have finished.
  const again = dice === 6 && !justFinished;
  const next = withTurn(moved, again ? playerId : nextPlayer(moved, playerId));
  return { ...next, updatedAt: Date.now() };
}
