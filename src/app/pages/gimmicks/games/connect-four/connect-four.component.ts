import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ConnectFourBoardComponent } from './board/connect-four-board.component';
import { ConnectFourService } from './game/connect-four.service';
import { ConnectFourHomeComponent } from './home/connect-four-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * "Connect Four" – shows either the start screen or the running game.
 * The game modes (against the computer, two players on the same device, online via
 * a game code) live entirely in the ConnectFourService.
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
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Clean up the Firebase subscription and the computer timer, but keep the game code –
    // otherwise the online game would be lost when coming back.
    this.svc.suspend();
  }
}
