import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';
import { LudoBoardComponent } from './board/ludo-board.component';
import { LudoService } from './game/ludo.service';
import { LudoHomeComponent } from './home/ludo-home.component';

/**
 * "Mensch ärgere dich nicht" (Ludo) – taken over from the whiteboard app.
 *
 * Shows either the start screen or the running game. It is played
 * online by two players via a four-digit game code; the complete
 * flow control lives in the LudoService.
 */
@Component({
  selector: 'app-ludo',
  imports: [LudoHomeComponent, LudoBoardComponent, SyncStatusComponent],
  templateUrl: './ludo.component.html',
  styleUrl: './ludo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LudoComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(LudoService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('ludo');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Clean up the Firebase subscription when leaving the page.
    this.svc.suspend();
  }
}
