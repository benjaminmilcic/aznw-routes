import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { WinnerDialogComponent } from '../winner-dialog/winner-dialog.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-tiktaktoe',
    imports: [
        FormsModule,
        CommonModule,
        MatIconModule,
        IonLabel,
        IonSegment,
        IonSegmentButton,
        TranslateModule,
        MatButtonModule,
    ],
    templateUrl: './tiktaktoe.component.html',
    styleUrl: './tiktaktoe.component.css'
})
export class TiktaktoeComponent implements OnInit {
  board: string[][] = [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
  player: 'X' | 'O' = 'X';
  name1ForEdit: string = 'Player 1';
  name2ForEdit: string = 'Player 2';
  name1: string = this.name1ForEdit;
  name2: string = this.name2ForEdit;
  tempName2: string;
  name1Edit = false;
  name2Edit = false;
  currentPlayer: 'X' | 'O' = 'X';
  moveCount = 1;
  showWin: boolean = false;
  showDraw = false;
  row1 = false;
  row2 = false;
  row3 = false;
  column1 = false;
  column2 = false;
  column3 = false;
  diagonal1 = false;
  diagonal2 = false;

  boardDisabled = false;

  constructor(
    private dialog: MatDialog,
    private translateService: TranslateService,
    private gameService: GamesService
  ) {}

  @ViewChild('name2Input') name2Input: ElementRef<HTMLInputElement>;
  @ViewChild('name1Input') name1Input: ElementRef<HTMLInputElement>;

  opponent: 'human' | 'computer' = 'human';

  ngOnInit(): void {
    this.gameService.changeGameName.next('tiktaktoe');
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

  makeMove(x: number, y: number) {
    if (this.board[x][y] !== '') {
      return;
    }
    if (this.moveCount < 10 && !this.showWin) {
      this.board[x][y] = this.player;
      this.player = this.player === 'X' ? 'O' : 'X';
      this.currentPlayer = this.player;
      this.moveCount++;
      this.checkWin();
      if (
        this.opponent === 'computer' &&
        this.player === 'O' &&
        !this.showDraw &&
        !this.showWin
      ) {
        this.makeComputerMove();
      }
    }
  }

  async makeComputerMove() {
    this.boardDisabled = true;
    await new Promise((f) => setTimeout(f, 500));
    let x: number;
    let y: number;
    do {
      x = this.getRandomNumber();
      y = this.getRandomNumber();
    } while (this.board[x][y] !== '');
    this.makeMove(x, y);
    this.boardDisabled = false;
  }

  getRandomNumber(): number {
    return Math.floor(Math.random() * 3);
  }

  onNewGame() {
    this.board = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ];
    this.player = 'X';
    this.currentPlayer = 'X';
    this.moveCount = 1;
    this.showWin = false;
    this.showDraw = false;
    this.row1 = false;
    this.row2 = false;
    this.row3 = false;
    this.column1 = false;
    this.column2 = false;
    this.column3 = false;
    this.diagonal1 = false;
    this.diagonal2 = false;
  }

  checkWin() {
    this.row1 =
      this.board[0][0] === this.board[0][1] &&
      this.board[0][0] === this.board[0][2] &&
      !this.board[0].includes('');
    this.row2 =
      this.board[1][0] === this.board[1][1] &&
      this.board[1][0] === this.board[1][2] &&
      !this.board[1].includes('');
    this.row3 =
      this.board[2][0] === this.board[2][1] &&
      this.board[2][0] === this.board[2][2] &&
      !this.board[2].includes('');
    this.column1 =
      this.board[0][0] === this.board[1][0] &&
      this.board[0][0] === this.board[2][0] &&
      !this.board.map((item) => item[0]).includes('');
    this.column2 =
      this.board[0][1] === this.board[1][1] &&
      this.board[0][1] === this.board[2][1] &&
      !this.board.map((item) => item[1]).includes('');
    this.column3 =
      this.board[0][2] === this.board[1][2] &&
      this.board[0][2] === this.board[2][2] &&
      !this.board.map((item) => item[2]).includes('');
    this.diagonal1 =
      this.board[0][0] === this.board[1][1] &&
      this.board[0][0] === this.board[2][2] &&
      this.board[0][0] !== '' &&
      this.board[1][1] !== '' &&
      this.board[2][2] !== '';
    this.diagonal2 =
      this.board[0][2] === this.board[1][1] &&
      this.board[0][2] === this.board[2][0] &&
      this.board[0][2] !== '' &&
      this.board[1][1] !== '' &&
      this.board[2][0] !== '';
    if (
      this.row1 ||
      this.row2 ||
      this.row3 ||
      this.column1 ||
      this.column2 ||
      this.column3 ||
      this.diagonal1 ||
      this.diagonal2
    ) {
      this.onShowWin();
    } else if (this.moveCount === 10) {
      this.onShowDraw();
    }
  }

  onShowWin() {
    this.showWin = true;
    this.openDialog();
  }

  onShowDraw() {
    this.showDraw = true;
    this.openDialog();
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

  onChangeOpponent() {
    if (this.opponent === 'computer') {
      this.tempName2 = this.name2;
      this.name2 = 'Computer';
      if (this.player === 'O' && !this.showDraw && !this.showWin) {
        this.makeComputerMove();
      }
    } else {
      this.name2 = this.tempName2;
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(WinnerDialogComponent, {
      disableClose: true,
      width: '300px',
      height: '300px',
      data: {
        showWin: this.showWin,
        winner: this.currentPlayer === 'X' ? this.name2 : this.name1,
      },
      panelClass: 'winner-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.onNewGame();
    });
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
