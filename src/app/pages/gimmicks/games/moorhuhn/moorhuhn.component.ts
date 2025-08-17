import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { lastValueFrom, Observable, Subscription } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { HttpErrorService } from '../../../http-error/http-error.service';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { GamesService } from '../games.service';

interface Bird {
  x: number;
  y: number;
  interval: any;
  move: any;
  direction: number;
  shot: boolean;
}

interface HighScore {
  rank: number;
  name: string;
  score: number;
  date: Date;
}

@Component({
    selector: 'app-moorhuhn',
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        TranslateModule,
        MatButtonToggleModule,
        FormsModule,
        NgCircleProgressModule,
    ],
    templateUrl: './moorhuhn.component.html',
    styleUrl: './moorhuhn.component.css'
})
export class MoorhuhnComponent implements OnInit, OnDestroy {
  birds: Bird[] = [];
  newBirdSub: Subscription;
  ambientLoop = new Audio('/assets/ambientloop.ogg');
  playSound = true;
  tempPlaySound = this.playSound;
  score = 0;
  time = 60;
  timeInterval: any;
  gameover = false;
  @ViewChild('scoreDialog') scoreDialog: ElementRef<HTMLDialogElement>;
  @ViewChild('highscoreName') highscoreName: ElementRef;
  showDialogContent = false;
  boardX: number;
  boardY: number;
  gameStarted = false;
  level: 'easy' | 'medium' | 'difficult' = 'easy';
  levelSpeed: number;
  levelMoveDiff: number;
  levelPoints: number;
  highscore: HighScore[] = [];
  showHighScore = false;
  nameInputDisabled = false;
  showNewGameButton = false;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.sizeBoard();
  }

  constructor(
    public translateService: TranslateService,
    private http: HttpClient,
    private httpErrorService: HttpErrorService,
    private gameService: GamesService
  ) {}

  async ngOnInit() {
    this.gameService.changeGameName.next('moorhuhn');
    this.sizeBoard();
    this.ambientLoop.loop = true;
    try {
      const headers = new HttpHeaders().set(
        'Content-Type',
        'application/json; charset=utf-8'
      );

      let data = await lastValueFrom(
        this.http.get<any>(environment.moorhuhn.moorhuhnApi, {
          headers: headers,
        })
      );
      this.highscore = JSON.parse(JSON.stringify(data));
    } catch (error) {
      this.httpErrorService.showHttpError(error, 'MoorhuhnComponent');
    }
  }

  sizeBoard() {
    if (window.innerWidth > 800) {
      this.boardX = 800;
    } else if (window.innerWidth > 520) {
      this.boardX = 500;
    } else {
      this.boardX = 300;
    }
    if (window.innerHeight > 840) {
      this.boardY = 600;
    } else if (window.innerHeight > 730) {
      this.boardY = 430;
    } else if (window.innerHeight > 630) {
      this.boardY = 330;
    } else if (window.innerHeight > 530) {
      this.boardY = 230;
    } else {
      this.boardY = 170;
    }
  }

  startGame(event: Event) {
    event.stopPropagation();
    this.showHighScore = false;
    switch (this.level) {
      case 'difficult':
        this.levelSpeed = 10;
        this.levelMoveDiff = 3;
        this.levelPoints = 20;
        break;
      case 'easy':
        this.levelSpeed = 20;
        this.levelMoveDiff = 1;
        this.levelPoints = 10;
        break;
      case 'medium':
        this.levelSpeed = 15;
        this.levelMoveDiff = 2;
        this.levelPoints = 15;
        break;

      default:
        break;
    }
    this.gameStarted = true;
    this.playSound = this.tempPlaySound;
    if (this.playSound) {
      this.ambientLoop.play();
    }

    this.newBirdSub = this.getRandomTimerObservable().subscribe((value) => {
      this.birds.push({
        x: -77,
        y: this.getRandomInt(0, this.boardY - 49),
        move: () => {},
        interval: null,
        direction: this.getRandomInt(0, 1),
        shot: false,
      });
      let currentBird = this.birds[this.birds.length - 1];
      currentBird.move = () => {
        currentBird.interval = setInterval(() => {
          currentBird.x += this.levelMoveDiff;
          if (currentBird.x > this.boardX) {
            clearInterval(currentBird.interval);
            this.birds = this.birds.filter((item) => item !== currentBird);
          }
        }, this.getRandomInt(5, this.levelSpeed));
      };
      currentBird.move();
    });

    this.timeInterval = setInterval(() => {
      this.time -= 1;
      if (this.time === 0) {
        this.newBirdSub.unsubscribe();
        this.birds.forEach((bird) => clearInterval(bird.interval));
        clearInterval(this.timeInterval);
        this.birds = [];
        this.showScore();
      }
    }, 1000);
  }

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomTimerObservable(): Observable<number> {
    return new Observable<number>((observer) => {
      const emitValue = (count: number) => {
        observer.next(count);
        const randomDelay = this.getRandomInt(300, 2500);
        setTimeout(() => emitValue(count + 1), randomDelay);
      };
      emitValue(1);
    });
  }

  newGame(event: Event) {
    event.stopPropagation();
    this.gameStarted = false;
    this.time = 60;
    this.score = 0;
    this.gameover = false;
    this.scoreDialog.nativeElement.close();
    this.showDialogContent = false;
  }

  birdShot(bird: Bird) {
    bird.shot = true;
    setTimeout(() => {
      clearInterval(bird.interval);
      this.birds = this.birds.filter((item) => item !== bird);
      this.score += this.levelPoints;
    }, 200);
  }

  toggleSound() {
    this.playSound = !this.playSound;
    if (this.playSound) {
      this.ambientLoop.play();
    } else {
      this.ambientLoop.pause();
    }
  }

  onShot() {
    if (this.playSound && this.gameStarted) {
      let shot = new Audio('/assets/moorhuhn-shot.ogg');
      shot.play();
    }
  }

  showScore() {
    this.gameover = true;
    this.nameInputDisabled = false;
    this.ambientLoop.pause();
    this.tempPlaySound = this.playSound;
    this.playSound = false;
    this.showNewGameButton = false;
    setTimeout(() => {
      this.scoreDialog.nativeElement.showModal();
    }, 2500);
    setTimeout(() => {
      this.showDialogContent = true;
    }, 3500);
    setTimeout(() => {
      this.highscoreName.nativeElement.focus();
    }, 3600);
  }

  async saveHighscore(name: string) {
    try {
      const headers = new HttpHeaders().set(
        'Content-Type',
        'application/json; charset=utf-8'
      );

      let data = await lastValueFrom(
        this.http.post<any>(
          environment.moorhuhn.moorhuhnApi,
          JSON.stringify({
            name: name.trim(),
            score: this.score,
            date: new Date(),
          }),
          { headers: headers }
        )
      );
      this.highscore = JSON.parse(JSON.stringify(data));
    } catch (error) {
      this.httpErrorService.showHttpError(error, 'MoorhuhnComponent');
    }
    this.showNewGameButton = true;
    this.nameInputDisabled = true;
  }

  ngOnDestroy(): void {
    if (this.newBirdSub) {
      this.newBirdSub.unsubscribe();
    }
    this.ambientLoop.pause();
  }
}
