import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { YahtzeeBoardComponent } from './board/yahtzee-board.component';
import { YahtzeeHomeComponent } from './home/yahtzee-home.component';
import { YahtzeeService } from './game/yahtzee.service';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Yahtzee – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (am Gerät mit Computer-Gegnern, online über einen Spiel-Code)
 * stecken komplett im YahtzeeService.
 */
@Component({
  selector: 'app-yahtzee',
  imports: [YahtzeeHomeComponent, YahtzeeBoardComponent, SyncStatusComponent],
  templateUrl: './yahtzee.component.html',
  styleUrl: './yahtzee.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YahtzeeComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(YahtzeeService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('yahtzee');
    // Zurück in eine laufende Online-Partie (Neuladen, Seitenwechsel, oder wenn
    // Android den Tab verworfen hat) statt auf den Startbildschirm.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite Firebase-Abo und Computer-Timer aufräumen.
    this.svc.suspend();
  }
}
