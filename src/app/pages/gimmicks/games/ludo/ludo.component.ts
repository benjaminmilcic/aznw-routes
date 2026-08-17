import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';
import { LudoBoardComponent } from './board/ludo-board.component';
import { LudoService } from './game/ludo.service';
import { LudoHomeComponent } from './home/ludo-home.component';

/**
 * "Mensch ärgere dich nicht" – aus der Whiteboard-App übernommen.
 *
 * Zeigt entweder den Startbildschirm oder das laufende Spiel. Gespielt wird
 * online zu zweit über einen vierstelligen Spiel-Code; die komplette
 * Ablaufsteuerung steckt im LudoService.
 */
@Component({
  selector: 'app-ludo',
  imports: [LudoHomeComponent, LudoBoardComponent, SyncStatusComponent],
  templateUrl: './ludo.component.html',
  styleUrl: './ludo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LudoComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(LudoService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('ludo');
    // Zurück in eine laufende Online-Partie (Neuladen, Seitenwechsel, oder wenn
    // Android den Tab verworfen hat) statt auf den Startbildschirm.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite das Firebase-Abo aufräumen.
    this.svc.suspend();
  }
}
