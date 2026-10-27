import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';
import { UnoBoardComponent } from './board/uno-board.component';
import { UnoService } from './game/uno.service';
import { UnoHomeComponent } from './home/uno-home.component';

/**
 * UNO – taken over from the whiteboard app and, like Yahtzee, extended to several
 * players.
 *
 * Shows either the start screen or the running table. It is played
 * on the device (humans + computers) or online via a four-digit
 * game code; the flow control lives entirely in the UnoService.
 */
@Component({
  selector: 'app-uno',
  imports: [UnoHomeComponent, UnoBoardComponent, SyncStatusComponent],
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
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Clean up the Firebase subscription and the computer timer when leaving the page.
    this.svc.suspend();
  }
}
