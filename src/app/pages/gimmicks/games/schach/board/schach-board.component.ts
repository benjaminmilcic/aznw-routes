import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { CPU_ID, SchachService } from '../game/schach.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import type { ChessColor, ChessPlayer } from '../game/game.types';

type Outcome = 'win' | 'lose' | 'draw';

const GLYPH: Record<string, string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const START: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const CAP_ORDER = ['q', 'r', 'b', 'n', 'p'] as const;

@Component({
  selector: 'app-schach-board',
  imports: [TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './schach-board.component.html',
  styleUrl: './schach-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchachBoardComponent implements OnDestroy {
  protected readonly svc = inject(SchachService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  protected readonly game = this.svc.game;

  protected readonly selectedFrom = signal<number | null>(null);

  private effectsShown = false;

  protected readonly view = computed<number[]>(() => {
    const flip = this.svc.myColor() === 'black';
    return Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));
  });

  protected readonly sources = computed<Set<number>>(() => new Set(this.svc.legalSources()));

  protected readonly targets = computed<Set<number>>(() => {
    const f = this.selectedFrom();
    if (f === null) return new Set<number>();
    return new Set(this.svc.targetsFrom(f));
  });

  protected displayName(p: ChessPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.chessGame.computer')
      : p.name;
  }

  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected readonly checkSquare = computed<number>(() => {
    const g = this.game();
    if (!g || !g.check) return -1;
    const color = this.svc.currentPlayer()?.color;
    return color ? this.svc.kingOf(color) : -1;
  });

  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    if (g.winnerId === 'draw') return 'draw';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  constructor() {
    effect(() => {
      if (!this.svc.isMyTurn() && this.selectedFrom() !== null) this.selectedFrom.set(null);
    });

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

  protected isDark(i: number): boolean {
    return (Math.floor(i / 8) + (i % 8)) % 2 === 1;
  }

  protected pieceColor(i: number): ChessColor | null {
    const p = this.game()?.board[i] ?? '';
    if (!p) return null;
    return p === p.toUpperCase() ? 'white' : 'black';
  }

  protected glyph(i: number): string {
    const p = this.game()?.board[i] ?? '';
    return p ? GLYPH[p.toLowerCase()] ?? '' : '';
  }

  protected isSource(i: number): boolean {
    return this.sources().has(i);
  }

  protected isTarget(i: number): boolean {
    return this.targets().has(i);
  }

  protected isSelected(i: number): boolean {
    return this.selectedFrom() === i;
  }

  protected isLast(i: number): boolean {
    const lm = this.game()?.lastMove;
    return !!lm && (lm.from === i || lm.to === i);
  }

  protected isCheck(i: number): boolean {
    return this.checkSquare() === i;
  }

  protected readonly ranks = computed<number[]>(() => {
    const flip = this.svc.myColor() === 'black';
    return flip ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  });

  protected readonly files = computed<string[]>(() => {
    const flip = this.svc.myColor() === 'black';
    const f = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    return flip ? f.slice().reverse() : f;
  });

  protected isCapture(i: number): boolean {
    return this.isTarget(i) && !!this.game()?.board[i];
  }

  private readonly captures = computed<{ white: string[]; black: string[] }>(() => {
    const g = this.game();
    const counts: Record<string, number> = {};
    if (g) for (const p of g.board) if (p) counts[p] = (counts[p] ?? 0) + 1;

    const build = (white: boolean): string[] => {
      const ch = (t: string) => (white ? t.toUpperCase() : t);
      let promoted = 0;
      for (const t of ['q', 'r', 'b', 'n'] as const) {
        const extra = (counts[ch(t)] ?? 0) - START[t];
        if (extra > 0) promoted += extra;
      }
      const glyphs: string[] = [];
      for (const t of CAP_ORDER) {
        let missing = START[t] - (counts[ch(t)] ?? 0);
        if (t === 'p') missing -= promoted;
        for (let k = 0; k < missing; k++) glyphs.push(GLYPH[t]);
      }
      return glyphs;
    };

    return { white: build(true), black: build(false) };
  });

  protected readonly capturedByWhite = computed<string[]>(() => this.captures().black);
  protected readonly capturedByBlack = computed<string[]>(() => this.captures().white);

  protected tapSquare(i: number): void {
    if (!this.svc.isMyTurn()) return;
    const sel = this.selectedFrom();
    if (sel !== null && this.targets().has(i)) {
      this.svc.move(sel, i);
      this.selectedFrom.set(null);
      return;
    }
    if (this.sources().has(i)) {
      this.selectedFrom.set(sel === i ? null : i);
    } else {
      this.selectedFrom.set(null);
    }
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
