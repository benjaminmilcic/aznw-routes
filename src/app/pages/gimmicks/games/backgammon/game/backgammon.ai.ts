// =============================================================
//  Computer-Gegner für Backgammon.
// =============================================================
// Der Würfel entscheidet ohnehin viel – der Computer wählt aus den
// erlaubten Teilzügen (je nach Spielstärke) den besten aus.
//
//   easy   – rein zufällig
//   medium – meistens der beste Zug, manchmal ein zufälliger
//   hard   – immer der bestbewertete komplette Zug (alle Würfel)
// =============================================================
import { anyMove, applyChecker, legalFor } from './backgammon.rules';
import type { Bar, BgColor, BgGame, BgLevel, BgMove } from './game.types';

const MAX_SEQUENCES = 1800;

/** Wählt den nächsten Teilzug des Computers. */
export function pickMove(g: BgGame, playerId: string, level: BgLevel): BgMove | null {
  const color = g.players[playerId]?.color;
  if (!color) return null;
  const bar: Bar = { white: g.barWhite, black: g.barBlack };
  const options: BgMove[] = [];
  for (const d of new Set(g.diceLeft)) {
    options.push(...legalFor(g.board, bar, color, d));
  }
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  if (level === 'easy') return options[Math.floor(Math.random() * options.length)];
  if (level === 'medium' && Math.random() < 0.35) {
    return options[Math.floor(Math.random() * options.length)];
  }

  const sequences = allSequences(
    g.board,
    bar,
    g.offWhite,
    g.offBlack,
    color,
    g.diceLeft,
  );
  if (sequences.length === 0) return options[0];

  let best = sequences[0];
  let bestScore = -Infinity;
  for (const seq of sequences) {
    const result = applySequence(g.board, bar, g.offWhite, g.offBlack, color, seq);
    const score = evaluate(result.board, result.bar, result.offWhite, result.offBlack, color);
    if (score > bestScore) {
      bestScore = score;
      best = seq;
    }
  }
  return best[0] ?? options[0];
}

function allSequences(
  board: number[],
  bar: Bar,
  offWhite: number,
  offBlack: number,
  color: BgColor,
  diceLeft: number[],
  acc: BgMove[] = [],
  out: BgMove[][] = [],
): BgMove[][] {
  if (out.length >= MAX_SEQUENCES) return out;
  if (diceLeft.length === 0 || !anyMove(board, bar, color, diceLeft)) {
    if (acc.length) out.push(acc);
    return out;
  }

  let found = false;
  for (const d of new Set(diceLeft)) {
    for (const m of legalFor(board, bar, color, d)) {
      found = true;
      const next = applyChecker(board, bar, offWhite, offBlack, color, m.from, m.to);
      const rest = [...diceLeft];
      rest.splice(rest.indexOf(d), 1);
      allSequences(next.board, next.bar, next.offWhite, next.offBlack, color, rest, [...acc, m], out);
      if (out.length >= MAX_SEQUENCES) return out;
    }
  }
  if (!found && acc.length) out.push(acc);
  return out;
}

function applySequence(
  board: number[],
  bar: Bar,
  offWhite: number,
  offBlack: number,
  color: BgColor,
  seq: BgMove[],
): { board: number[]; bar: Bar; offWhite: number; offBlack: number } {
  let state = { board, bar, offWhite, offBlack };
  for (const m of seq) {
    state = applyChecker(state.board, state.bar, state.offWhite, state.offBlack, color, m.from, m.to);
  }
  return state;
}

/** Je höher, desto besser für `color`. */
function evaluate(
  board: number[],
  bar: Bar,
  offWhite: number,
  offBlack: number,
  color: BgColor,
): number {
  const opp: BgColor = color === 'white' ? 'black' : 'white';
  const myOff = color === 'white' ? offWhite : offBlack;
  const oppOff = color === 'white' ? offBlack : offWhite;
  const myBar = color === 'white' ? bar.white : bar.black;
  const oppBar = color === 'white' ? bar.black : bar.white;

  let score = 0;
  score += myOff * 120;
  score -= oppOff * 120;
  score += oppBar * 45;
  score -= myBar * 55;
  score -= pipCount(board, bar, color);
  score += pipCount(board, bar, opp) * 0.9;
  score -= blotCount(board, color) * 10;
  score += blotCount(board, opp) * 4;
  score += madePoints(board, color) * 8;
  score += homeAnchors(board, color) * 14;
  score += primeBonus(board, color);
  return score;
}

function pipCount(board: number[], bar: Bar, color: BgColor): number {
  let pips = 0;
  if (color === 'white') {
    pips += bar.white * 25;
    for (let i = 0; i < 24; i++) if (board[i] > 0) pips += board[i] * (i + 1);
  } else {
    pips += bar.black * 25;
    for (let i = 0; i < 24; i++) if (board[i] < 0) pips += -board[i] * (24 - i);
  }
  return pips;
}

function blotCount(board: number[], color: BgColor): number {
  let n = 0;
  for (let i = 0; i < 24; i++) {
    if (color === 'white' ? board[i] === 1 : board[i] === -1) n++;
  }
  return n;
}

function madePoints(board: number[], color: BgColor): number {
  let n = 0;
  for (let i = 0; i < 24; i++) {
    if (color === 'white' ? board[i] >= 2 : board[i] <= -2) n++;
  }
  return n;
}

function homeAnchors(board: number[], color: BgColor): number {
  let n = 0;
  const from = color === 'white' ? 0 : 18;
  const to = color === 'white' ? 5 : 23;
  for (let i = from; i <= to; i++) {
    if (color === 'white' ? board[i] >= 2 : board[i] <= -2) n++;
  }
  return n;
}

function primeBonus(board: number[], color: BgColor): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < 24; i++) {
    const made = color === 'white' ? board[i] >= 2 : board[i] <= -2;
    if (made) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best >= 4 ? best * 12 : best * 3;
}
