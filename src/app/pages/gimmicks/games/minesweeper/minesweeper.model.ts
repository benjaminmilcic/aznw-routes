export interface MinesweeperCell {
  hasMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  row: number;
  col: number;
}

export interface MinesweeperDifficulty {
  name: string;
  rows: number;
  cols: number;
  mines: number;
  disabled: boolean;
}

export type MinesweeperTheme = 'light' | 'dark';
