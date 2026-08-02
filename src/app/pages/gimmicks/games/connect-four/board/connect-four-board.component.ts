import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { COLS, ROWS } from '../game/board.utils';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { CPU_ID, ConnectFourService } from '../game/connect-four.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import type { C4Color, C4Player } from '../game/game.types';

type Outcome = 'win' | 'lose' | 'tie';

/** Das Spielfeld mit Kopfzeile, Warte- und Ergebnis-Overlay. */
@Component({
  selector: 'app-connect-four-board',
  imports: [TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './connect-four-board.component.html',
  styleUrl: './connect-four-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectFourBoardComponent implements OnDestroy {
  protected readonly svc = inject(ConnectFourService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  protected readonly game = this.svc.game;

  protected readonly cols = Array.from({ length: COLS }, (_, i) => i);
  protected readonly rows = Array.from({ length: ROWS }, (_, i) => i);

  private effectsShown = false;

  /**
   * Anzeigename eines Spielers: selbst eingegebene Namen bleiben unverändert.
   * NUR beim Computer-Gegner wird übersetzt, damit ein Sprachwechsel auch im
   * laufenden Spiel greift (sein gespeicherter Name ist nur ein Rückfallwert).
   */
  protected displayName(p: C4Player | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.connectFourGame.computer')
      : p.name;
  }

  /** Name des Spielers, der gerade am Zug ist. */
  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  /** Ergebnis aus Sicht des Spielers an DIESEM Gerät. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    if (g.winnerId === 'tie') return 'tie';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  /** Name des Gewinners (für die Ergebnis-Meldung). */
  protected winnerName(): string {
    const g = this.game();
    if (!g || !g.winnerId || g.winnerId === 'tie') return '';
    return this.displayName(g.players[g.winnerId]);
  }

  constructor() {
    // Feuerwerk + Klang beim Sieg, "Wah-Wah" beim Verlieren, Glöckchen bei Remis.
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

  protected idx(row: number, col: number): number {
    return row * COLS + col;
  }

  /** Farbe des Steins in diesem Feld (oder null, wenn leer). */
  protected colorAt(row: number, col: number): C4Color | null {
    const g = this.game();
    const pid = g?.board[this.idx(row, col)];
    if (!g || !pid) return null;
    return g.players[pid]?.color ?? null;
  }

  protected emojiAt(row: number, col: number): string {
    const g = this.game();
    const pid = g?.board[this.idx(row, col)];
    return (g && pid && g.players[pid]?.emoji) || '';
  }

  protected isWin(row: number, col: number): boolean {
    return !!this.game()?.winningCells?.includes(this.idx(row, col));
  }

  protected isLastMove(row: number, col: number): boolean {
    return this.game()?.lastMove === this.idx(row, col);
  }

  /** Darf in diese Spalte geworfen werden? */
  protected canDrop(col: number): boolean {
    const g = this.game();
    if (!g || !this.svc.canPlay()) return false;
    return !g.board[this.idx(0, col)]; // oberste Zelle frei?
  }

  protected drop(col: number): void {
    this.svc.drop(col);
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
