import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SchachBoardComponent } from './board/schach-board.component';
import { SchachService } from './game/schach.service';
import { SchachHomeComponent } from './home/schach-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Chess – shows either the start screen or the running game.
 * The game modes (against the computer, online via a game code) live
 * entirely in the SchachService.
 */
@Component({
  selector: 'app-schach',
  imports: [SchachHomeComponent, SchachBoardComponent, SyncStatusComponent],
  templateUrl: './schach.component.html',
  styleUrl: './schach.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchachComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(SchachService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('schach');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    this.svc.suspend();
  }
}
