import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DameBoardComponent } from './board/dame-board.component';
import { DameService } from './game/dame.service';
import { DameHomeComponent } from './home/dame-home.component';
import { GamesService } from '../games.service';

/**
 * Dame – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, online über einen Spiel-Code) stecken
 * komplett im DameService.
 */
@Component({
  selector: 'app-dame',
  imports: [DameHomeComponent, DameBoardComponent],
  templateUrl: './dame.component.html',
  styleUrl: './dame.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DameComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(DameService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('dame');
  }

  ngOnDestroy(): void {
    this.svc.leaveGame();
  }
}
