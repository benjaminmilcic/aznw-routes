import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MemoQuizBoardComponent } from './board/memo-quiz-board.component';
import { MemoQuizHomeComponent } from './home/memo-quiz-home.component';
import { MemoQuizService } from './game/memo-quiz.service';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Memo quiz – shows either the start screen or the running game.
 * The game modes (against the computer, online via a game code) live
 * entirely in the MemoQuizService.
 */
@Component({
  selector: 'app-memo-quiz',
  imports: [MemoQuizHomeComponent, MemoQuizBoardComponent, SyncStatusComponent],
  templateUrl: './memo-quiz.component.html',
  styleUrl: './memo-quiz.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoQuizComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(MemoQuizService);
  protected readonly game = this.svc.game;

  private readonly gamesService = inject(GamesService);

  ngOnInit(): void {
    this.gamesService.changeGameName.next('memo-quiz');
    // Back into a running online game (reload, page change, or when
    // Android discarded the tab) instead of the start screen.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Clean up the Firebase subscription and timers when leaving the page.
    this.svc.suspend();
  }
}
