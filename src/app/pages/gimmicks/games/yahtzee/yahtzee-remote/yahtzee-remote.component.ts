import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { YahtzeeService } from '../yahtzee.service';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-yahtzee-remote',
    imports: [
        MatFormFieldModule,
        MatButtonModule,
        MatInputModule,
        CommonModule,
        FormsModule,
        MatProgressSpinnerModule,
        MatIconModule,
        TranslateModule
    ],
    templateUrl: './yahtzee-remote.component.html',
    styleUrl: './yahtzee-remote.component.css'
})
export class YahtzeeRemoteComponent implements OnInit {
  players: string[] = [];
  
  nameInputDisabled = false;
  nameExist = false;
  startGameDisabled = true;
  gameStarted = false;
  noMorePlayers = false;
  @Output() startTheGame = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  showNameError = false;

  constructor(public yahtzeeService: YahtzeeService) {}

  async ngOnInit() {
    this.yahtzeeService.socket.emit('noMorePlayers', {}, (result) => {
      this.noMorePlayers = result;
    });
    this.yahtzeeService.socket.disconnect();
    await this.delay(10);
    this.yahtzeeService.socket.connect();
    this.yahtzeeService.socket.emit('getPlayers', {}, (players: string[]) => {
      this.players = players;
    });
    this.yahtzeeService.socket.on('updatePlayers', (players: string[]) => {
      this.players = players;
      if (players.includes(this.yahtzeeService.name)) {
        this.startGameDisabled = false;
      }
    });
    this.yahtzeeService.socket.on('noMorePlayers', (result) => {
      this.noMorePlayers = result;
    });
    this.yahtzeeService.socket.on('gameStarted', () => {
      this.waitForGameStarted().then(() => {
        this.yahtzeeService.players = [];
        for (let index = 0; index < this.players.length; index++) {
          const player = this.players[index];
          let isRemote = player === this.yahtzeeService.name ? false : true;
          this.yahtzeeService.players.push({
            name: player,
            isRemote,
          });
        }
        this.startTheGame.emit();
      });
    });
  }

  waitForGameStarted(): Promise<any> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.gameStarted === true) {
          clearInterval(checkInterval);
          resolve(this.gameStarted);
        }
      }, 1);
    });
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  addName() {
    this.yahtzeeService.name = this.yahtzeeService.name.trim();
    if (this.yahtzeeService.name === '') {
      this.showNameError = true;
      return;
    }
    this.showNameError = false;

    this.nameExist = false;
    new Promise((resolve) => {
      this.yahtzeeService.socket.emit(
        'addPlayer',
        this.yahtzeeService.name,
        (success: boolean) => {
          resolve(success);
        }
      );
    }).then((success) => {
      if (success) {
        this.nameInputDisabled = true;
      } else {
        this.nameExist = true;
      }
    });
  }

  startGame() {
    new Promise((resolve) => {
      this.yahtzeeService.socket.emit(
        'clientStarted',
        {},
        (sucess: boolean) => {
          resolve(sucess);
        }
      );
    }).then((success: boolean) => {
      if (success) {
        this.gameStarted = true;
        this.startGameDisabled = true;
      }
    });
  }
}
