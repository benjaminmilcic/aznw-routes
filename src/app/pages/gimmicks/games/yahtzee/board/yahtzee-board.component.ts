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

/** Game board: dice, roll controls and the shared score sheet. */
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

  // ---- Scroll hints on the sheet ------------------------------------------
  private readonly sheetWrap = viewChild<ElementRef<HTMLDivElement>>('sheetWrap');
  /** There are more rows above/below the visible area. */
  protected readonly canScrollUp = signal(false);
  protected readonly canScrollDown = signal(false);
  /** There are more player columns to the left/right. */
  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);
  /** Width of the fixed label column – the left arrow sits next to it. */
  protected readonly labelWidth = signal(0);
  private resizeObserver: ResizeObserver | null = null;
  /** Timestamp of the last reported exit – prevents old notices. */
  private lastLeftSeen: number | null = null;

  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    if (g.winnerId === 'tie') return 'tie';
    // On the device, someone sitting here always wins.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
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

    // The table height can change after every entry.
    effect(() => {
      this.game();
      queueMicrotask(() => this.updateScrollHints());
    });

    // Whoever is on turn should always be visible – even if many columns
    // stand side by side and you have to scroll sideways.
    effect(() => {
      const current = this.game()?.currentTurn;
      if (!current) return;
      queueMicrotask(() => this.scrollPlayerIntoView(current));
    });

    // Notice when someone leaves the round online.
    effect(() => {
      const g = this.game();
      if (!g) {
        this.lastLeftSeen = null;
        return;
      }
      const at = g.lastLeft?.at ?? 0;
      if (this.lastLeftSeen === null) {
        this.lastLeftSeen = at; // first look at this game: report nothing
        return;
      }
      if (at > this.lastLeftSeen) {
        this.lastLeftSeen = at;
        const name = g.lastLeft?.name ?? '';
        this.toastr.info(
          this.translate.instant('gimmicks.games.yahtzeeGame.playerLeft', { name }),
          'Info',
          {
            positionClass: 'toast-bottom-center',
            timeOut: 6000,
            // The notice lies above the board (in Uno above the hand).
            // Without this class it catches the first click: instead of making
            // the move, you only close the notice and have to click a second
            // time. See .game-notice in styles.scss.
            toastClass: 'ngx-toastr game-notice',
            tapToDismiss: false,
          },
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

  /** Checks in all four directions whether something is still outside the view. */
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

  /** Tapping the hint scrolls a bit further. */
  protected scrollSheet(direction: 'up' | 'down'): void {
    const el = this.sheetWrap()?.nativeElement;
    if (el) el.scrollTop += direction === 'down' ? 160 : -160;
  }

  /** Page sideways if not all player columns fit. */
  protected scrollSheetX(direction: 1 | -1): void {
    const el = this.sheetWrap()?.nativeElement;
    if (el) el.scrollLeft += direction * 120;
  }

  /**
   * Moves this player's column into view. The fixed
   * label column lies on top, that's why the visible area only starts
   * behind it.
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

  /** Computer names follow the selected language, real names stay. */
  protected displayName(p: YPlayer | null | undefined): string {
    if (!p) return '';
    if (!p.cpu) return p.name;
    // Stored is e.g. "Computer 2" – only the word is translated.
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

  // ---- Dice ----------------------------------------------------------------
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

  // ---- Score sheet ---------------------------------------------------------
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

  /** Points this roll would score in the category. */
  protected potential(cat: Category): number {
    const g = this.game();
    return g ? scoreFor(cat, g.dice) : 0;
  }

  /** Preview only in the column of the player whose turn it is. */
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

  // ---- Actions -------------------------------------------------------------
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
