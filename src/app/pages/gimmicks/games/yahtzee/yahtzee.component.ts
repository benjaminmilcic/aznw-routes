import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { YahtzeeBoardComponent } from './board/yahtzee-board.component';
import { YahtzeeHomeComponent } from './home/yahtzee-home.component';
import { YahtzeeService } from './game/yahtzee.service';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Yahtzee – shows either the start screen or the running game.
 * The game modes (on the device with computer opponents, online via a game code)
 * live entirely in the YahtzeeService.
 */
@Component({
  selector: 'app-yahtzee',
  imports: [YahtzeeHomeComponent, YahtzeeBoardComponent, SyncStatusComponent],
  templateUrl: './yahtzee.component.html',
  styleUrl: './yahtzee.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YahtzeeComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(YahtzeeService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('yahtzee');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Clean up the Firebase subscription and the computer timer when leaving the page.
    this.svc.suspend();
  }
}
