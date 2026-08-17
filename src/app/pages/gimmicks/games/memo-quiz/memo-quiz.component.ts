import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MemoQuizBoardComponent } from './board/memo-quiz-board.component';
import { MemoQuizHomeComponent } from './home/memo-quiz-home.component';
import { MemoQuizService } from './game/memo-quiz.service';
import { GamesService } from '../games.service';
import { SyncStatusComponent } from '../shared/sync-status/sync-status.component';

/**
 * Memo-Quiz – zeigt entweder den Startbildschirm oder das laufende Spiel.
 * Die Spielarten (gegen den Computer, online über einen Spiel-Code) stecken
 * komplett im MemoQuizService.
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
    // Zurück in eine laufende Online-Partie (Neuladen, Seitenwechsel, oder wenn
    // Android den Tab verworfen hat) statt auf den Startbildschirm.
    void this.svc.resume();
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Seite Firebase-Abo und Timer aufräumen.
    this.svc.suspend();
  }
}
