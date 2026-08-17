import {
  ADJACENCY,
  MILLS,
  PIECES,
  POINTS_COUNT,
  type MillGame,
  type MillPlayer,
} from './game.types';

export function emptyBoard(): number[] {
  return Array.from({ length: POINTS_COUNT }, () => -1);
}

export function phaseOf(g: MillGame): 'place' | 'move' {
  return g.placed.some((n) => n < PIECES) ? 'place' : 'move';
}

export function seatOf(g: MillGame, playerId: string): number {
  return g.order.indexOf(playerId);
}

export function otherId(g: MillGame, id: string): string | null {
  return g.order.find((x) => x !== id) ?? null;
}

export function count(board: number[], seat: number): number {
  let n = 0;
  for (const c of board) if (c === seat) n++;
  return n;
}

export function formsMill(board: number[], field: number, seat: number): boolean {
  return MILLS.some((m) => m.includes(field) && m.every((x) => board[x] === seat));
}

export function isInMill(board: number[], field: number, seat: number): boolean {
  return MILLS.some((m) => m.includes(field) && m.every((x) => board[x] === seat));
}

/** Wegnehmbare Steine: zuerst solche außerhalb einer Mühle. */
export function removable(board: number[], oppSeat: number): number[] {
  const opp: number[] = [];
  for (let i = 0; i < POINTS_COUNT; i++) if (board[i] === oppSeat) opp.push(i);
  const free = opp.filter((i) => !isInMill(board, i, oppSeat));
  return free.length > 0 ? free : opp;
}

export function targetsFor(g: MillGame, from: number): number[] {
  const seat = g.board[from];
  if (seat < 0) return [];
  if (count(g.board, seat) === 3) {
    const free: number[] = [];
    for (let i = 0; i < POINTS_COUNT; i++) if (g.board[i] === -1) free.push(i);
    return free;
  }
  return ADJACENCY[from].filter((n) => g.board[n] === -1);
}

export function hasAnyMove(g: MillGame, seat: number): boolean {
  const cnt = count(g.board, seat);
  if (cnt < 3) return false;
  if (cnt === 3) return g.board.some((c) => c === -1);
  for (let i = 0; i < POINTS_COUNT; i++) {
    if (g.board[i] === seat && ADJACENCY[i].some((n) => g.board[n] === -1)) return true;
  }
  return false;
}

export function canSelect(g: MillGame, playerId: string, index: number): boolean {
  if (g.status !== 'playing' || g.currentTurn !== playerId || g.removing) return false;
  if (phaseOf(g) !== 'move') return false;
  if (g.board[index] !== seatOf(g, playerId)) return false;
  return targetsFor(g, index).length > 0;
}

function applyWinCheck(next: MillGame): void {
  const loserSeat = next.order.indexOf(next.currentTurn);
  if (loserSeat < 0) return;
  const stillPlacing = (next.placed[loserSeat] ?? 0) < PIECES;
  if (stillPlacing) return;
  const cnt = count(next.board, loserSeat);
  const blocked = cnt < 3 || !hasAnyMove(next, loserSeat);
  if (blocked) {
    next.status = 'finished';
    next.winnerId = next.order[1 - loserSeat] ?? next.currentTurn;
    next.removing = false;
  }
}

function finishAction(
  g: MillGame,
  board: number[],
  placed: number[],
  field: number,
  type: 'place' | 'move',
  seat: number,
  playerId: string,
): MillGame {
  const oppSeat = 1 - seat;
  const mill = formsMill(board, field, seat);
  const canRemove = mill && removable(board, oppSeat).length > 0;

  const next: MillGame = {
    ...g,
    board,
    placed,
    lastAction: { by: playerId, type, at_field: field, mill, at: Date.now() },
    updatedAt: Date.now(),
  };

  if (canRemove) {
    next.removing = true;
  } else {
    next.removing = false;
    next.currentTurn = otherId(g, playerId) ?? playerId;
    applyWinCheck(next);
  }
  return next;
}

export function applyPlace(g: MillGame, index: number, playerId: string): MillGame | null {
  const seat = seatOf(g, playerId);
  if (g.status !== 'playing' || g.currentTurn !== playerId || g.removing) return null;
  if (phaseOf(g) !== 'place' || seat < 0 || (g.placed[seat] ?? 0) >= PIECES) return null;
  if (g.board[index] !== -1) return null;

  const board = [...g.board];
  board[index] = seat;
  const placed = [...g.placed];
  placed[seat] = (placed[seat] ?? 0) + 1;
  return finishAction(g, board, placed, index, 'place', seat, playerId);
}

export function applyMovePiece(g: MillGame, from: number, to: number, playerId: string): MillGame | null {
  const seat = seatOf(g, playerId);
  if (g.status !== 'playing' || g.currentTurn !== playerId || g.removing) return null;
  if (phaseOf(g) !== 'move') return null;
  if (g.board[from] !== seat || g.board[to] !== -1) return null;
  if (!targetsFor(g, from).includes(to)) return null;

  const board = [...g.board];
  board[from] = -1;
  board[to] = seat;
  return finishAction(g, board, [...g.placed], to, 'move', seat, playerId);
}

export function applyRemove(g: MillGame, index: number, playerId: string): MillGame | null {
  const seat = seatOf(g, playerId);
  if (g.status !== 'playing' || g.currentTurn !== playerId || !g.removing) return null;
  if (seat < 0 || !removable(g.board, 1 - seat).includes(index)) return null;

  const board = [...g.board];
  board[index] = -1;
  const next: MillGame = {
    ...g,
    board,
    removing: false,
    currentTurn: otherId(g, playerId) ?? playerId,
    lastAction: { by: playerId, type: 'remove', at_field: index, at: Date.now() },
    updatedAt: Date.now(),
  };
  applyWinCheck(next);
  return next;
}

export function freshRound(g: MillGame): MillGame {
  const starter =
    g.winnerId && g.order.includes(g.winnerId)
      ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
      : g.order[0];
  return {
    ...g,
    board: emptyBoard(),
    placed: [0, 0],
    currentTurn: starter,
    removing: false,
    status: 'playing',
    winnerId: null,
    lastAction: null,
    updatedAt: Date.now(),
  };
}

export function emptyLocalGame(host: MillPlayer, guest: MillPlayer): MillGame {
  return {
    code: '',
    status: 'playing',
    hostId: host.id,
    players: { [host.id]: host, [guest.id]: guest },
    order: [host.id, guest.id],
    board: emptyBoard(),
    placed: [0, 0],
    currentTurn: host.id,
    removing: false,
    winnerId: null,
    lastAction: null,
    rev: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
