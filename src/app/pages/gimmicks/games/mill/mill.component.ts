import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MillBoardComponent } from './board/mill-board.component';
import { MillService } from './game/mill.service';
import { MillHomeComponent } from './home/mill-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Nine Men's Morris – shows either the start screen or the running game.
 * The game modes (against the computer, online via a game code) live
 * entirely in the MillService.
 */
@Component({
  selector: 'app-mill',
  imports: [MillHomeComponent, MillBoardComponent, SyncStatusComponent],
  templateUrl: './mill.component.html',
  styleUrl: './mill.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MillComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(MillService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('mill');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    this.svc.suspend();
  }
}
