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
 * Der Spieltisch: Mitspieler oben, Stapel in der Mitte, eigene Karten unten.
 * Dazu die Overlays für Farbwahl, Lobby, Geräteübergabe und Spielende.
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

  /** Auswahlfarben für den Joker (Reihenfolge = Anzeige). */
  protected readonly pickColors: UnoColor[] = COLORS;
  /** Id der gerade getippten Joker-Karte, für die eine Farbe gewählt wird. */
  protected readonly pendingWild = signal<string | null>(null);

  private effectsShown = false;
  /** Zeitstempel des zuletzt gemeldeten Ausstiegs – verhindert alte Hinweise. */
  private lastLeftSeen: number | null = null;

  /**
   * Anzeigename: NUR bei Computer-Gegnern wird übersetzt, damit ein
   * Sprachwechsel auch im laufenden Spiel greift.
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

  /** Name dessen, der am Gerät als Nächster übernehmen soll. */
  protected handOwnerName(): string {
    const g = this.game();
    if (!g) return '';
    return this.displayName(g.players[g.currentTurn]);
  }

  /** Ergebnis aus Sicht des Spielers an DIESEM Gerät. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    // Am Gerät gewinnt immer jemand, der hier sitzt – außer der Computer.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  /** Bin ich schon fertig, während die anderen weiterspielen? */
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
          this.translate.instant('gimmicks.games.unoGame.playerLeft', { name }),
          'Info',
          {
            positionClass: 'toast-bottom-center',
            timeOut: 6000,
            // Der Hinweis liegt über dem Spielfeld (bei Uno über der Hand).
            // Ohne diese Klasse fängt er den ersten Klick ab: statt den Zug zu
            // machen, schließt man nur den Hinweis und muss ein zweites Mal
            // klicken. Siehe .game-notice in styles.scss.
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

  // ---- Kartendarstellung ---------------------------------------------------
  /** Mittiger Text einer Karte. */
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

  /** Kleinerer Eck-Text einer Karte (Zahl/Kürzel). */
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

  // ---- Aktionen ------------------------------------------------------------
  protected onCardClick(card: UnoCard): void {
    if (!this.svc.playable(card)) return;
    if (card.color === 'w') {
      this.pendingWild.set(card.id); // Farbwahl-Overlay öffnen
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
