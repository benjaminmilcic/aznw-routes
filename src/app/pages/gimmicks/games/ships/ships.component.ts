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
 * "Battleship" – taken over from the whiteboard app.
 *
 * Playable against the computer (three difficulty levels) or online by two players
 * via a four-digit game code. The complete flow control
 * lives in the ShipsService.
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
    // Clean up the Firebase subscription and the computer timer when leaving the page.
    this.svc.leaveGame();
  }
}
