// =============================================================
//  Computer-Gegner für Dame.
// =============================================================
//   easy   – rein zufällig
//   medium – meistens der beste Zug, manchmal ein zufälliger
//   hard   – immer der bestbewertete Zug
// =============================================================
import { allCaptures, applyMove, captureMovesFrom, cellColor, isKing, legalMoves } from './dame.rules';
import type { DameColor, DameGame, DameLevel, DameMove } from './game.types';

/** Wählt den nächsten Zug des Computers. */
export function pickMove(g: DameGame, playerId: string, level: DameLevel): DameMove | null {
  const color = g.players[playerId]?.color;
  if (!color) return null;
  const options = legalMoves(g.board, color, g.continueFrom);
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  if (level === 'easy') return options[Math.floor(Math.random() * options.length)];
  if (level === 'medium' && Math.random() < 0.35) {
    return options[Math.floor(Math.random() * options.length)];
  }

  let best = options[0];
  let bestScore = -Infinity;
  for (const mv of options) {
    const score = scoreMove(g, mv, playerId, color);
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best;
}

function scoreMove(g: DameGame, mv: DameMove, playerId: string, color: DameColor): number {
  const next = applyMove(g, mv.from, mv.to, playerId);
  if (!next) return -9999;

  let s = 0;
  if (mv.captured !== null) s += 55;
  if (g.board[mv.from] && !isKing(g.board[mv.from]) && isKing(next.board[mv.to])) s += 40;
  if (mv.captured !== null && next.continueFrom === mv.to) s += 28;
  s += material(next.board, color) * 4;
  s -= material(next.board, color === 'white' ? 'black' : 'white') * 4;

  const opp: DameColor = color === 'white' ? 'black' : 'white';
  if (allCaptures(next.board, opp).length === 0) s += 8;
  if (captureMovesFrom(next.board, mv.to).length > 0 && next.continueFrom === mv.to) s += 12;

  const row = Math.floor(mv.to / 8);
  const col = mv.to % 8;
  s += 2 - Math.abs(3.5 - col);
  if (color === 'white') s += (7 - row) * 0.4;
  else s += row * 0.4;

  return s + Math.random() * 0.2;
}

function material(board: string[], color: DameColor): number {
  let n = 0;
  for (const c of board) {
    if (cellColor(c) !== color) continue;
    n += isKing(c) ? 5 : 3;
  }
  return n;
}
