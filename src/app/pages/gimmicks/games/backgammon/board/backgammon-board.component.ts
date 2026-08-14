import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { CPU_ID, BackgammonService } from '../game/backgammon.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import type { BgColor, BgPlayer } from '../game/game.types';

type Outcome = 'win' | 'lose';

// Sichtbare Anordnung der 24 Punkte (Index ins board-Array).
// Oben links → oben rechts, unten links → unten rechts.
const TOP_LEFT = [12, 13, 14, 15, 16, 17];
const TOP_RIGHT = [18, 19, 20, 21, 22, 23];
const BOTTOM_LEFT = [11, 10, 9, 8, 7, 6];
const BOTTOM_RIGHT = [5, 4, 3, 2, 1, 0];

// Augen-Muster für die Würfel (3×3-Raster, true = Punkt sichtbar).
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Das Spielfeld mit Kopfzeile, Warte- und Ergebnis-Overlay. */
@Component({
  selector: 'app-backgammon-board',
  imports: [NgTemplateOutlet, TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './backgammon-board.component.html',
  styleUrl: './backgammon-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgammonBoardComponent implements OnDestroy {
  protected readonly svc = inject(BackgammonService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  protected readonly game = this.svc.game;

  protected readonly topLeft = TOP_LEFT;
  protected readonly topRight = TOP_RIGHT;
  protected readonly bottomLeft = BOTTOM_LEFT;
  protected readonly bottomRight = BOTTOM_RIGHT;

  /** Aktuell angetippter Stein als Startpunkt (-1 = Bar). */
  protected readonly selectedFrom = signal<number | null>(null);

  private effectsShown = false;
  private passTimer: ReturnType<typeof setInterval> | null = null;

  /** Restsekunden, bis automatisch weitergegeben wird (0 = inaktiv). */
  protected readonly countdown = signal(0);

  /** Felder, von denen aus gezogen werden darf. */
  protected readonly sources = computed<Set<number>>(() => new Set(this.svc.legalSources()));

  /** Mögliche Ziele für den gewählten Stein: Zielpunkt → Würfelwert. */
  protected readonly targets = computed<Map<number, number>>(() => {
    const f = this.selectedFrom();
    const m = new Map<number, number>();
    if (f === null) return m;
    for (const mv of this.svc.targetsFrom(f)) m.set(mv.to, mv.die);
    return m;
  });

  /**
   * Anzeigename eines Spielers: selbst eingegebene Namen bleiben unverändert.
   * NUR beim Computer-Gegner wird übersetzt, damit ein Sprachwechsel auch im
   * laufenden Spiel greift (sein gespeicherter Name ist nur ein Rückfallwert).
   */
  protected displayName(p: BgPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.backgammonGame.computer')
      : p.name;
  }

  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  constructor() {
    effect(() => {
      const g = this.game();
      if (!g || !this.svc.isMyTurn() || !g.rolled) {
        if (this.selectedFrom() !== null) this.selectedFrom.set(null);
      }
    });

    effect(() => {
      const finished = this.game()?.status === 'finished';
      if (finished && !this.effectsShown) {
        this.effectsShown = true;
        if (this.outcome() === 'win') this.effects.celebrate();
        else this.effects.commiserate();
      } else if (!finished && this.effectsShown) {
        this.effectsShown = false;
        this.effects.stop();
      }
    });

    effect(() => {
      if (this.svc.noMoves()) {
        if (this.passTimer === null) {
          this.countdown.set(5);
          this.passTimer = setInterval(() => {
            const next = this.countdown() - 1;
            if (next <= 0) {
              this.clearPassTimer();
              this.svc.passTurn();
            } else {
              this.countdown.set(next);
            }
          }, 1000);
        }
      } else {
        this.clearPassTimer();
      }
    });
  }

  ngOnDestroy(): void {
    this.effects.stop();
    this.clearPassTimer();
  }

  private clearPassTimer(): void {
    if (this.passTimer !== null) {
      clearInterval(this.passTimer);
      this.passTimer = null;
    }
    this.countdown.set(0);
  }

  protected countAt(i: number): number {
    return Math.abs(this.game()?.board[i] ?? 0);
  }

  protected colorAt(i: number): BgColor | null {
    const v = this.game()?.board[i] ?? 0;
    return v > 0 ? 'white' : v < 0 ? 'black' : null;
  }

  /** Bis zu 5 Steine zeichnen; der Rest wird als Zahl angezeigt. */
  protected discs(i: number): number[] {
    return Array.from({ length: Math.min(this.countAt(i), 5) }, (_, k) => k);
  }

  /** Zahl für „mehr als 5 Steine", sonst 0. */
  protected overflow(i: number): number {
    const c = this.countAt(i);
    return c > 5 ? c : 0;
  }

  protected darkTriangle(i: number): boolean {
    return i % 2 === 0;
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

  protected range(n: number): number[] {
    return Array.from({ length: Math.min(n, 5) }, (_, k) => k);
  }

  protected barCount(color: BgColor): number {
    const g = this.game();
    if (!g) return 0;
    return color === 'white' ? g.barWhite : g.barBlack;
  }

  protected offCount(color: BgColor): number {
    const g = this.game();
    if (!g) return 0;
    return color === 'white' ? g.offWhite : g.offBlack;
  }

  protected barIsSource(): boolean {
    return this.sources().has(-1);
  }

  protected offIsTarget(): boolean {
    return this.targets().has(-1);
  }

  protected pips(value: number): boolean[] {
    const on = PIPS[value] ?? [];
    return Array.from({ length: 9 }, (_, k) => on.includes(k));
  }

  protected tapPoint(i: number): void {
    if (!this.svc.isMyTurn()) return;
    const sel = this.selectedFrom();
    if (sel !== null) {
      const die = this.targets().get(i);
      if (die !== undefined) {
        this.svc.move(sel, i, die);
        this.selectedFrom.set(null);
        return;
      }
    }
    if (this.sources().has(i)) {
      this.selectedFrom.set(sel === i ? null : i);
    } else {
      this.selectedFrom.set(null);
    }
  }

  protected tapBar(): void {
    if (!this.svc.isMyTurn()) return;
    if (this.barIsSource()) {
      this.selectedFrom.set(this.selectedFrom() === -1 ? null : -1);
    }
  }

  protected tapOff(): void {
    if (!this.svc.isMyTurn()) return;
    const sel = this.selectedFrom();
    if (sel === null) return;
    const die = this.targets().get(-1);
    if (die !== undefined) {
      this.svc.move(sel, -1, die);
      this.selectedFrom.set(null);
    }
  }

  protected roll(): void {
    this.svc.roll();
  }

  protected pass(): void {
    this.clearPassTimer();
    this.svc.passTurn();
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
