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
import { ToastrService } from 'ngx-toastr';
import { DraggableDirective } from '../../shared/draggable.directive';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import { UnoService } from '../game/uno.service';
import { COLORS, type UnoCard, type UnoColor, type UnoPlayer } from '../game/uno.types';

type Outcome = 'win' | 'lose';

/**
 * The game table: players at the top, piles in the middle, own cards at the bottom.
 * Plus the overlays for color choice, lobby, device handover and game over.
 */
@Component({
  selector: 'app-uno-board',
  imports: [TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './uno-board.component.html',
  styleUrl: './uno-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnoBoardComponent implements OnDestroy {
  protected readonly svc = inject(UnoService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  private readonly toastr = inject(ToastrService);
  protected readonly game = this.svc.game;

  /** Selectable colors for the wild card (order = display). */
  protected readonly pickColors: UnoColor[] = COLORS;
  /** Id of the currently tapped wild card for which a color is being chosen. */
  protected readonly pendingWild = signal<string | null>(null);

  private effectsShown = false;
  /** Timestamp of the last reported exit – prevents old notices. */
  private lastLeftSeen: number | null = null;

  /**
   * Display name: ONLY computer opponents are translated, so that a
   * language change also applies in a running game.
   */
  protected displayName(p: UnoPlayer | null | undefined): string {
    if (!p) return '';
    if (!p.cpu) return p.name;
    const nr = p.id.startsWith('cpu_') ? p.id.slice(4) : '';
    return `${this.translate.instant('gimmicks.games.unoGame.computer')} ${nr}`.trim();
  }

  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected winnerName(): string {
    const g = this.game();
    if (!g?.winnerId) return '';
    return this.displayName(g.players[g.winnerId]);
  }

  /** Name of the person who should take over next on the device. */
  protected handOwnerName(): string {
    const g = this.game();
    if (!g) return '';
    return this.displayName(g.players[g.currentTurn]);
  }

  /** Result from the point of view of the player on THIS device. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    // On the device, someone sitting here always wins – except the computer.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  /** Am I already done while the others keep playing? */
  protected readonly myRank = computed<number>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return 0;
    return this.svc.rankOf(this.svc.handOwner());
  });

  constructor() {
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
          this.translate.instant('gimmicks.games.unoGame.playerLeft', { name }),
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
  }

  ngOnDestroy(): void {
    this.effects.stop();
  }

  // ---- Card display --------------------------------------------------------
  /** Center text of a card. */
  protected label(card: UnoCard): string {
    switch (card.value) {
      case 'skip':
        return '🚫';
      case 'rev':
        return '🔁';
      case 'd2':
        return '+2';
      case 'wild':
        return '🌈';
      case 'd4':
        return '+4';
      default:
        return card.value; // 0–9
    }
  }

  /** Smaller corner text of a card (number/abbreviation). */
  protected corner(card: UnoCard): string {
    switch (card.value) {
      case 'skip':
        return '⦸';
      case 'rev':
        return '⇄';
      case 'd2':
        return '+2';
      case 'wild':
        return '★';
      case 'd4':
        return '+4';
      default:
        return card.value;
    }
  }

  // ---- Actions -------------------------------------------------------------
  protected onCardClick(card: UnoCard): void {
    if (!this.svc.playable(card)) return;
    if (card.color === 'w') {
      this.pendingWild.set(card.id); // Open the color choice overlay
      return;
    }
    this.svc.playCard(card.id);
  }

  protected chooseColor(color: UnoColor): void {
    const id = this.pendingWild();
    this.pendingWild.set(null);
    if (id) this.svc.playCard(id, color);
  }

  protected cancelWild(): void {
    this.pendingWild.set(null);
  }

  protected onDraw(): void {
    this.svc.drawCard();
  }

  protected reveal(): void {
    this.svc.revealHand();
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
