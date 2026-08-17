import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ConnectFourBoardComponent } from './board/connect-four-board.component';
import { ConnectFourService } from './game/connect-four.service';
import { ConnectFourHomeComponent } from './home/connect-four-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * "4 Gewinnt" – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, zu zweit am selben Gerät, online über
 * einen Spiel-Code) stecken komplett im ConnectFourService.
 */
@Component({
  selector: 'app-connect-four',
  imports: [ConnectFourHomeComponent, ConnectFourBoardComponent, SyncStatusComponent],
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
    // Zurück in eine laufende Online-Partie (Neuladen, Seitenwechsel, oder wenn
    // Android den Tab verworfen hat) statt auf den Startbildschirm.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Firebase-Abo und Computer-Timer aufräumen, den Spiel-Code aber behalten –
    // sonst wäre die Online-Partie beim Zurückkommen verloren.
    this.svc.suspend();
  }
}
