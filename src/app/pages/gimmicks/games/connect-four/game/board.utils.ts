// Reine Spielfeld-Hilfsfunktionen – ohne Angular, ohne Firebase.
// Das Spielfeld ist ein flaches Array: Index = row * COLS + col, row 0 ist OBEN.

export const COLS = 7;
export const ROWS = 6;

export function emptyBoard(): string[] {
  return Array.from({ length: ROWS * COLS }, () => '');
}

/** Index des Feldes, in dem ein Stein in dieser Spalte landen würde (-1 = Spalte voll). */
export function dropIndex(board: string[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = r * COLS + col;
    if (!board[i]) return i;
  }
  return -1;
}

/** Alle Spalten, in die noch geworfen werden darf. */
export function validCols(board: string[]): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[c]) cols.push(c); // oberste Zelle frei?
  }
  return cols;
}

export function isBoardFull(board: string[]): boolean {
  return board.every((cell) => !!cell);
}

/**
 * Prüft, ob der Stein auf `lastIndex` vier in eine Reihe gebracht hat.
 * Liefert die Indizes der Gewinn-Felder (zum Hervorheben) oder null.
 */
export function findWin(board: string[], lastIndex: number, player: string): number[] | null {
  const r0 = Math.floor(lastIndex / COLS);
  const c0 = lastIndex % COLS;
  // Richtungen: waagrecht, senkrecht, beide Diagonalen.
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

/** Schnelle Ja/Nein-Variante für die Suche des Computers. */
export function isWin(board: string[], lastIndex: number, player: string): boolean {
  return findWin(board, lastIndex, player) !== null;
}
