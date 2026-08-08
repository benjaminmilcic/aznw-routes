import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GamesService } from '../games.service';
import { UnoBoardComponent } from './board/uno-board.component';
import { UnoService } from './game/uno.service';
import { UnoHomeComponent } from './home/uno-home.component';

/**
 * UNO – aus der Whiteboard-App übernommen und wie Pasch auf mehrere
 * Mitspieler erweitert.
 *
 * Zeigt entweder den Startbildschirm oder den laufenden Tisch. Gespielt wird
 * am Gerät (Menschen + Computer) oder online über einen vierstelligen
 * Spiel-Code; die Ablaufsteuerung steckt komplett im UnoService.
 */
@Component({
  selector: 'app-uno',
  imports: [UnoHomeComponent, UnoBoardComponent],
  templateUrl: './uno.component.html',
  styleUrl: './uno.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnoComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(UnoService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('uno');
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite Firebase-Abo und Computer-Timer aufräumen.
    this.svc.leaveGame();
  }
}
