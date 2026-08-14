import type { DameColor, DameGame, DameMove, DamePlayer } from './game.types';

export const SIZE = 8;

type Dir = [number, number];
const KING_DIRS: Dir[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/** Startaufstellung: Schwarz oben, Weiß unten, nur auf dunklen Feldern. */
export function startBoard(): string[] {
  const b = new Array<string>(SIZE * SIZE).fill('');
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r < 3) b[r * SIZE + c] = 'b';
      else if (r > 4) b[r * SIZE + c] = 'w';
    }
  }
  return b;
}

export function cellColor(c: string): DameColor | null {
  if (!c) return null;
  return c.toLowerCase() === 'w' ? 'white' : 'black';
}

export function isKing(c: string): boolean {
  return c === 'W' || c === 'B';
}

function moveDirs(cell: string, color: DameColor): Dir[] {
  if (isKing(cell)) return KING_DIRS;
  return color === 'white'
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function simpleMovesFrom(board: string[], i: number): DameMove[] {
  const cell = board[i];
  const color = cellColor(cell);
  if (!color) return [];
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const king = isKing(cell);
  const moves: DameMove[] = [];
  for (const [dr, dc] of moveDirs(cell, color)) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && board[nr * SIZE + nc] === '') {
      moves.push({ from: i, to: nr * SIZE + nc, captured: null });
      if (!king) break;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

export function captureMovesFrom(board: string[], i: number): DameMove[] {
  const cell = board[i];
  const color = cellColor(cell);
  if (!color) return [];
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const king = isKing(cell);
  const moves: DameMove[] = [];
  for (const [dr, dc] of moveDirs(cell, color)) {
    if (king) {
      let sr = r + dr;
      let sc = c + dc;
      while (inBounds(sr, sc) && board[sr * SIZE + sc] === '') {
        sr += dr;
        sc += dc;
      }
      if (!inBounds(sr, sc)) continue;
      const mid = board[sr * SIZE + sc];
      if (cellColor(mid) === color) continue;
      let lr = sr + dr;
      let lc = sc + dc;
      while (inBounds(lr, lc) && board[lr * SIZE + lc] === '') {
        moves.push({ from: i, to: lr * SIZE + lc, captured: sr * SIZE + sc });
        lr += dr;
        lc += dc;
      }
    } else {
      const mr = r + dr;
      const mc = c + dc;
      const jr = r + 2 * dr;
      const jc = c + 2 * dc;
      if (!inBounds(jr, jc)) continue;
      const mid = board[mr * SIZE + mc];
      const land = board[jr * SIZE + jc];
      if (mid && cellColor(mid) !== color && land === '') {
        moves.push({ from: i, to: jr * SIZE + jc, captured: mr * SIZE + mc });
      }
    }
  }
  return moves;
}

export function allCaptures(board: string[], color: DameColor): DameMove[] {
  const moves: DameMove[] = [];
  for (let i = 0; i < board.length; i++) {
    if (cellColor(board[i]) === color) moves.push(...captureMovesFrom(board, i));
  }
  return moves;
}

/** Alle erlaubten Züge (Schlagzwang: gibt es Schläge, sind nur diese erlaubt). */
export function legalMoves(board: string[], color: DameColor, continueFrom: number | null): DameMove[] {
  if (continueFrom !== null) return captureMovesFrom(board, continueFrom);
  const caps = allCaptures(board, color);
  if (caps.length > 0) return caps;
  const moves: DameMove[] = [];
  for (let i = 0; i < board.length; i++) {
    if (cellColor(board[i]) === color) moves.push(...simpleMovesFrom(board, i));
  }
  return moves;
}

function nextPlayer(g: DameGame): string {
  const i = g.order.indexOf(g.currentTurn);
  return g.order[(i + 1) % g.order.length];
}

/**
 * Führt einen Zug aus. Gibt null zurück, wenn der Zug nicht erlaubt ist.
 * Bei Mehrfachschlag bleibt derselbe Spieler dran (`continueFrom`).
 */
export function applyMove(g: DameGame, from: number, to: number, playerId: string): DameGame | null {
  if (g.status !== 'playing' || g.currentTurn !== playerId) return null;
  const color = g.players[playerId]?.color;
  if (!color) return null;

  const legal = legalMoves(g.board, color, g.continueFrom);
  const mv = legal.find((m) => m.from === from && m.to === to);
  if (!mv) return null;

  const board = [...g.board];
  const piece = board[from];
  board[from] = '';
  if (mv.captured !== null) board[mv.captured] = '';
  board[to] = piece;

  let promoted = false;
  const row = Math.floor(to / SIZE);
  if (piece === 'w' && row === 0) {
    board[to] = 'W';
    promoted = true;
  } else if (piece === 'b' && row === SIZE - 1) {
    board[to] = 'B';
    promoted = true;
  }

  let continueFrom: number | null = null;
  if (mv.captured !== null && !promoted && captureMovesFrom(board, to).length > 0) {
    continueFrom = to;
  }

  const next: DameGame = {
    ...g,
    board,
    lastMove: { from, to },
    updatedAt: Date.now(),
  };

  if (continueFrom !== null) {
    next.continueFrom = continueFrom;
    return next;
  }

  const nextColor: DameColor = color === 'white' ? 'black' : 'white';
  next.continueFrom = null;
  if (legalMoves(board, nextColor, null).length === 0) {
    next.status = 'finished';
    next.winnerId = playerId;
  } else {
    next.currentTurn = nextPlayer(g);
  }
  return next;
}

/** Neue Runde auf demselben Spiel – der Verlierer beginnt. */
export function freshRound(g: DameGame): Partial<DameGame> {
  const starter =
    g.winnerId && g.order.includes(g.winnerId)
      ? g.order.find((id) => id !== g.winnerId) ?? g.order[0]
      : g.order[0];
  return {
    board: startBoard(),
    status: 'playing',
    currentTurn: starter,
    continueFrom: null,
    winnerId: null,
    lastMove: null,
    updatedAt: Date.now(),
  };
}

export function emptyLocalGame(host: DamePlayer, guest: DamePlayer): DameGame {
  return {
    code: '',
    status: 'playing',
    hostId: host.id,
    board: startBoard(),
    currentTurn: host.id,
    continueFrom: null,
    order: [host.id, guest.id],
    players: { [host.id]: host, [guest.id]: guest },
    winnerId: null,
    lastMove: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
