import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { MatIconModule } from '@angular/material/icon';
import { WinnerDialogComponent } from '../winner-dialog/winner-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-connect-four',
    imports: [
        IonSegmentButton,
        CommonModule,
        IonLabel,
        IonSegment,
        FormsModule,
        MatIconModule,
        TranslateModule,
        MatButtonModule,
    ],
    templateUrl: './connect-four.component.html',
    styleUrl: './connect-four.component.css'
})
export class ConnectFourComponent implements OnInit {
  title = '4 Gewinnt';
  rows = 6;
  cols = 7;
  board: string[][] = [];
  currentPlayer = 'Red';
  winner: string | null = null;

  opponent: 'human' | 'computer' = 'human';
  name1ForEdit: string = 'Player 1';
  name2ForEdit: string = 'Player 2';
  name1: string = this.name1ForEdit;
  name2: string = this.name2ForEdit;
  tempName2: string;
  name1Edit = false;
  name2Edit = false;

  @ViewChild('name2Input') name2Input: ElementRef<HTMLInputElement>;
  @ViewChild('name1Input') name1Input: ElementRef<HTMLInputElement>;

  showWin: boolean = false;
  showDraw = false;

  moveCount = 0;

  constructor(
    private dialog: MatDialog,
    private translateService: TranslateService,
    private gameServie: GamesService
  ) {
    this.resetBoard();
  }

  ngOnInit(): void {
    this.gameServie.changeGameName.next('connect-four');
    this.setInitialPlayerNames();
  }

  setInitialPlayerNames() {
    this.translateService.get('gimmicks.games.player1').subscribe((result) => {
      this.name1ForEdit = result;
      this.name1 = this.name1ForEdit;
    });
    this.translateService.get('gimmicks.games.player2').subscribe((result) => {
      this.name2ForEdit = result;
      this.name2 = this.name2ForEdit;
    });
  }

  resetBoard() {
    this.board = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill('')
    );
    this.currentPlayer = 'Red';
    this.winner = null;
    this.showWin = false;
    this.showDraw = false;
    this.moveCount = 0;
  }

  dropDisc(colIndex: number) {
    if (
      this.winner ||
      this.showDraw ||
      (this.opponent === 'computer' && this.currentPlayer === 'Yellow')
    ) {
      return;
    }

    let moveMade = this.makeMove(colIndex);
    if (moveMade && this.winner) {
      return;
    }
    if (this.opponent === 'computer') {
      setTimeout(() => this.makeComputerMove(), 500); // Delay for the computer's move
    }
  }

  makeMove(colIndex: number): boolean {
    for (let rowIndex = this.rows - 1; rowIndex >= 0; rowIndex--) {
      if (!this.board[rowIndex][colIndex]) {
        this.board[rowIndex][colIndex] = this.currentPlayer;
        this.moveCount++;
        if (this.checkWin(this.board, rowIndex, colIndex)) {
          this.winner = this.currentPlayer;
          this.onShowWin();
        }
        if (this.moveCount === 42) {
          this.onShowDraw();
        }
        this.currentPlayer = this.currentPlayer === 'Red' ? 'Yellow' : 'Red';
        return true;
      }
    }
    return false;
  }

  makeComputerMove() {
    if (this.winner || this.showDraw) return;

    // AI logic
    const colIndex = this.findBestMove();
    if (colIndex !== -1) {
      this.makeMove(colIndex);
    }
  }

  findBestMove(): number {
    // Check for winning or blocking moves
    for (let col = 0; col < this.cols; col++) {
      if (this.canWin(col, 'Yellow')) return col; // Try to win
      if (this.canWin(col, 'Red')) return col; // Block opponent
    }

    // Default to middle column or a random valid column
    const middle = Math.floor(this.cols / 2);
    if (this.isValidMove(middle)) return middle;

    const validCols = Array.from({ length: this.cols }, (_, col) => col).filter(
      (col) => this.isValidMove(col)
    );
    return validCols.length
      ? validCols[Math.floor(Math.random() * validCols.length)]
      : -1;
  }

  canWin(colIndex: number, player: string): boolean {
    for (let rowIndex = this.rows - 1; rowIndex >= 0; rowIndex--) {
      if (!this.board[rowIndex][colIndex]) {
        let tempBoard = JSON.parse(JSON.stringify(this.board));
        tempBoard[rowIndex][colIndex] = player;
        const win = this.checkWin(tempBoard, rowIndex, colIndex);
        if (win) return true;
        break;
      }
    }
    return false;
  }

  isValidMove(colIndex: number): boolean {
    return !this.board[0][colIndex];
  }

  checkWin(board: string[][], row: number, col: number): boolean {
    const directions = [
      { dr: 0, dc: 1 }, // horizontal
      { dr: 1, dc: 0 }, // vertical
      { dr: 1, dc: 1 }, // diagonal right
      { dr: 1, dc: -1 }, // diagonal left
    ];

    const player = board[row][col];
    for (const { dr, dc } of directions) {
      let count = 1;

      for (let step = 1; step < 4; step++) {
        const r = row + dr * step;
        const c = col + dc * step;
        if (
          r < 0 ||
          r >= this.rows ||
          c < 0 ||
          c >= this.cols ||
          board[r][c] !== player
        ) {
          break;
        }
        count++;
      }

      for (let step = 1; step < 4; step++) {
        const r = row - dr * step;
        const c = col - dc * step;
        if (
          r < 0 ||
          r >= this.rows ||
          c < 0 ||
          c >= this.cols ||
          board[r][c] !== player
        ) {
          break;
        }
        count++;
      }

      if (count >= 4) {
        return true;
      }
    }

    return false;
  }

  onChangeOpponent() {
    if (this.opponent === 'computer') {
      this.tempName2 = this.name2;
      this.name2 = 'Computer';
      if (this.currentPlayer === 'Yellow' && !this.showDraw && !this.showWin) {
        this.makeComputerMove();
      }
    } else {
      this.name2 = this.tempName2;
    }
  }

  onToggleName2() {
    this.name2Edit = !this.name2Edit;
    if (this.name2Edit) {
      setTimeout(() => {
        this.name2Input.nativeElement.focus();
      }, 50);
    } else {
      setTimeout(() => {
        this.name2 = this.name2ForEdit;
      }, 50);
    }
  }

  onToggleName1() {
    this.name1Edit = !this.name1Edit;
    if (this.name1Edit) {
      setTimeout(() => {
        this.name1Input.nativeElement.focus();
      }, 50);
    } else {
      setTimeout(() => {
        this.name1 = this.name1ForEdit;
      }, 50);
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(WinnerDialogComponent, {
      disableClose: true,
      width: '300px',
      height: '300px',
      data: {
        showWin: this.showWin,
        winner: this.winner === 'Yellow' ? this.name2 : this.name1,
      },
      panelClass: 'winner-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.resetBoard();
    });
  }

  onShowWin() {
    this.showWin = true;
    this.openDialog();
  }

  onShowDraw() {
    this.showDraw = true;
    this.openDialog();
  }

  onName1Blur() {
    setTimeout(() => {
      this.name1Edit = false;
      this.name1ForEdit = this.name1;
    }, 200);
  }

  onName2Blur() {
    setTimeout(() => {
      this.name2Edit = false;
      this.name2ForEdit = this.name2;
    }, 200);
  }
}
