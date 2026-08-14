import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MillBoardComponent } from './board/mill-board.component';
import { MillService } from './game/mill.service';
import { MillHomeComponent } from './home/mill-home.component';
import { GamesService } from '../games.service';

/**
 * Muehle – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, online über einen Spiel-Code) stecken
 * komplett im MillService.
 */
@Component({
  selector: 'app-mill',
  imports: [MillHomeComponent, MillBoardComponent],
  templateUrl: './mill.component.html',
  styleUrl: './mill.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MillComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(MillService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('mill');
  }

  ngOnDestroy(): void {
    this.svc.leaveGame();
  }
}
