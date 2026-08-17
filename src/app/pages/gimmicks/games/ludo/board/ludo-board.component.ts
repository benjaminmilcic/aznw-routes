import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { DraggableDirective } from '../../shared/draggable.directive';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import { LudoService } from '../game/ludo.service';
import { GOAL_BASE, SEAT_START, TRACK_LEN, type LudoPlayer } from '../game/ludo.types';

type Outcome = 'win' | 'lose';

/** Die 40 Felder der gemeinsamen Laufbahn als [Zeile, Spalte] im 11×11-Raster. */
const TRACK: [number, number][] = [
  [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
  [3, 4], [2, 4], [1, 4], [0, 4],
  [0, 5],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6],
  [4, 7], [4, 8], [4, 9], [4, 10],
  [5, 10],
  [6, 10], [6, 9], [6, 8], [6, 7], [6, 6],
  [7, 6], [8, 6], [9, 6], [10, 6],
  [10, 5],
  [10, 4], [9, 4], [8, 4], [7, 4], [6, 4],
  [6, 3], [6, 2], [6, 1], [6, 0],
  [5, 0],
];

/** Vier Zielfelder je Sitzplatz (führen zur Mitte). */
const GOAL: [number, number][][] = [
  [[5, 1], [5, 2], [5, 3], [5, 4]], // Sitz 0 – links
  [[1, 5], [2, 5], [3, 5], [4, 5]], // Sitz 1 – oben
  [[5, 9], [5, 8], [5, 7], [5, 6]], // Sitz 2 – rechts
  [[9, 5], [8, 5], [7, 5], [6, 5]], // Sitz 3 – unten
];

/** Vier Garagenplätze je Sitzplatz (die Ecken des Bretts). */
const GARAGE: [number, number][][] = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], // Sitz 0 – oben links
  [[0, 9], [0, 10], [1, 9], [1, 10]], // Sitz 1 – oben rechts
  [[9, 9], [10, 9], [9, 10], [10, 10]], // Sitz 2 – unten rechts
  [[9, 0], [10, 0], [9, 1], [10, 1]], // Sitz 3 – unten links
];

/** Farbe je Sitzplatz: rot, orange, blau, violett. */
const SEAT_COLORS = ['#dc2626', '#f59e0b', '#2563eb', '#9333ea'];

interface Cell {
  row: number;
  col: number;
  /** 'track' | 'goal' | 'home' | 'center' | 'void' */
  kind: 'track' | 'goal' | 'home' | 'center' | 'void';
  /** Sitz, dessen Farbe das Feld trägt (Start/Ziel/Garage), sonst -1. */
  seat: number;
  /** true für ein Startfeld auf der Laufbahn. */
  start: boolean;
}

interface Token {
  key: string;
  seat: number;
  pieceIndex: number;
  color: string;
  emoji: string;
  movable: boolean;
}

/**
 * Das laufende Spiel: 11×11-Brett, Würfel und die Overlays für die
 * Online-Lobby bzw. das Spielende.
 */
@Component({
  selector: 'app-ludo-board',
  imports: [TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './ludo-board.component.html',
  styleUrl: './ludo-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LudoBoardComponent implements OnDestroy {
  protected readonly svc = inject(LudoService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  private readonly toastr = inject(ToastrService);
  protected readonly game = this.svc.game;

  /** Statisches 11×11-Brettmodell (Feldarten). */
  protected readonly cells: Cell[] = this.buildCells();

  private effectsShown = false;
  /** Zeitstempel des zuletzt gemeldeten Ausstiegs – verhindert alte Hinweise. */
  private lastLeftSeen: number | null = null;

  /**
   * Anzeigename: NUR bei Computer-Gegnern wird übersetzt, damit ein
   * Sprachwechsel auch im laufenden Spiel greift.
   */
  protected displayName(p: LudoPlayer | null | undefined): string {
    if (!p) return '';
    if (!p.cpu) return p.name;
    const nr = p.id.startsWith('cpu_') ? p.id.slice(4) : '';
    return `${this.translate.instant('gimmicks.games.ludoGame.computer')} ${nr}`.trim();
  }

  /** Name des Spielers, der gerade am Zug ist. */
  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected winnerName(): string {
    const g = this.game();
    if (!g?.winnerId) return '';
    return this.displayName(g.players[g.winnerId]);
  }

  /** Farbe eines Spielers – richtet sich nach seinem Sitzplatz. */
  protected colorOf(id: string): string {
    const g = this.game();
    if (!g) return SEAT_COLORS[0];
    return SEAT_COLORS[this.svc.seatOf(g, id)] ?? '#475569';
  }

  /** Ergebnis aus Sicht des Spielers an DIESEM Gerät. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    // Am Gerät gewinnt immer jemand, der hier sitzt – außer der Computer.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  /**
   * Bin ich schon im Ziel, während die anderen noch spielen? Dann steht
   * unten mein Platz statt der Würfel-Aufforderung.
   */
  protected readonly myRank = computed<number>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return 0;
    return this.svc.rankOf(this.svc.playerId);
  });

  /** Map "row,col" → Figuren auf diesem Feld. */
  protected readonly tokenMap = computed<Map<string, Token[]>>(() => {
    const g = this.game();
    const map = new Map<string, Token[]>();
    if (!g) return map;
    const legal = this.svc.legalMoves();
    const canAct = this.svc.canAct();

    for (const id of g.order) {
      const player = g.players[id];
      if (!player) continue;
      const seat = this.svc.seatOf(g, id);
      const color = SEAT_COLORS[seat] ?? '#475569';
      const pieces = g.pieces[id] ?? [];

      for (let i = 0; i < pieces.length; i++) {
        const pos = pieces[i];
        let coord: [number, number];
        if (pos < 0) coord = GARAGE[seat][i];
        else if (pos < TRACK_LEN) coord = TRACK[(SEAT_START[seat] + pos) % TRACK_LEN];
        else coord = GOAL[seat][pos - GOAL_BASE];

        const movable =
          canAct && id === g.currentTurn && g.dice !== null && legal.some((m) => m.pieceIndex === i);

        const token: Token = {
          key: seat + '-' + i,
          seat,
          pieceIndex: i,
          color,
          emoji: player.emoji,
          movable,
        };
        const key = coord[0] + ',' + coord[1];
        const list = map.get(key);
        if (list) list.push(token);
        else map.set(key, [token]);
      }
    }
    return map;
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
          this.translate.instant('gimmicks.games.ludoGame.playerLeft', { name }),
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

  protected tokensAt(cell: Cell): Token[] {
    return this.tokenMap().get(cell.row + ',' + cell.col) ?? [];
  }

  // ---- Aktionen ------------------------------------------------------------
  protected roll(): void {
    this.svc.roll();
  }

  protected onToken(token: Token): void {
    if (token.movable) this.svc.move(token.pieceIndex);
  }

  protected pass(): void {
    this.svc.pass();
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

  // ---- Brettmodell ---------------------------------------------------------
  private buildCells(): Cell[] {
    const kind: Cell['kind'][][] = Array.from({ length: 11 }, () =>
      Array.from({ length: 11 }, () => 'void' as Cell['kind']),
    );
    const seat: number[][] = Array.from({ length: 11 }, () => Array.from({ length: 11 }, () => -1));
    const start: boolean[][] = Array.from({ length: 11 }, () =>
      Array.from({ length: 11 }, () => false),
    );

    for (const [r, c] of TRACK) kind[r][c] = 'track';
    for (let s = 0; s < GOAL.length; s++) {
      for (const [r, c] of GOAL[s]) {
        kind[r][c] = 'goal';
        seat[r][c] = s;
      }
      for (const [r, c] of GARAGE[s]) {
        kind[r][c] = 'home';
        seat[r][c] = s;
      }
      const [sr, sc] = TRACK[SEAT_START[s]];
      seat[sr][sc] = s;
      start[sr][sc] = true;
    }
    kind[5][5] = 'center';

    const cells: Cell[] = [];
    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        cells.push({ row: r, col: c, kind: kind[r][c], seat: seat[r][c], start: start[r][c] });
      }
    }
    return cells;
  }

  /** Farbe eines Feldes nach Sitzplatz (für die CSS-Variable). */
  protected seatColor(seat: number): string | null {
    return seat >= 0 ? SEAT_COLORS[seat] ?? null : null;
  }
}
