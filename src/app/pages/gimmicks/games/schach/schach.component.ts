import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SchachBoardComponent } from './board/schach-board.component';
import { SchachService } from './game/schach.service';
import { SchachHomeComponent } from './home/schach-home.component';
import { GamesService } from '../games.service';

/**
 * Schach – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, online über einen Spiel-Code) stecken
 * komplett im SchachService.
 */
@Component({
  selector: 'app-schach',
  imports: [SchachHomeComponent, SchachBoardComponent],
  templateUrl: './schach.component.html',
  styleUrl: './schach.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchachComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(SchachService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('schach');
  }

  ngOnDestroy(): void {
    this.svc.leaveGame();
  }
}
