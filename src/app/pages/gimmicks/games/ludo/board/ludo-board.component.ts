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

/** The 40 squares of the shared track as [row, column] in the 11×11 grid. */
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

/** Four goal squares per seat (leading to the center). */
const GOAL: [number, number][][] = [
  [[5, 1], [5, 2], [5, 3], [5, 4]], // Seat 0 – left
  [[1, 5], [2, 5], [3, 5], [4, 5]], // Seat 1 – top
  [[5, 9], [5, 8], [5, 7], [5, 6]], // Seat 2 – right
  [[9, 5], [8, 5], [7, 5], [6, 5]], // Seat 3 – bottom
];

/** Four garage spots per seat (the corners of the board). */
const GARAGE: [number, number][][] = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], // Seat 0 – top left
  [[0, 9], [0, 10], [1, 9], [1, 10]], // Seat 1 – top right
  [[9, 9], [10, 9], [9, 10], [10, 10]], // Seat 2 – bottom right
  [[9, 0], [10, 0], [9, 1], [10, 1]], // Seat 3 – bottom left
];

/** Color per seat: red, orange, blue, violet. */
const SEAT_COLORS = ['#dc2626', '#f59e0b', '#2563eb', '#9333ea'];

interface Cell {
  row: number;
  col: number;
  /** 'track' | 'goal' | 'home' | 'center' | 'void' */
  kind: 'track' | 'goal' | 'home' | 'center' | 'void';
  /** Seat whose color the square carries (start/goal/garage), otherwise -1. */
  seat: number;
  /** true for a start square on the track. */
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
 * The running game: 11×11 board, dice and the overlays for the
 * online lobby and the end of the game.
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

  /** Static 11×11 board model (square types). */
  protected readonly cells: Cell[] = this.buildCells();

  private effectsShown = false;
  /** Timestamp of the last reported exit – prevents old notices. */
  private lastLeftSeen: number | null = null;

  /**
   * Display name: ONLY computer opponents are translated, so that a
   * language change also applies in a running game.
   */
  protected displayName(p: LudoPlayer | null | undefined): string {
    if (!p) return '';
    if (!p.cpu) return p.name;
    const nr = p.id.startsWith('cpu_') ? p.id.slice(4) : '';
    return `${this.translate.instant('gimmicks.games.ludoGame.computer')} ${nr}`.trim();
  }

  /** Name of the player whose turn it is. */
  protected currentName(): string {
    return this.displayName(this.svc.currentPlayer());
  }

  protected winnerName(): string {
    const g = this.game();
    if (!g?.winnerId) return '';
    return this.displayName(g.players[g.winnerId]);
  }

  /** Color of a player – depends on their seat. */
  protected colorOf(id: string): string {
    const g = this.game();
    if (!g) return SEAT_COLORS[0];
    return SEAT_COLORS[this.svc.seatOf(g, id)] ?? '#475569';
  }

  /** Result from the point of view of the player on THIS device. */
  protected readonly outcome = computed<Outcome | null>(() => {
    const g = this.game();
    if (!g || g.status !== 'finished') return null;
    // On the device, someone sitting here always wins – except the computer.
    if (this.svc.mode() === 'local') return g.players[g.winnerId ?? '']?.cpu ? 'lose' : 'win';
    return g.winnerId === this.svc.playerId ? 'win' : 'lose';
  });

  /**
   * Have I already finished while the others are still playing? Then my
   * place is shown below instead of the prompt to roll.
   */
  protected readonly myRank = computed<number>(() => {
    const g = this.game();
    if (!g || g.status !== 'playing') return 0;
    return this.svc.rankOf(this.svc.playerId);
  });

  /** Map "row,col" → pieces on this square. */
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
          this.translate.instant('gimmicks.games.ludoGame.playerLeft', { name }),
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

  protected tokensAt(cell: Cell): Token[] {
    return this.tokenMap().get(cell.row + ',' + cell.col) ?? [];
  }

  // ---- Actions -------------------------------------------------------------
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

  // ---- Board model ---------------------------------------------------------
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

  /** Color of a square by seat (for the CSS variable). */
  protected seatColor(seat: number): string | null {
    return seat >= 0 ? SEAT_COLORS[seat] ?? null : null;
  }
}
