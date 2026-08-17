import type { ChessColor, ChessGame, ChessMove, ChessPlayer, ChessPos } from './game.types';

export const SIZE = 8;

type Dir = [number, number];
const KNIGHT: Dir[] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const DIAG: Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHO: Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const AROUND: Dir[] = [...DIAG, ...ORTHO];

/** Startaufstellung: Schwarz oben, Weiß unten. */
export function startBoard(): string[] {
  const b = new Array<string>(64).fill('');
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[c] = back[c];
    b[8 + c] = 'p';
    b[48 + c] = 'P';
    b[56 + c] = back[c].toUpperCase();
  }
  return b;
}

export function colorOfPiece(p: string): ChessColor | null {
  if (!p) return null;
  return p === p.toUpperCase() ? 'white' : 'black';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pawnMoves(
  board: string[],
  i: number,
  r: number,
  c: number,
  color: ChessColor,
  enPassant: number | null,
  out: ChessMove[],
): void {
  const dir = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  const promoRow = color === 'white' ? 0 : 7;

  const r1 = r + dir;
  if (inBounds(r1, c) && board[r1 * 8 + c] === '') {
    out.push({ from: i, to: r1 * 8 + c, promo: r1 === promoRow });
    const r2 = r + 2 * dir;
    if (r === startRow && board[r2 * 8 + c] === '') {
      out.push({ from: i, to: r2 * 8 + c });
    }
  }
  for (const dc of [-1, 1]) {
    const nr = r + dir;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const j = nr * 8 + nc;
    const target = board[j];
    if (target && colorOfPiece(target) !== color) {
      out.push({ from: i, to: j, promo: nr === promoRow });
    } else if (enPassant !== null && j === enPassant) {
      out.push({ from: i, to: j, enPassant: true });
    }
  }
}

function stepMoves(
  board: string[],
  i: number,
  r: number,
  c: number,
  color: ChessColor,
  dirs: Dir[],
  out: ChessMove[],
): void {
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const j = nr * 8 + nc;
    if (colorOfPiece(board[j]) !== color) out.push({ from: i, to: j });
  }
}

function slideMoves(
  board: string[],
  i: number,
  r: number,
  c: number,
  color: ChessColor,
  dirs: Dir[],
  out: ChessMove[],
): void {
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const j = nr * 8 + nc;
      const occ = board[j];
      if (!occ) {
        out.push({ from: i, to: j });
      } else {
        if (colorOfPiece(occ) !== color) out.push({ from: i, to: j });
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function scanHit(board: string[], r: number, c: number, dr: number, dc: number, a: string, b: string): boolean {
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc)) {
    const p = board[nr * 8 + nc];
    if (p) return p === a || p === b;
    nr += dr;
    nc += dc;
  }
  return false;
}

/** Wird das Feld sq von Figuren der Farbe byColor angegriffen? */
export function isAttacked(board: string[], sq: number, byColor: ChessColor): boolean {
  const r = Math.floor(sq / 8);
  const c = sq % 8;
  const up = byColor === 'white';
  const pawnRow = up ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pawnRow, c + dc)) {
      const p = board[pawnRow * 8 + (c + dc)];
      if (p === (byColor === 'white' ? 'P' : 'p')) return true;
    }
  }
  for (const [dr, dc] of KNIGHT) {
    if (inBounds(r + dr, c + dc)) {
      const p = board[(r + dr) * 8 + (c + dc)];
      if (p === (byColor === 'white' ? 'N' : 'n')) return true;
    }
  }
  for (const [dr, dc] of AROUND) {
    if (inBounds(r + dr, c + dc)) {
      const p = board[(r + dr) * 8 + (c + dc)];
      if (p === (byColor === 'white' ? 'K' : 'k')) return true;
    }
  }
  const bishop = byColor === 'white' ? 'B' : 'b';
  const rook = byColor === 'white' ? 'R' : 'r';
  const queen = byColor === 'white' ? 'Q' : 'q';
  for (const [dr, dc] of DIAG) {
    if (scanHit(board, r, c, dr, dc, bishop, queen)) return true;
  }
  for (const [dr, dc] of ORTHO) {
    if (scanHit(board, r, c, dr, dc, rook, queen)) return true;
  }
  return false;
}

export function inCheck(board: string[], color: ChessColor): boolean {
  const king = color === 'white' ? 'K' : 'k';
  const sq = board.indexOf(king);
  if (sq < 0) return false;
  return isAttacked(board, sq, color === 'white' ? 'black' : 'white');
}

export function kingSquare(board: string[], color: ChessColor): number {
  return board.indexOf(color === 'white' ? 'K' : 'k');
}

function castleMoves(board: string[], color: ChessColor, castling: string, out: ChessMove[]): void {
  const row = color === 'white' ? 7 : 0;
  const kingIdx = row * 8 + 4;
  const king = color === 'white' ? 'K' : 'k';
  if (board[kingIdx] !== king) return;
  const enemy: ChessColor = color === 'white' ? 'black' : 'white';
  if (isAttacked(board, kingIdx, enemy)) return;

  const kRight = color === 'white' ? 'K' : 'k';
  const qRight = color === 'white' ? 'Q' : 'q';
  const rook = color === 'white' ? 'R' : 'r';

  if (castling.includes(kRight)) {
    const f = row * 8 + 5;
    const gsq = row * 8 + 6;
    if (
      board[f] === '' &&
      board[gsq] === '' &&
      board[row * 8 + 7] === rook &&
      !isAttacked(board, f, enemy) &&
      !isAttacked(board, gsq, enemy)
    ) {
      out.push({ from: kingIdx, to: gsq, castle: 'K' });
    }
  }
  if (castling.includes(qRight)) {
    const d = row * 8 + 3;
    const cs = row * 8 + 2;
    const b = row * 8 + 1;
    if (
      board[d] === '' &&
      board[cs] === '' &&
      board[b] === '' &&
      board[row * 8 + 0] === rook &&
      !isAttacked(board, d, enemy) &&
      !isAttacked(board, cs, enemy)
    ) {
      out.push({ from: kingIdx, to: cs, castle: 'Q' });
    }
  }
}

function pseudoMoves(board: string[], color: ChessColor, castling: string, enPassant: number | null): ChessMove[] {
  const moves: ChessMove[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (colorOfPiece(p) !== color) continue;
    const type = p.toLowerCase();
    const r = Math.floor(i / 8);
    const c = i % 8;
    if (type === 'p') pawnMoves(board, i, r, c, color, enPassant, moves);
    else if (type === 'n') stepMoves(board, i, r, c, color, KNIGHT, moves);
    else if (type === 'k') stepMoves(board, i, r, c, color, AROUND, moves);
    else if (type === 'b') slideMoves(board, i, r, c, color, DIAG, moves);
    else if (type === 'r') slideMoves(board, i, r, c, color, ORTHO, moves);
    else if (type === 'q') slideMoves(board, i, r, c, color, AROUND, moves);
  }
  castleMoves(board, color, castling, moves);
  return moves;
}

export function applyToBoard(board: string[], mv: ChessMove, color: ChessColor): string[] {
  const b = [...board];
  const p = b[mv.from];
  b[mv.from] = '';
  if (mv.enPassant) {
    const capRow = Math.floor(mv.from / 8);
    const capCol = mv.to % 8;
    b[capRow * 8 + capCol] = '';
  }
  b[mv.to] = mv.promo ? (color === 'white' ? 'Q' : 'q') : p;
  if (mv.castle) {
    const row = color === 'white' ? 7 : 0;
    if (mv.castle === 'K') {
      b[row * 8 + 5] = b[row * 8 + 7];
      b[row * 8 + 7] = '';
    } else {
      b[row * 8 + 3] = b[row * 8 + 0];
      b[row * 8 + 0] = '';
    }
  }
  return b;
}

export function updateCastling(castling: string, board: string[], mv: ChessMove): string {
  let rights = castling.replace('-', '');
  const piece = board[mv.from];
  if (piece === 'K') rights = rights.replace('K', '').replace('Q', '');
  if (piece === 'k') rights = rights.replace('k', '').replace('q', '');
  const drop = (idx: number) => {
    if (idx === 63) rights = rights.replace('K', '');
    if (idx === 56) rights = rights.replace('Q', '');
    if (idx === 7) rights = rights.replace('k', '');
    if (idx === 0) rights = rights.replace('q', '');
  };
  drop(mv.from);
  drop(mv.to);
  return rights || '-';
}

export function newEnPassant(board: string[], mv: ChessMove): number | null {
  const piece = board[mv.from];
  if (piece !== 'P' && piece !== 'p') return null;
  if (Math.abs(mv.to - mv.from) === 16) return (mv.from + mv.to) / 2;
  return null;
}

export function legalMoves(
  board: string[],
  color: ChessColor,
  castling: string,
  enPassant: number | null,
): ChessMove[] {
  return pseudoMoves(board, color, castling, enPassant).filter((mv) => {
    const after = applyToBoard(board, mv, color);
    return !inCheck(after, color);
  });
}

export function legalMovesOf(pos: ChessPos): ChessMove[] {
  return legalMoves(pos.board, pos.turn, pos.castling, pos.enPassant);
}

export function applyMoveToPos(pos: ChessPos, mv: ChessMove): ChessPos {
  return {
    board: applyToBoard(pos.board, mv, pos.turn),
    turn: pos.turn === 'white' ? 'black' : 'white',
    castling: updateCastling(pos.castling, pos.board, mv),
    enPassant: newEnPassant(pos.board, mv),
  };
}

export function posFromGame(g: ChessGame): ChessPos {
  const color = g.players[g.currentTurn]?.color ?? 'white';
  return {
    board: g.board,
    turn: color,
    castling: g.castling,
    enPassant: g.enPassant,
  };
}

function nextPlayer(g: ChessGame): string {
  const i = g.order.indexOf(g.currentTurn);
  return g.order[(i + 1) % g.order.length];
}

/**
 * Führt einen Zug aus. Gibt null zurück, wenn der Zug nicht erlaubt ist.
 * `winnerId === 'draw'` bedeutet Patt.
 */
export function applyMove(g: ChessGame, from: number, to: number, playerId: string): ChessGame | null {
  if (g.status !== 'playing' || g.currentTurn !== playerId) return null;
  const color = g.players[playerId]?.color;
  if (!color) return null;

  const legal = legalMoves(g.board, color, g.castling, g.enPassant);
  const mv = legal.find((m) => m.from === from && m.to === to);
  if (!mv) return null;

  const board = applyToBoard(g.board, mv, color);
  const castling = updateCastling(g.castling, g.board, mv);
  const enPassant = newEnPassant(g.board, mv);
  const nextColor: ChessColor = color === 'white' ? 'black' : 'white';
  const nextLegal = legalMoves(board, nextColor, castling, enPassant);
  const nextInCheck = inCheck(board, nextColor);

  const next: ChessGame = {
    ...g,
    board,
    castling,
    enPassant,
    lastMove: { from, to },
    updatedAt: Date.now(),
    check: nextInCheck,
  };

  if (nextLegal.length === 0) {
    next.status = 'finished';
    next.winnerId = nextInCheck ? playerId : 'draw';
  } else {
    next.currentTurn = nextPlayer(g);
  }
  return next;
}

export function freshRound(g: ChessGame): Partial<ChessGame> {
  return {
    board: startBoard(),
    status: 'playing',
    currentTurn: g.order[0],
    castling: 'KQkq',
    enPassant: null,
    check: false,
    winnerId: null,
    lastMove: null,
    updatedAt: Date.now(),
  };
}

export function emptyLocalGame(host: ChessPlayer, guest: ChessPlayer): ChessGame {
  return {
    code: '',
    status: 'playing',
    hostId: host.id,
    board: startBoard(),
    currentTurn: host.id,
    order: [host.id, guest.id],
    players: { [host.id]: host, [guest.id]: guest },
    castling: 'KQkq',
    enPassant: null,
    check: false,
    winnerId: null,
    lastMove: null,
    rev: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
