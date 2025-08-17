import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import {
  ActivatedRoute,
  Router,
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GamesService } from './games.service';

@Component({
    selector: 'app-games',
    imports: [
        CommonModule,
        RouterOutlet,
        MatButtonModule,
        RouterModule,
        TranslateModule,
        MatMenuModule,
    ],
    templateUrl: './games.component.html',
    styleUrl: './games.component.css'
})
export class GamesComponent {
  gameName: string;
  gameIconSrc: string;

  constructor(
    private translate: TranslateService,
    private router: Router,
    private gameService: GamesService
  ) {
    let urlParts = router.url.split('/');
    let currentGame = urlParts[urlParts.length - 1];
    this.translateGameName(currentGame);
    translate.onLangChange.subscribe(() => {
      let urlParts = router.url.split('/');
      let currentGame = urlParts[urlParts.length - 1];
      this.translateGameName(currentGame);
    });
    gameService.changeGameName.subscribe(result => {
      this.translateGameName(result);
    })
  }

  translateGameName(currentGame: string) {
    switch (currentGame) {
      case 'moorhuhn':
        this.gameName = 'Moorhuhn';
        this.gameIconSrc = '/assets/moorhuhn-icon.png';
        break;
      case 'knowledge-quiz':
        this.translate
          .get('gimmicks.games.knowledgeQuiz')
          .subscribe((res: string) => {
            this.gameName = res;
          });
        this.gameIconSrc = '/assets/quiz.png';
        break;
      case 'jigsaw':
        this.translate.get('gimmicks.games.jigsaw').subscribe((res: string) => {
          this.gameName = res;
        });
        this.gameIconSrc = '/assets/jigsaw.png';
        break;
      case 'memo-quiz':
        this.translate
          .get('gimmicks.games.memoQuiz')
          .subscribe((res: string) => {
            this.gameName = res;
          });
        this.gameIconSrc = '/assets/memory-game.png';
        break;
      case 'connect-four':
        this.translate
          .get('gimmicks.games.connectFour')
          .subscribe((res: string) => {
            this.gameName = res;
          });
        this.gameIconSrc = '/assets/connect-four.png';
        break;
      case 'tiktaktoe':
        this.gameName = 'TikTakToe';
        this.gameIconSrc = '/assets/tic-tac-toe.png';
        break;
      case 'yahtzee':
        this.gameName = 'Yahtzee';
        this.gameIconSrc = '/assets/yahtzee.png';
        break;

      default:
        break;
    }
  }

  changeGame(translation: string) {
    this.translate.get(translation).subscribe((res: string) => {
      this.gameName = res;
    });
    switch (translation) {
      case 'Moorhuhn':
        this.gameIconSrc = '/assets/moorhuhn-icon.png';
        break;
      case 'gimmicks.games.knowledgeQuiz':
        this.gameIconSrc = '/assets/quiz.png';
        break;
      case 'gimmicks.games.jigsaw':
        this.gameIconSrc = '/assets/jigsaw.png';
        break;
      case 'gimmicks.games.memoQuiz':
        this.gameIconSrc = '/assets/memory-game.png';
        break;
      case 'gimmicks.games.connectFour':
        this.gameIconSrc = '/assets/connect-four.png';
        break;
      case 'TikTakToe':
        this.gameIconSrc = '/assets/tic-tac-toe.png';
        break;
      case 'Yahtzee':
        this.gameIconSrc = '/assets/yahtzee.png';
        break;

      default:
        break;
    }
  }
}
