import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GamesService } from '../games.service';
import { DraggableDirective } from '../shared/draggable.directive';
import { ShipsBattleComponent } from './battle/ships-battle.component';
import { ShipsService } from './game/ships.service';
import { ShipsHomeComponent } from './home/ships-home.component';
import { ShipsResultComponent } from './result/ships-result.component';
import { ShipsSetupComponent } from './setup/ships-setup.component';

type View = 'home' | 'waiting' | 'setup' | 'waitOpponent' | 'battle' | 'finished';

/**
 * "Schiffe versenken" – aus der Whiteboard-App übernommen.
 *
 * Spielbar gegen den Computer (drei Spielstärken) oder online zu zweit
 * über einen vierstelligen Spiel-Code. Die komplette Ablaufsteuerung
 * steckt im ShipsService.
 */
@Component({
  selector: 'app-ships',
  imports: [
    TranslateModule,
    DraggableDirective,
    ShipsHomeComponent,
    ShipsSetupComponent,
    ShipsBattleComponent,
    ShipsResultComponent,
  ],
  templateUrl: './ships.component.html',
  styleUrl: './ships.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(ShipsService);
  private readonly gamesService = inject(GamesService);

  protected readonly view = computed<View>(() => {
    const g = this.svc.game();
    if (!g) return 'home';
    switch (g.status) {
      case 'waiting':
        return 'waiting';
      case 'setup':
        return this.svc.me()?.ready ? 'waitOpponent' : 'setup';
      case 'battle':
        return 'battle';
      case 'finished':
        return 'finished';
      default:
        return 'home';
    }
  });

  ngOnInit(): void {
    this.gamesService.changeGameName.next('ships');
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite Firebase-Abo und Computer-Timer aufräumen.
    this.svc.leaveGame();
  }
}
