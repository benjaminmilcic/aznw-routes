import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { BackgammonBoardComponent } from './board/backgammon-board.component';
import { BackgammonService } from './game/backgammon.service';
import { BackgammonHomeComponent } from './home/backgammon-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Backgammon – shows either the start screen or the running game.
 * The game modes (against the computer, online via a game code) live
 * entirely in the BackgammonService.
 */
@Component({
  selector: 'app-backgammon',
  imports: [BackgammonHomeComponent, BackgammonBoardComponent, SyncStatusComponent],
  templateUrl: './backgammon.component.html',
  styleUrl: './backgammon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgammonComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(BackgammonService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('backgammon');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    this.svc.suspend();
  }
}
