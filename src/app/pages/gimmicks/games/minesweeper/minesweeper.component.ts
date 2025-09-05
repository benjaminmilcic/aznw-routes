import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  signal,
  computed,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import {
  MinesweeperCell,
  MinesweeperDifficulty,
  MinesweeperTheme,
} from './minesweeper.model';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-minesweeper',
  imports: [CommonModule, FormsModule, MatButtonModule, TranslateModule],
  templateUrl: './minesweeper.component.html',
  styleUrl: './minesweeper.component.css',
  host: {
    '[class.dark]': 'theme() === "dark"',
  },
})
export class MinesweeperComponent implements AfterViewInit {
  // 🎚️ Schwierigkeitsgrade
  difficulties: MinesweeperDifficulty[] = [
    {
      name: 'Beginner (9x9, 10 Minen)',
      rows: 9,
      cols: 9,
      mines: 10,
      disabled: false,
    },
    {
      name: 'Fortgeschritten (16x16, 40 Minen)',
      rows: 16,
      cols: 16,
      mines: 40,
      disabled: false,
    },
    {
      name: 'Profi (30x16, 99 Minen)',
      rows: 16,
      cols: 30,
      mines: 99,
      disabled: false,
    },
  ];

  selectedDifficulty = signal<MinesweeperDifficulty>(this.difficulties[0]);
  board = signal<MinesweeperCell[][]>([]);
  gameOver = signal(false);
  gameWon = signal(false);
  firstClick = signal(true);
  theme = signal<MinesweeperTheme>('light');
  seconds = signal(0);
  timerRunning = signal(false);
  bestTime = signal<number | null>(null);

  private timerInterval?: number;
  private cellSize = 30;

  rows = computed(() => this.selectedDifficulty().rows);
  cols = computed(() => this.selectedDifficulty().cols);
  mineCount = computed(() => this.selectedDifficulty().mines);
  flaggedCount = computed(() => {
    let count = 0;
    for (const row of this.board()) {
      for (const cell of row) {
        if (cell.isFlagged) count++;
      }
    }
    return count;
  });
  remainingMines = computed(() => this.mineCount() - this.flaggedCount());

  @HostListener('window:resize')
  onResize() {
    this.updateDifficultyAvailability();
  }

  hasMouse: boolean;

  constructor() {
    this.hasMouse = window.matchMedia('(pointer:fine)').matches;
    this.startNewGame();
  }

  ngAfterViewInit() {
    this.updateDifficultyAvailability();
  }

  startNewGame() {
    const rows = this.rows();
    const cols = this.cols();

    const newBoard: MinesweeperCell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: MinesweeperCell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          hasMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
          row: r,
          col: c,
        });
      }
      newBoard.push(row);
    }
    this.resetTimer();
    this.board.set(newBoard);
    this.gameOver.set(false);
    this.gameWon.set(false);
    this.firstClick.set(true);
    this.updateBestTime();
  }

  countAdjacentMines(board: MinesweeperCell[][], r: number, c: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr,
          nc = c + dc;
        if (this.inBounds(nr, nc) && board[nr][nc].hasMine) {
          count++;
        }
      }
    }
    return count;
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < this.rows() && c >= 0 && c < this.cols();
  }

  reveal(cell: MinesweeperCell) {
    if (this.gameOver() || cell.isRevealed || cell.isFlagged) return;

    // 👉 Sonderfall: 1. Klick → jetzt Minen setzen
    if (this.firstClick()) {
      this.startTimer();
      this.placeMines(cell);
      this.calculateNumbers();
      this.firstClick.set(false);
    }

    cell.isRevealed = true;

    if (cell.hasMine) {
      this.gameOver.set(true);
      this.stopTimer();
      this.revealAllMines();
      return;
    }

    if (cell.adjacentMines === 0) {
      this.floodFill(cell);
    }
    this.checkWin();
    if (this.gameWon()) {
      this.stopTimer();
      this.board().forEach((row) => {
        row.forEach((cell) => {
          if (cell.hasMine) {
            cell.isFlagged = true;
          }
        });
      });
      const key = 'minesweeper_highscore_' + this.selectedDifficulty().name;
      const currentBest = localStorage.getItem(key);
      if (!currentBest || this.seconds() < parseInt(currentBest, 10)) {
        localStorage.setItem(key, this.seconds().toString());
        this.updateBestTime();
      }
    }
    this.board.update((b) => [...b]);
  }

  private placeMines(firstCell: MinesweeperCell) {
    const rows = this.rows();
    const cols = this.cols();
    const mines = this.mineCount();

    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // verbotene Positionen: erstes Feld + seine Nachbarn
      if (!this.board()[r][c].hasMine && !this.isProtected(r, c, firstCell)) {
        this.board()[r][c].hasMine = true;
        placed++;
      }
    }
  }

  private isProtected(
    r: number,
    c: number,
    firstCell: MinesweeperCell
  ): boolean {
    return Math.abs(firstCell.row - r) <= 1 && Math.abs(firstCell.col - c) <= 1;
  }

  private calculateNumbers() {
    for (let r = 0; r < this.rows(); r++) {
      for (let c = 0; c < this.cols(); c++) {
        const cell = this.board()[r][c];
        if (!cell.hasMine) {
          cell.adjacentMines = this.countAdjacentMines(this.board(), r, c);
        }
      }
    }
  }

  floodFill(cell: MinesweeperCell) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = cell.row + dr,
          nc = cell.col + dc;
        if (this.inBounds(nr, nc)) {
          const neighbor = this.board()[nr][nc];
          if (!neighbor.isRevealed && !neighbor.hasMine) {
            this.reveal(neighbor);
          }
        }
      }
    }
  }

  toggleFlag(event: MouseEvent, cell: MinesweeperCell) {
    event.preventDefault();
    if (this.gameOver() || cell.isRevealed) return;
    cell.isFlagged = !cell.isFlagged;
    this.board.update((b) => [...b]);
  }

  revealAllMines() {
    for (let row of this.board()) {
      for (let cell of row) {
        if (cell.hasMine) {
          cell.isRevealed = true;
        }
      }
    }
    this.board.update((b) => [...b]);
  }

  checkWin() {
    for (let row of this.board()) {
      for (let cell of row) {
        if (!cell.hasMine && !cell.isRevealed) {
          return;
        }
      }
    }
    this.gameWon.set(true);
    this.gameOver.set(true);
  }

  toggleTheme() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  startTimer() {
    if (this.timerRunning()) return; // nur einmal starten
    this.timerRunning.set(true);
    this.timerInterval = window.setInterval(() => {
      this.seconds.set(this.seconds() + 1);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.timerRunning.set(false);
  }

  resetTimer() {
    this.stopTimer();
    this.seconds.set(0);
  }

  selectDifficulty(diff: MinesweeperDifficulty) {
    this.selectedDifficulty.set(diff);
    this.startNewGame();
  }

  updateDifficultyAvailability() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.difficulties.forEach((d) => {
      const boardWidth = d.cols * this.cellSize;
      const boardHeight = d.rows * this.cellSize;

      d.disabled = boardWidth > screenWidth || boardHeight > screenHeight;
    });

    // Falls aktuelle Auswahl jetzt disabled wäre → zurück auf Beginner
    if (this.selectedDifficulty().disabled) {
      this.selectedDifficulty.set(this.difficulties[0]);
      this.startNewGame();
    }
  }

  updateBestTime() {
    const key = 'minesweeper_highscore_' + this.selectedDifficulty().name;
    const value = localStorage.getItem(key);
    this.bestTime.set(value ? parseInt(value, 10) : null);
  }
}
