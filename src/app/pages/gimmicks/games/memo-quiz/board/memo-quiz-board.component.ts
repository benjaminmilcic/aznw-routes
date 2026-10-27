import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import { CPU_ID, MemoQuizService } from '../game/memo-quiz.service';
import { MemoCardComponent } from '../card/memo-card.component';
import { MotifComponent } from '../motif/motif.component';
import type { MemoPlayer } from '../game/memo.types';

type Outcome = 'win' | 'lose' | 'tie';

const COLS_BY_PAIRS: Record<number, number> = { 6: 4, 10: 5, 12: 6 };

/** The game board with header, waiting and result overlay. */
@Component({
  selector: 'app-memo-quiz-board',
  imports: [
    TranslateModule,
    MemoCardComponent,
    MotifComponent,
    DraggableDirective,
    SpeakOnClickDirective,
  ],
  templateUrl: './memo-quiz-board.component.html',
  styleUrl: './memo-quiz-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoQuizBoardComponent implements OnDestroy {
  protected readonly svc = inject(MemoQuizService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  protected readonly game = this.svc.game;

  private effectsShown = false;

  /** Number of columns matching the number of cards. */
  protected readonly cols = computed<number>(() => {
    const g = this.game();
    if (!g) return 4;
    return COLS_BY_PAIRS[g.pairs] ?? Math.ceil(Math.sqrt(g.board.length * 1.6));
  });

  /** Aspect ratio of the grid (for the size calculation in the CSS). */
  protected readonly ratio = computed<number>(() => {
    const g = this.game();
    if (!g) return 1;
    const cols = this.cols();
    return cols / Math.ceil(g.board.length / cols);
  });

  /** Result from the point of view of the player on THIS device. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    if (g.winnerId === 'tie') return 'tie';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  constructor() {
    // Fireworks + sound on a win, "wah-wah" on a loss, bells on a draw.
    effect(() => {
      const finished = this.game()?.status === 'finished';
      if (finished && !this.effectsShown) {
        this.effectsShown = true;
        const o = this.outcome();
        if (o === 'win') this.effects.celebrate();
        else if (o === 'lose') this.effects.commiserate();
        else this.effects.draw();
      } else if (!finished && this.effectsShown) {
        this.effectsShown = false;
        this.effects.stop();
      }
    });
  }

  ngOnDestroy(): void {
    this.effects.stop();
  }

  /**
   * Display name of a player: names entered by players stay unchanged.
   * ONLY the computer opponent is translated, so that a language change also
   * applies in a running game (its stored name is only a fallback value).
   */
  protected displayName(p: MemoPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.memoQuizGame.computer')
      : p.name;
  }

  /** Name of the player whose turn it is. */
  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  /** Name of the winner (for the result message). */
  protected winnerName(): string {
    const g = this.game();
    if (!g || !g.winnerId || g.winnerId === 'tie') return '';
    return this.displayName(g.players[g.winnerId]);
  }

  protected faceUp(i: number): boolean {
    const g = this.game();
    if (!g) return false;
    return !!g.board[i]?.matchedBy || g.flipped.includes(i);
  }

  protected matched(i: number): boolean {
    return !!this.game()?.board[i]?.matchedBy;
  }

  protected mine(i: number): boolean {
    return this.game()?.board[i]?.matchedBy === this.svc.playerId;
  }

  protected clickable(i: number): boolean {
    const g = this.game();
    if (!g || !this.svc.canFlip()) return false;
    return !g.board[i]?.matchedBy && !g.flipped.includes(i);
  }

  protected onFlip(i: number): void {
    this.svc.flip(i);
  }

  protected playAgain(): void {
    this.effects.stop();
    this.svc.playAgain();
  }

  protected leave(): void {
    this.effects.stop();
    this.svc.leaveGame();
  }
}
