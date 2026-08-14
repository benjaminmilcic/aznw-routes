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
import { CPU_ID, MillService } from '../game/mill.service';
import { DraggableDirective } from '../../shared/draggable.directive';
import { SpeakOnClickDirective } from '../../shared/speak-on-click.directive';
import { POINTS_COUNT, type MillPlayer } from '../game/game.types';

type Outcome = 'win' | 'lose';

const POINTS: [number, number][] = [
  [0, 0], [0, 3], [0, 6],
  [1, 1], [1, 3], [1, 5],
  [2, 2], [2, 3], [2, 4],
  [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6],
  [4, 2], [4, 3], [4, 4],
  [5, 1], [5, 3], [5, 5],
  [6, 0], [6, 3], [6, 6],
];

const SEAT_COLORS = ['#e11d48', '#1d4ed8'];

function pct(c: number): number {
  return 6 + (c * 88) / 6;
}

interface PointView {
  index: number;
  x: number;
  y: number;
  occupant: number;
  color: string | null;
  emoji: string;
  placeable: boolean;
  selectable: boolean;
  selected: boolean;
  target: boolean;
  removable: boolean;
}

@Component({
  selector: 'app-mill-board',
  imports: [TranslateModule, DraggableDirective, SpeakOnClickDirective],
  templateUrl: './mill-board.component.html',
  styleUrl: './mill-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MillBoardComponent implements OnDestroy {
  protected readonly svc = inject(MillService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);
  protected readonly game = this.svc.game;

  protected readonly selected = signal<number | null>(null);

  private effectsShown = false;

  protected displayName(p: MillPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.millGame.computer')
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

  private readonly targets = computed<Set<number>>(() => {
    const g = this.game();
    const sel = this.selected();
    if (!g || sel === null) return new Set();
    return new Set(this.svc.targetsFor(g, sel));
  });

  protected readonly points = computed<PointView[]>(() => {
    const g = this.game();
    const out: PointView[] = [];
    if (!g) return out;
    const mySeat = this.svc.mySeat();
    const myTurn = this.svc.isMyTurn();
    const removing = this.svc.removing();
    const place = this.svc.phase() === 'place';
    const sel = this.selected();
    const targets = this.targets();
    const removableSet = this.svc.removableSet();

    for (let i = 0; i < POINTS_COUNT; i++) {
      const occ = g.board[i];
      const seatId = occ >= 0 ? g.order[occ] : '';
      out.push({
        index: i,
        x: pct(POINTS[i][1]),
        y: pct(POINTS[i][0]),
        occupant: occ,
        color: occ >= 0 ? SEAT_COLORS[occ] ?? '#475569' : null,
        emoji: occ >= 0 ? g.players[seatId]?.emoji ?? '' : '',
        placeable: myTurn && !removing && place && occ === -1,
        selectable: myTurn && !removing && !place && occ === mySeat && this.svc.canSelect(i),
        selected: sel === i,
        target: sel !== null && occ === -1 && targets.has(i),
        removable: removing && removableSet.has(i),
      });
    }
    return out;
  });

  constructor() {
    effect(() => {
      if (!this.svc.isMyTurn() || this.svc.removing() || this.svc.phase() === 'place') {
        this.selected.set(null);
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
  }

  ngOnDestroy(): void {
    this.effects.stop();
  }

  protected onPoint(p: PointView): void {
    const g = this.game();
    if (!g) return;

    if (this.svc.removing()) {
      if (p.removable) this.svc.removePiece(p.index);
      return;
    }
    if (!this.svc.isMyTurn()) return;

    if (this.svc.phase() === 'place') {
      if (p.placeable) this.svc.place(p.index);
      return;
    }

    if (p.occupant === this.svc.mySeat()) {
      if (p.selectable) this.selected.set(this.selected() === p.index ? null : p.index);
      return;
    }
    const sel = this.selected();
    if (sel !== null && p.target) {
      this.svc.move(sel, p.index);
      this.selected.set(null);
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
