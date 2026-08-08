// =============================================================
//  Computer-Gegner für "Mensch ärgere dich nicht".
// =============================================================
// Der Würfel entscheidet ohnehin das meiste – der Computer wählt also nur
// aus den erlaubten Zügen den (je nach Spielstärke) besten aus.
//
//   easy   – rein zufällig, macht Anfängerfehler
//   medium – meistens der beste Zug, manchmal ein zufälliger
//   hard   – immer der bestbewertete Zug (schlägt, rettet, geht ins Ziel)
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

/** Wählt den Zug des Computers aus den erlaubten Zügen. */
export function bestMove(
  g: LudoGame,
  playerId: string,
  moves: LudoMove[],
  level: LudoLevel,
): LudoMove | null {
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  if (level === 'easy') return moves[Math.floor(Math.random() * moves.length)];

  // "medium" greift ab und zu daneben, damit Kinder eine Chance haben.
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

/** Bewertet einen Zug – je höher, desto besser. */
function rate(g: LudoGame, playerId: string, move: LudoMove): number {
  const from = (g.pieces[playerId] ?? [])[move.pieceIndex] ?? HOME;
  let score = 0;

  // Einen Gegner rauswerfen ist fast immer das Beste.
  if (move.captures) score += 120;

  // Ins Zielhaus einbiegen – je weiter hinein, desto besser.
  if (move.to >= GOAL_BASE) score += 70 + (move.to - GOAL_BASE) * 6;

  // Eine Figur aus der Garage holen bringt Druck aufs Brett.
  if (from === HOME) score += 80;

  // Eine bedrohte Figur in Sicherheit bringen …
  if (isThreatened(g, playerId, from)) score += 45;
  // … aber nicht in die nächste Gefahr hinein.
  if (isThreatened(g, playerId, move.to)) score -= 40;

  // Sonst zählt der Fortschritt Richtung Ziel.
  score += move.to * 0.5;

  return score;
}

/**
 * Steht die Figur auf einem Feld, das ein Gegner mit einem Wurf 1–6 erreicht?
 * Figuren in der Garage oder im Zielhaus sind sicher.
 */
function isThreatened(g: LudoGame, id: string, pos: LudoPos): boolean {
  if (pos < 0 || pos >= TRACK_LEN) return false;
  const cell = trackCell(g, id, pos);

  for (const other of g.order) {
    if (other === id) continue;
    for (const p of g.pieces[other] ?? []) {
      if (p < 0 || p >= TRACK_LEN) continue;
      const dist = (cell - trackCell(g, other, p) + TRACK_LEN) % TRACK_LEN;
      // Der Gegner muss das Feld mit einem Wurf erreichen können, ohne dabei
      // schon in sein eigenes Zielhaus einzubiegen.
      if (dist >= 1 && dist <= 6 && p + dist < TRACK_LEN) return true;
    }
  }
  return false;
}
