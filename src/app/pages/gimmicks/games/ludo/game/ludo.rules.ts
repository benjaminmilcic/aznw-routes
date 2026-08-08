// =============================================================
//  Spielregeln von "Mensch ärgere dich nicht" als reine Funktionen.
// =============================================================
// Bewusst ohne Angular/Firebase: derselbe Code entscheidet über die Züge
// am Gerät, im Online-Spiel und beim Computer-Gegner.
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

/** Sitzplatz (0 … 3) eines Spielers – bestimmt Farbe, Start, Garage und Ziel. */
export function seatOf(g: LudoGame, id: string): number {
  return g.seats?.[id] ?? 0;
}

/** Brettfeld (0 … 39) einer Figur auf der Laufbahn, sonst -1. */
export function trackCell(g: LudoGame, id: string, pos: LudoPos): number {
  if (pos < 0 || pos >= TRACK_LEN) return -1;
  return (SEAT_START[seatOf(g, id)] + pos) % TRACK_LEN;
}

/** Frische Figuren: alle vier stehen in der Garage. */
export function freshPieces(): LudoPos[] {
  return Array.from({ length: PIECES }, () => HOME);
}

/** Hat der Spieler alle vier Figuren im Ziel? Dann spielt er nicht mehr mit. */
export function isDone(g: LudoGame, id: string): boolean {
  const mine = g.pieces[id] ?? [];
  return mine.length > 0 && mine.every((p) => p >= GOAL_BASE);
}

/** Alle Spieler, die noch unterwegs sind. */
export function activePlayers(g: LudoGame): string[] {
  return g.order.filter((id) => !isDone(g, id));
}

/** Der Spieler, der nach `id` an der Reihe ist – Fertige werden übersprungen. */
export function nextPlayer(g: LudoGame, id: string): string {
  const i = g.order.indexOf(id);
  const start = i < 0 ? 0 : i;
  for (let step = 1; step <= g.order.length; step++) {
    const candidate = g.order[(start + step) % g.order.length];
    if (!isDone(g, candidate)) return candidate;
  }
  return g.order[start] ?? id;
}

/** Liegt eine eigene Figur auf der Zielposition `to`? */
function hasOwnPieceAt(g: LudoGame, id: string, to: LudoPos): boolean {
  const mine = g.pieces[id] ?? [];
  if (to < TRACK_LEN) {
    const cell = trackCell(g, id, to);
    return mine.some((p) => p >= 0 && p < TRACK_LEN && trackCell(g, id, p) === cell);
  }
  // Zielhaus: exakt dieselbe Zielposition.
  return mine.some((p) => p === to);
}

/** Würde ein Zug auf `to` eine gegnerische Figur schlagen? (nur Laufbahn) */
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

/** Alle legalen Züge des Spielers `id` mit Augenzahl `dice`. */
export function computeMoves(g: LudoGame, id: string, dice: number): LudoMove[] {
  const moves: LudoMove[] = [];
  const mine = g.pieces[id] ?? [];

  for (let i = 0; i < mine.length; i++) {
    const pos = mine[i];

    if (pos === HOME) {
      // Aus der Garage nur mit einer 6 und auf das eigene Startfeld (pos 0).
      if (dice !== 6) continue;
      if (hasOwnPieceAt(g, id, 0)) continue; // eigenes Startfeld belegt
      moves.push({ pieceIndex: i, to: 0, captures: capturesAt(g, id, 0) });
      continue;
    }

    const to = pos + dice;
    if (to > GOAL_BASE + GOAL_LEN - 1) continue; // über das Ziel hinaus → ungültig
    if (hasOwnPieceAt(g, id, to)) continue; // eigene Figur blockiert

    moves.push({ pieceIndex: i, to, captures: capturesAt(g, id, to) });
  }
  return moves;
}

/**
 * Darf der Spieler bis zu drei Mal würfeln? Das gilt, wenn er nur noch mit
 * einer 6 ziehen könnte: mindestens eine Figur steht in der Garage und mit
 * keiner Augenzahl 1–5 ist ein Zug möglich (z. B. die übrigen Figuren sitzen
 * fest im Ziel). Wie zu Spielbeginn, wenn alle Figuren in der Garage stehen.
 */
export function onlySixHelps(g: LudoGame, id: string): boolean {
  const hasGaragePiece = (g.pieces[id] ?? []).some((p) => p === HOME);
  if (!hasGaragePiece) return false;
  for (let v = 1; v <= 5; v++) {
    if (computeMoves(g, id, v).length > 0) return false;
  }
  return true;
}

/** Wie weit ist ein Spieler insgesamt gekommen? (für die Restplätze) */
function progress(g: LudoGame, id: string): number {
  return (g.pieces[id] ?? []).reduce((sum, p) => sum + (p < 0 ? 0 : p + 1), 0);
}

/**
 * Ist die Partie entschieden? Das ist der Fall, wenn nur noch einer unterwegs
 * ist – oder wenn nur noch Computer spielen würden. Niemand will zuschauen,
 * wie zwei Computer den dritten und vierten Platz ausspielen.
 *
 * Die noch nicht fertigen Spieler werden dann nach ihrem Fortschritt an die
 * Rangliste angehängt.
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

/** Setzt den Spieler am Zug: Würfel zurück, Wurfanzahl je nach Garage. */
export function withTurn(g: LudoGame, playerId: string): LudoGame {
  const next: LudoGame = { ...g, currentTurn: playerId, dice: null };
  next.rollsLeft = onlySixHelps(next, playerId) ? 3 : 1;
  return next;
}

/** Speichert die gewürfelte Augenzahl – gezogen wird erst danach. */
export function applyRoll(g: LudoGame, playerId: string, dice: number): LudoGame {
  return {
    ...g,
    dice,
    lastAction: { by: playerId, dice, at: Date.now() },
    updatedAt: Date.now(),
  };
}

/**
 * Bestätigt eine nicht setzbare Augenzahl. Eine 6 (oder ein weiterer Versuch
 * mit allen Figuren in der Garage) bringt einen neuen Wurf, sonst ist der
 * nächste Spieler dran.
 */
export function applyPass(g: LudoGame, playerId: string): LudoGame {
  const dice = g.dice;
  if (dice === null) return g;

  let next: LudoGame;
  if (dice === 6) {
    // Eine 6 bringt immer einen neuen Wurf – auch wenn sie nicht setzbar war.
    next = { ...g, dice: null, rollsLeft: 1 };
  } else if (g.rollsLeft > 1 && onlySixHelps(g, playerId)) {
    // Nur eine 6 könnte helfen → bis zu drei Versuche, eine 6 zu würfeln.
    next = { ...g, dice: null, rollsLeft: g.rollsLeft - 1 };
  } else {
    next = withTurn(g, nextPlayer(g, playerId));
  }
  return { ...next, updatedAt: Date.now() };
}

/** Bewegt die gewählte Figur gemäß dem aktuellen Würfel. */
export function applyMove(g: LudoGame, playerId: string, move: LudoMove): LudoGame {
  const dice = g.dice ?? 0;

  const pieces: Record<string, LudoPos[]> = {};
  for (const id of g.order) pieces[id] = [...(g.pieces[id] ?? freshPieces())];

  // Schlagen: alle gegnerischen Figuren auf dem Zielfeld gehen zurück in die Garage.
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

  // Alle vier Figuren im Ziel: Platz sichern und aus dem Rennen nehmen.
  const justFinished = pieces[playerId].every((p) => p >= GOAL_BASE);
  if (justFinished) {
    const ranking = [...moved.ranking, playerId];
    moved = { ...moved, ranking, winnerId: moved.winnerId ?? ranking[0] };

    // Stehen die restlichen Plätze schon fest, ist die Partie vorbei.
    const decided = finishIfDecided(moved);
    if (decided.status === 'finished') return decided;
  }

  // Eine 6 bringt einen weiteren Zug – aber nicht mehr, wenn man fertig ist.
  const again = dice === 6 && !justFinished;
  const next = withTurn(moved, again ? playerId : nextPlayer(moved, playerId));
  return { ...next, updatedAt: Date.now() };
}
