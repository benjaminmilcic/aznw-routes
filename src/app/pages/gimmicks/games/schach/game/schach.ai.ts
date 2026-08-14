// =============================================================
//  Computer-Gegner für Schach.
// =============================================================
// Negamax mit Alpha-Beta, Zugsortierung und ruhiger Stellung
// (Quieszenz nur für Schläge), damit hart nicht nur "greift irgendwas".
//
//   easy   – oft zufällig, manchmal der beste Zug der Tiefe 1
//   medium – iterative Vertiefung bis Tiefe 2 (~0,2 s)
//   hard   – iterative Vertiefung bis Tiefe 3 plus Quieszenz (~0,5 s)
// =============================================================
import {
  applyMoveToPos,
  colorOfPiece,
  inCheck,
  legalMovesOf,
  posFromGame,
} from './schach.rules';
import type { ChessColor, ChessGame, ChessLevel, ChessMove, ChessPos } from './game.types';

const MATE = 100000;
const PIECE: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

/** Positionsbonus aus Sicht von Weiß (Index 0 = a8, wie das Brett). */
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function flip(i: number): number {
  return (7 - Math.floor(i / 8)) * 8 + (i % 8);
}

/** Material + Felder, immer aus Sicht von Weiß. */
export function evaluate(pos: ChessPos): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i];
    if (!p) continue;
    const t = p.toLowerCase();
    const val = PIECE[t] + (PST[t]?.[colorOfPiece(p) === 'white' ? i : flip(i)] ?? 0);
    s += colorOfPiece(p) === 'white' ? val : -val;
  }
  return s;
}

function captureValue(board: string[], mv: ChessMove): number {
  if (mv.enPassant) return PIECE['p'];
  const t = board[mv.to];
  return t ? PIECE[t.toLowerCase()] ?? 0 : 0;
}

function orderMoves(pos: ChessPos, moves: ChessMove[]): ChessMove[] {
  const scored = moves.map((mv) => {
    let s = 0;
    const cap = captureValue(pos.board, mv);
    if (cap) {
      const att = PIECE[pos.board[mv.from].toLowerCase()] ?? 0;
      s = 10_000 + cap * 10 - att;
    }
    if (mv.promo) s += 800;
    if (mv.castle) s += 40;
    return { mv, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.mv);
}

interface SearchCtl {
  nodes: number;
  deadline: number;
  aborted: boolean;
}

function timedOut(ctl: SearchCtl): boolean {
  if (ctl.aborted) return true;
  if (ctl.nodes % 64 === 0 && Date.now() > ctl.deadline) {
    ctl.aborted = true;
    return true;
  }
  return false;
}

function quiesce(pos: ChessPos, alpha: number, beta: number, qDepth: number, ctl: SearchCtl): number {
  ctl.nodes++;
  if (timedOut(ctl) || qDepth <= 0) {
    const stand = pos.turn === 'white' ? evaluate(pos) : -evaluate(pos);
    return stand;
  }

  const standPat = pos.turn === 'white' ? evaluate(pos) : -evaluate(pos);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = legalMovesOf(pos).filter((m) => m.enPassant || !!pos.board[m.to] || m.promo);
  for (const mv of orderMoves(pos, captures)) {
    if (timedOut(ctl)) break;
    const score = -quiesce(applyMoveToPos(pos, mv), -beta, -alpha, qDepth - 1, ctl);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(
  pos: ChessPos,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  qDepth: number,
  ctl: SearchCtl,
): number {
  ctl.nodes++;
  if (timedOut(ctl)) return 0;

  const moves = legalMovesOf(pos);
  if (moves.length === 0) {
    if (inCheck(pos.board, pos.turn)) return -MATE + ply;
    return 0;
  }
  if (depth <= 0) return quiesce(pos, alpha, beta, qDepth, ctl);

  let best = -Infinity;
  for (const mv of orderMoves(pos, moves)) {
    if (timedOut(ctl)) break;
    const score = -negamax(applyMoveToPos(pos, mv), depth - 1, -beta, -alpha, ply + 1, qDepth, ctl);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

function searchRoot(pos: ChessPos, depth: number, qDepth: number, ctl: SearchCtl): { move: ChessMove; score: number } | null {
  const moves = orderMoves(pos, legalMovesOf(pos));
  if (moves.length === 0) return null;

  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const mv of moves) {
    if (timedOut(ctl) && bestScore > -Infinity) break;
    const score = -negamax(applyMoveToPos(pos, mv), depth - 1, -beta, -alpha, 1, qDepth, ctl);
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
    if (score > alpha) alpha = score;
  }
  return { move: best, score: bestScore };
}

function randomOf(moves: ChessMove[]): ChessMove {
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Wählt den nächsten Zug des Computers. */
export function pickMove(g: ChessGame, playerId: string, level: ChessLevel): ChessMove | null {
  const color: ChessColor | undefined = g.players[playerId]?.color;
  if (!color) return null;
  const pos = posFromGame(g);
  const moves = legalMovesOf(pos);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  if (level === 'easy') {
    if (Math.random() < 0.6) return randomOf(moves);
    const ctl: SearchCtl = { nodes: 0, deadline: Date.now() + 80, aborted: false };
    return searchRoot(pos, 1, 0, ctl)?.move ?? randomOf(moves);
  }

  const hard = level === 'hard';
  const maxDepth = hard ? 3 : 2;
  const qDepth = hard ? 2 : 0;
  const ctl: SearchCtl = {
    nodes: 0,
    deadline: Date.now() + (hard ? 520 : 180),
    aborted: false,
  };

  let best = moves[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const found = searchRoot(pos, depth, qDepth, ctl);
    if (found) best = found.move;
    if (ctl.aborted) break;
  }
  return best;
}
