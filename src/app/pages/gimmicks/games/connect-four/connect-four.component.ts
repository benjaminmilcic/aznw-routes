import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ConnectFourBoardComponent } from './board/connect-four-board.component';
import { ConnectFourService } from './game/connect-four.service';
import { ConnectFourHomeComponent } from './home/connect-four-home.component';
import { GamesService } from '../games.service';

/**
 * "4 Gewinnt" – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, zu zweit am selben Gerät, online über
 * einen Spiel-Code) stecken komplett im ConnectFourService.
 */
@Component({
  selector: 'app-connect-four',
  imports: [ConnectFourHomeComponent, ConnectFourBoardComponent],
  templateUrl: './connect-four.component.html',
  styleUrl: './connect-four.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectFourComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(ConnectFourService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('connect-four');
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite Firebase-Abo und Computer-Timer aufräumen.
    this.svc.leaveGame();
  }
}
