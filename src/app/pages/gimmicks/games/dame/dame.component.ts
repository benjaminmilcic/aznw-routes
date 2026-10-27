import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DameBoardComponent } from './board/dame-board.component';
import { DameService } from './game/dame.service';
import { DameHomeComponent } from './home/dame-home.component';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Checkers – shows either the start screen or the running game.
 * The game modes (against the computer, online via a game code) live
 * entirely in the DameService.
 */
@Component({
  selector: 'app-dame',
  imports: [DameHomeComponent, DameBoardComponent, SyncStatusComponent],
  templateUrl: './dame.component.html',
  styleUrl: './dame.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DameComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(DameService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('dame');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    this.svc.suspend();
  }
}
