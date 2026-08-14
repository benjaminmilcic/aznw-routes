// =============================================================
//  Computer-Gegner für Mühle.
// =============================================================
//   easy   – rein zufällig
//   medium – meistens der beste Zug, manchmal ein zufälliger
//   hard   – immer der bestbewertete Zug
// =============================================================
import { ADJACENCY, MILLS, POINTS_COUNT } from './game.types';
import {
  applyMovePiece,
  applyPlace,
  applyRemove,
  count,
  formsMill,
  phaseOf,
  removable,
  seatOf,
  targetsFor,
} from './mill.rules';
import type { MillGame, MillLevel } from './game.types';

export type MillChoice =
  | { kind: 'place'; index: number }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'remove'; index: number };

/** Wählt die nächste Aktion des Computers. */
export function pickAction(g: MillGame, playerId: string, level: MillLevel): MillChoice | null {
  const options = allChoices(g, playerId);
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  if (level === 'easy') return options[Math.floor(Math.random() * options.length)];
  if (level === 'medium' && Math.random() < 0.3) {
    return options[Math.floor(Math.random() * options.length)];
  }

  let best = options[0];
  let bestScore = -Infinity;
  for (const choice of options) {
    const score = scoreChoice(g, playerId, choice);
    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  }
  return best;
}

function allChoices(g: MillGame, playerId: string): MillChoice[] {
  const seat = seatOf(g, playerId);
  if (seat < 0) return [];

  if (g.removing) {
    return removable(g.board, 1 - seat).map((index) => ({ kind: 'remove', index }));
  }

  if (phaseOf(g) === 'place') {
    const out: MillChoice[] = [];
    for (let i = 0; i < POINTS_COUNT; i++) {
      if (g.board[i] === -1) out.push({ kind: 'place', index: i });
    }
    return out;
  }

  const out: MillChoice[] = [];
  for (let from = 0; from < POINTS_COUNT; from++) {
    if (g.board[from] !== seat) continue;
    for (const to of targetsFor(g, from)) out.push({ kind: 'move', from, to });
  }
  return out;
}

function scoreChoice(g: MillGame, playerId: string, choice: MillChoice): number {
  const seat = seatOf(g, playerId);
  const opp = 1 - seat;
  let next: MillGame | null = null;

  if (choice.kind === 'place') {
    next = applyPlace(g, choice.index, playerId);
    if (!next) return -9999;
    return scoreBoard(next, seat, opp) + millBonus(g.board, choice.index, seat, opp);
  }

  if (choice.kind === 'move') {
    next = applyMovePiece(g, choice.from, choice.to, playerId);
    if (!next) return -9999;
    return scoreBoard(next, seat, opp) + millBonus(g.board, choice.to, seat, opp);
  }

  next = applyRemove(g, choice.index, playerId);
  if (!next) return -9999;
  let s = scoreBoard(next, seat, opp);
  if (formsMill(g.board, choice.index, opp)) s += 18;
  if (count(next.board, opp) < 3 && phaseOf(g) === 'move') s += 80;
  return s;
}

function millBonus(board: number[], field: number, seat: number, opp: number): number {
  let s = 0;
  const after = [...board];
  after[field] = seat;
  if (formsMill(after, field, seat)) s += 90;
  if (almostMill(board, field, seat)) s += 22;
  if (almostMill(board, field, opp)) s += 55;
  s += centrality(field);
  return s;
}

function almostMill(board: number[], field: number, seat: number): boolean {
  return MILLS.some((m) => {
    if (!m.includes(field)) return false;
    let mine = 0;
    let empty = 0;
    for (const x of m) {
      if (x === field) continue;
      if (board[x] === seat) mine++;
      else if (board[x] === -1) empty++;
    }
    return mine === 1 && empty === 1;
  });
}

function centrality(i: number): number {
  const n = ADJACENCY[i]?.length ?? 0;
  return n * 1.5;
}

function scoreBoard(g: MillGame, seat: number, opp: number): number {
  let s = count(g.board, seat) * 6 - count(g.board, opp) * 6;
  if (g.removing && g.currentTurn === g.order[seat]) s += 40;
  if (g.status === 'finished' && g.winnerId === g.order[seat]) s += 400;
  if (g.status === 'finished' && g.winnerId === g.order[opp]) s -= 400;
  return s + Math.random() * 0.2;
}
