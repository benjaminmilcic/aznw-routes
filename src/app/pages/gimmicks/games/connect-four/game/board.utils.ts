// Pure board helper functions – without Angular, without Firebase.
// The board is a flat array: index = row * COLS + col, row 0 is at the TOP.

export const COLS = 7;
export const ROWS = 6;

export function emptyBoard(): string[] {
  return Array.from({ length: ROWS * COLS }, () => '');
}

/** Index of the cell where a disc in this column would land (-1 = column full). */
export function dropIndex(board: string[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = r * COLS + col;
    if (!board[i]) return i;
  }
  return -1;
}

/** All columns a disc may still be dropped into. */
export function validCols(board: string[]): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[c]) cols.push(c); // top cell free?
  }
  return cols;
}

export function isBoardFull(board: string[]): boolean {
  return board.every((cell) => !!cell);
}

/**
 * Checks whether the disc at `lastIndex` made four in a row.
 * Returns the indices of the winning cells (for highlighting) or null.
 */
export function findWin(board: string[], lastIndex: number, player: string): number[] | null {
  const r0 = Math.floor(lastIndex / COLS);
  const c0 = lastIndex % COLS;
  // Directions: horizontal, vertical, both diagonals.
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const line = [lastIndex];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === player) {
      line.push(r * COLS + c);
      r += dr;
      c += dc;
    }
    r = r0 - dr;
    c = c0 - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === player) {
      line.unshift(r * COLS + c);
      r -= dr;
      c -= dc;
    }
    if (line.length >= 4) return line;
  }
  return null;
}

/** Fast yes/no variant for the computer's search. */
export function isWin(board: string[], lastIndex: number, player: string): boolean {
  return findWin(board, lastIndex, player) !== null;
}
