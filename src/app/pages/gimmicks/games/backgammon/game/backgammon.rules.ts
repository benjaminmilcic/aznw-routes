import type { Bar, BgColor, BgGame, BgMove } from './game.types';

export const POINTS = 24;
export const CHECKERS = 15;

export function startBoard(): number[] {
  const b = new Array<number>(24).fill(0);
  // Weiß (+) zieht Richtung Index 0, Heimat 0–5.
  b[23] = 2;
  b[12] = 5;
  b[7] = 3;
  b[5] = 5;
  // Schwarz (−) zieht Richtung Index 23, Heimat 18–23.
  b[0] = -2;
  b[11] = -5;
  b[16] = -3;
  b[18] = -5;
  return b;
}

export function rollDice(): { dice: number[]; diceLeft: number[] } {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  return {
    dice: [d1, d2],
    diceLeft: d1 === d2 ? [d1, d1, d1, d1] : [d1, d2],
  };
}

export function nextPlayer(g: BgGame): string {
  const i = g.order.indexOf(g.currentTurn);
  return g.order[(i + 1) % g.order.length];
}

export function colorOf(id: string, g: BgGame): BgColor | null {
  return g.players[id]?.color ?? null;
}

/** Einstiegsfeld von der Bar für einen Würfelwert. */
function entryIndex(color: BgColor, die: number): number {
  return color === 'white' ? 24 - die : die - 1;
}

/** Darf eine Farbe auf diesem Punkt landen? (Gesperrt bei ≥2 gegnerischen Steinen.) */
function canLand(board: number[], color: BgColor, to: number): boolean {
  const v = board[to];
  return color === 'white' ? v >= -1 : v <= 1;
}

/** Sind alle eigenen Steine in der Heimat (Voraussetzung fürs Herausspielen)? */
function allHome(board: number[], bar: Bar, color: BgColor): boolean {
  if (color === 'white') {
    if (bar.white > 0) return false;
    for (let i = 6; i < 24; i++) if (board[i] > 0) return false;
  } else {
    if (bar.black > 0) return false;
    for (let i = 0; i < 18; i++) if (board[i] < 0) return false;
  }
  return true;
}

/** Kann der Stein bei Index i mit diesem Würfel herausgespielt werden? */
function canBearOff(board: number[], color: BgColor, i: number, die: number): boolean {
  if (color === 'white') {
    if (i < 0 || i > 5) return false;
    const need = i + 1;
    if (die === need) return true;
    if (die > need) {
      for (let j = i + 1; j <= 5; j++) if (board[j] > 0) return false;
      return true;
    }
    return false;
  }
  if (i < 18 || i > 23) return false;
  const need = 24 - i;
  if (die === need) return true;
  if (die > need) {
    for (let j = 18; j < i; j++) if (board[j] < 0) return false;
    return true;
  }
  return false;
}

/** Alle erlaubten Einzelzüge für eine Farbe mit einem bestimmten Würfelwert. */
export function legalFor(board: number[], bar: Bar, color: BgColor, die: number): BgMove[] {
  const moves: BgMove[] = [];
  const onBar = color === 'white' ? bar.white : bar.black;

  if (onBar > 0) {
    const to = entryIndex(color, die);
    if (canLand(board, color, to)) moves.push({ from: -1, to, die });
    return moves;
  }

  for (let i = 0; i < 24; i++) {
    const mine = color === 'white' ? board[i] > 0 : board[i] < 0;
    if (!mine) continue;
    const to = color === 'white' ? i - die : i + die;
    if (to >= 0 && to < 24) {
      if (canLand(board, color, to)) moves.push({ from: i, to, die });
    } else if (allHome(board, bar, color) && canBearOff(board, color, i, die)) {
      moves.push({ from: i, to: -1, die });
    }
  }
  return moves;
}

export function anyMove(board: number[], bar: Bar, color: BgColor, diceLeft: number[]): boolean {
  for (const d of new Set(diceLeft)) {
    if (legalFor(board, bar, color, d).length > 0) return true;
  }
  return false;
}

/** Felder (0–23, oder -1 für Bar), von denen aus aktuell gezogen werden kann. */
export function legalSources(g: BgGame, playerId: string): number[] {
  if (g.status !== 'playing' || g.currentTurn !== playerId || !g.rolled) return [];
  const color = colorOf(playerId, g);
  if (!color) return [];
  const bar: Bar = { white: g.barWhite, black: g.barBlack };
  const set = new Set<number>();
  for (const d of new Set(g.diceLeft)) {
    for (const m of legalFor(g.board, bar, color, d)) set.add(m.from);
  }
  return [...set];
}

/** Mögliche Ziele für einen Stein von „from" (pro Ziel der sparsamste Würfel). */
export function targetsFrom(g: BgGame, playerId: string, from: number): BgMove[] {
  const color = colorOf(playerId, g);
  if (!color) return [];
  const bar: Bar = { white: g.barWhite, black: g.barBlack };
  const byTo = new Map<number, BgMove>();
  for (const d of new Set(g.diceLeft)) {
    for (const m of legalFor(g.board, bar, color, d)) {
      if (m.from !== from) continue;
      const existing = byTo.get(m.to);
      if (!existing || d < existing.die) byTo.set(m.to, { from: m.from, to: m.to, die: d });
    }
  }
  return [...byTo.values()];
}

/** Wendet einen Steinzug auf eine Kopie des Spielstands an (null = ungültig). */
export function applyMove(
  g: BgGame,
  from: number,
  to: number,
  die: number,
  playerId: string,
): BgGame | null {
  if (g.status !== 'playing' || g.currentTurn !== playerId) return null;
  const color = colorOf(playerId, g);
  if (!color) return null;
  if (!g.diceLeft.includes(die)) return null;

  const bar: Bar = { white: g.barWhite, black: g.barBlack };
  if (!legalFor(g.board, bar, color, die).some((m) => m.from === from && m.to === to)) return null;

  const next = applyChecker(g.board, bar, g.offWhite, g.offBlack, color, from, to);
  const diceLeft = [...g.diceLeft];
  diceLeft.splice(diceLeft.indexOf(die), 1);
  const updatedAt = Date.now();
  const off = color === 'white' ? next.offWhite : next.offBlack;

  if (off >= CHECKERS) {
    return {
      ...g,
      board: next.board,
      barWhite: next.bar.white,
      barBlack: next.bar.black,
      offWhite: next.offWhite,
      offBlack: next.offBlack,
      status: 'finished',
      winnerId: playerId,
      dice: [],
      diceLeft: [],
      rolled: false,
      updatedAt,
    };
  }

  const canContinue = diceLeft.length > 0 && anyMove(next.board, next.bar, color, diceLeft);
  if (canContinue) {
    return {
      ...g,
      board: next.board,
      barWhite: next.bar.white,
      barBlack: next.bar.black,
      offWhite: next.offWhite,
      offBlack: next.offBlack,
      diceLeft,
      updatedAt,
    };
  }

  return {
    ...g,
    board: next.board,
    barWhite: next.bar.white,
    barBlack: next.bar.black,
    offWhite: next.offWhite,
    offBlack: next.offBlack,
    dice: [],
    diceLeft: [],
    rolled: false,
    currentTurn: nextPlayer(g),
    updatedAt,
  };
}

export function applyRoll(g: BgGame): BgGame {
  const { dice, diceLeft } = rollDice();
  return { ...g, dice, diceLeft, rolled: true, updatedAt: Date.now() };
}

export function applyPass(g: BgGame): BgGame {
  return {
    ...g,
    dice: [],
    diceLeft: [],
    rolled: false,
    currentTurn: nextPlayer(g),
    updatedAt: Date.now(),
  };
}

export function freshRound(starter: string): Pick<
  BgGame,
  | 'board'
  | 'barWhite'
  | 'barBlack'
  | 'offWhite'
  | 'offBlack'
  | 'status'
  | 'currentTurn'
  | 'dice'
  | 'diceLeft'
  | 'rolled'
  | 'winnerId'
  | 'updatedAt'
> {
  return {
    board: startBoard(),
    barWhite: 0,
    barBlack: 0,
    offWhite: 0,
    offBlack: 0,
    status: 'playing',
    currentTurn: starter,
    dice: [],
    diceLeft: [],
    rolled: false,
    winnerId: null,
    updatedAt: Date.now(),
  };
}

/** Reiner Steinzug auf Board/Bar/Off – für die KI-Bewertung. */
export function applyChecker(
  board: number[],
  bar: Bar,
  offWhite: number,
  offBlack: number,
  color: BgColor,
  from: number,
  to: number,
): { board: number[]; bar: Bar; offWhite: number; offBlack: number } {
  const nextBoard = [...board];
  const nextBar: Bar = { ...bar };
  let nextOffWhite = offWhite;
  let nextOffBlack = offBlack;
  const sign = color === 'white' ? 1 : -1;

  if (from === -1) {
    if (color === 'white') nextBar.white--;
    else nextBar.black--;
  } else {
    nextBoard[from] -= sign;
  }

  if (to === -1) {
    if (color === 'white') nextOffWhite++;
    else nextOffBlack++;
  } else if (color === 'white') {
    if (nextBoard[to] === -1) {
      nextBoard[to] = 1;
      nextBar.black++;
    } else {
      nextBoard[to] += 1;
    }
  } else if (nextBoard[to] === 1) {
    nextBoard[to] = -1;
    nextBar.white++;
  } else {
    nextBoard[to] -= 1;
  }

  return { board: nextBoard, bar: nextBar, offWhite: nextOffWhite, offBlack: nextOffBlack };
}
