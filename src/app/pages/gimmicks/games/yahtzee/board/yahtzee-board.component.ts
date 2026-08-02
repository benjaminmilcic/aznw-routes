import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import { YahtzeeDiceComponent } from '../dice/yahtzee-dice.component';
import { YahtzeeService } from '../game/yahtzee.service';
import { CATEGORIES, scoreFor, totalsFor, type Category, type ScoreMap } from '../game/scoring';
import type { YPlayer } from '../game/yahtzee.types';

type Outcome = 'win' | 'lose' | 'tie';

/** Spielfeld: Würfel, Wurf-Steuerung und die gemeinsame Punktetabelle. */
@Component({
  selector: 'app-yahtzee-board',
  imports: [TranslateModule, YahtzeeDiceComponent, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './yahtzee-board.component.html',
  styleUrl: './yahtzee-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YahtzeeBoardComponent implements OnDestroy {
  protected readonly svc = inject(YahtzeeService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  private readonly toastr = inject(ToastrService);
  protected readonly game = this.svc.game;

  protected readonly upperCats = CATEGORIES.filter((c) => c.upper).map((c) => c.key);
  protected readonly lowerCats = CATEGORIES.filter((c) => !c.upper).map((c) => c.key);

  private effectsShown = false;

  protected readonly players = this.svc.players;

  // ---- Scroll-Hinweise am Zettel ------------------------------------------
  private readonly sheetWrap = viewChild<ElementRef<HTMLDivElement>>('sheetWrap');
  /** Ober-/unterhalb des sichtbaren Bereichs stehen noch Zeilen. */
  protected readonly canScrollUp = signal(false);
  protected readonly canScrollDown = signal(false);
  /** Links/rechts stehen noch weitere Spieler-Spalten. */
  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);
  /** Breite der festen Bezeichnungsspalte – der Links-Pfeil sitzt daneben. */
  protected readonly labelWidth = signal(0);
  private resizeObserver: ResizeObserver | null = null;
  /** Zeitstempel des zuletzt gemeldeten Ausstiegs – verhindert alte Hinweise. */
  private lastLeftSeen: number | null = null;

  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    if (g.winnerId === 'tie') return 'tie';
    // Am Gerät gewinnt immer jemand, der hier sitzt.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

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

    // Nach jedem Eintrag kann sich die Tabellenhöhe ändern.
    effect(() => {
      this.game();
      queueMicrotask(() => this.updateScrollHints());
    });

    // Wer dran ist, soll immer sichtbar sein – auch wenn viele Spalten
    // nebeneinander stehen und seitlich gescrollt werden muss.
    effect(() => {
      const current = this.game()?.currentTurn;
      if (!current) return;
      queueMicrotask(() => this.scrollPlayerIntoView(current));
    });

    // Hinweis, wenn online jemand die Runde verlässt.
    effect(() => {
      const g = this.game();
      if (!g) {
        this.lastLeftSeen = null;
        return;
      }
      const at = g.lastLeft?.at ?? 0;
      if (this.lastLeftSeen === null) {
        this.lastLeftSeen = at; // erster Blick auf dieses Spiel: nichts melden
        return;
      }
      if (at > this.lastLeftSeen) {
        this.lastLeftSeen = at;
        const name = g.lastLeft?.name ?? '';
        this.toastr.info(
          this.translate.instant('gimmicks.games.yahtzeeGame.playerLeft', { name }),
          'Info',
          { positionClass: 'toast-bottom-center', timeOut: 6000 },
        );
      }
    });

    afterNextRender(() => {
      this.updateScrollHints();
      const el = this.sheetWrap()?.nativeElement;
      if (el && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.updateScrollHints());
        this.resizeObserver.observe(el);
      }
    });
  }

  ngOnDestroy(): void {
    this.effects.stop();
    this.resizeObserver?.disconnect();
  }

  /** Prüft in alle vier Richtungen, ob noch etwas außerhalb des Sichtfelds liegt. */
  protected updateScrollHints(): void {
    const el = this.sheetWrap()?.nativeElement;
    if (!el) return;
    this.canScrollUp.set(el.scrollTop > 4);
    this.canScrollDown.set(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    this.canScrollLeft.set(el.scrollLeft > 4);
    this.canScrollRight.set(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);

    const label = el.querySelector<HTMLElement>('tbody .lbl');
    if (label) this.labelWidth.set(label.offsetWidth);
  }

  /** Tippen auf den Hinweis scrollt ein Stück weiter. */
  protected scrollSheet(direction: 'up' | 'down'): void {
    const el = this.sheetWrap()?.nativeElement;
    if (el) el.scrollTop += direction === 'down' ? 160 : -160;
  }

  /** Seitwärts blättern, wenn nicht alle Spieler-Spalten passen. */
  protected scrollSheetX(direction: 1 | -1): void {
    const el = this.sheetWrap()?.nativeElement;
    if (el) el.scrollLeft += direction * 120;
  }

  /**
   * Schiebt die Spalte dieses Spielers ins Sichtfeld. Die feste
   * Bezeichnungsspalte liegt darüber, deshalb beginnt der sichtbare Bereich
   * erst hinter ihr.
   */
  private scrollPlayerIntoView(playerId: string): void {
    const wrap = this.sheetWrap()?.nativeElement;
    const column = wrap?.querySelector<HTMLElement>(`th[data-player="${playerId}"]`);
    if (!wrap || !column) return;

    const wrapBox = wrap.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    const visibleLeft = wrapBox.left + this.labelWidth();
    const margin = 4;

    if (columnBox.left < visibleLeft) {
      wrap.scrollLeft -= visibleLeft - columnBox.left + margin;
    } else if (columnBox.right > wrapBox.right) {
      wrap.scrollLeft += columnBox.right - wrapBox.right + margin;
    }
  }

  /** Computer-Namen folgen der eingestellten Sprache, echte Namen bleiben. */
  protected displayName(p: YPlayer | null | undefined): string {
    if (!p) return '';
    if (!p.cpu) return p.name;
    // Gespeichert ist z. B. "Computer 2" – nur das Wort wird übersetzt.
    const nr = p.name.replace(/\D+/g, '');
    const word = this.translate.instant('gimmicks.games.yahtzeeGame.computer');
    return nr ? `${word} ${nr}` : word;
  }

  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected winnerName(): string {
    const g = this.game();
    if (!g || !g.winnerId || g.winnerId === 'tie') return '';
    return this.displayName(g.players[g.winnerId]);
  }

  // ---- Würfel --------------------------------------------------------------
  protected dice(): number[] {
    return this.game()?.dice ?? [1, 1, 1, 1, 1];
  }

  protected held(): boolean[] {
    return this.game()?.held ?? [false, false, false, false, false];
  }

  protected rollsLeft(): number {
    return this.game()?.rollsLeft ?? 0;
  }

  protected rolledThisTurn(): boolean {
    return !!this.game()?.rolledThisTurn;
  }

  protected canHold(): boolean {
    return this.svc.isMyTurn() && this.rolledThisTurn() && this.rollsLeft() > 0;
  }

  protected canRoll(): boolean {
    return this.svc.isMyTurn() && this.rollsLeft() > 0;
  }

  // ---- Punktetabelle -------------------------------------------------------
  protected scoresOf(playerId: string): ScoreMap {
    return this.game()?.scores[playerId] ?? {};
  }

  protected valueOf(playerId: string, cat: Category): number | undefined {
    return this.scoresOf(playerId)[cat];
  }

  protected totalsOf(playerId: string) {
    return totalsFor(this.scoresOf(playerId));
  }

  protected isCurrent(playerId: string): boolean {
    return this.game()?.currentTurn === playerId;
  }

  /** Punkte, die dieser Wurf in der Kategorie bringen würde. */
  protected potential(cat: Category): number {
    const g = this.game();
    return g ? scoreFor(cat, g.dice) : 0;
  }

  /** Vorschau nur in der Spalte des Spielers, der gerade dran ist. */
  protected showPotential(playerId: string, cat: Category): boolean {
    return (
      this.isCurrent(playerId) &&
      this.svc.isMyTurn() &&
      this.rolledThisTurn() &&
      this.valueOf(playerId, cat) == null
    );
  }

  protected canPick(playerId: string, cat: Category): boolean {
    return this.showPotential(playerId, cat);
  }

  // ---- Aktionen ------------------------------------------------------------
  protected roll(): void {
    this.svc.roll();
  }

  protected hold(i: number): void {
    this.svc.toggleHold(i);
  }

  protected choose(playerId: string, cat: Category): void {
    if (this.canPick(playerId, cat)) this.svc.choose(cat);
  }

  protected startOnline(): void {
    void this.svc.startOnlineGame();
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
