import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { BackgammonBoardComponent } from './board/backgammon-board.component';
import { BackgammonService } from './game/backgammon.service';
import { BackgammonHomeComponent } from './home/backgammon-home.component';
import { GamesService } from '../games.service';

/**
 * Backgammon – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, online über einen Spiel-Code) stecken
 * komplett im BackgammonService.
 */
@Component({
  selector: 'app-backgammon',
  imports: [BackgammonHomeComponent, BackgammonBoardComponent],
  templateUrl: './backgammon.component.html',
  styleUrl: './backgammon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgammonComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(BackgammonService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('backgammon');
  }

  ngOnDestroy(): void {
    this.svc.leaveGame();
  }
}
