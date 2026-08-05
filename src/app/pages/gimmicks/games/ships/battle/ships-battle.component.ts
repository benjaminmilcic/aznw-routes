import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ShipsBoardComponent } from '../board/ships-board.component';
import { buildGrid, countSunk, sunkCells } from '../game/board.utils';
import { ShipsService } from '../game/ships.service';
import {
  CPU_ID,
  type CellView,
  type PlacedShip,
  type ShipsPlayer,
  type ShotResult,
} from '../game/ships.types';

/** Kampf-Phase: links das gegnerische Meer (dort wird geschossen), rechts das eigene. */
@Component({
  selector: 'app-ships-battle',
  imports: [ShipsBoardComponent, TranslateModule],
  templateUrl: './ships-battle.component.html',
  styleUrl: './ships-battle.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsBattleComponent {
  protected readonly svc = inject(ShipsService);
  private readonly translate = inject(TranslateService);

  private readonly myFleet = computed<PlacedShip[]>(() => {
    const g = this.svc.game();
    return g?.fleets[this.svc.playerId] ?? [];
  });

  private readonly enemyFleet = computed<PlacedShip[]>(() => {
    const g = this.svc.game();
    const id = this.svc.opponentId();
    return g && id ? g.fleets[id] ?? [] : [];
  });

  private readonly myShots = computed<Record<string, ShotResult>>(
    () => this.svc.game()?.shots[this.svc.playerId] ?? {},
  );

  private readonly enemyShots = computed<Record<string, ShotResult>>(() => {
    const g = this.svc.game();
    const id = this.svc.opponentId();
    return g && id ? g.shots[id] ?? {} : {};
  });

  protected readonly totalShips = computed(
    () => this.enemyFleet().length || this.myFleet().length,
  );
  protected readonly enemySunk = computed(() => countSunk(this.enemyFleet(), this.myShots()));
  protected readonly myAlive = computed(
    () => this.myFleet().length - countSunk(this.myFleet(), this.enemyShots()),
  );

  /** Gegnerisches Meer: Nur die eigenen Treffer/Fehlschüsse sind sichtbar. */
  protected readonly enemyRows = computed<CellView[][]>(() => {
    const shots = this.myShots();
    const sunk = sunkCells(this.enemyFleet(), shots);
    return buildGrid((key) => {
      const r = shots[key];
      if (r === 'hit') return sunk.has(key) ? 'sunk' : 'hit';
      if (r === 'miss') return 'miss';
      return 'water';
    });
  });

  /** Eigenes Meer: die eigenen Schiffe plus die Schüsse des Gegners. */
  protected readonly myRows = computed<CellView[][]>(() => {
    const shots = this.enemyShots();
    const fleet = this.myFleet();
    const shipCells = new Set(fleet.flatMap((s) => s.cells));
    const sunk = sunkCells(fleet, shots);
    return buildGrid((key) => {
      const r = shots[key];
      if (r === 'hit') return sunk.has(key) ? 'sunk' : 'hit';
      if (r === 'miss') return 'miss';
      return shipCells.has(key) ? 'ship' : 'water';
    });
  });

  /**
   * Anzeigename: selbst eingegebene Namen bleiben unverändert, nur der
   * Computer wird übersetzt (damit ein Sprachwechsel im Spiel greift).
   */
  protected displayName(p: ShipsPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.shipsGame.computer')
      : p.name;
  }

  protected shoot(c: { x: number; y: number }): void {
    this.svc.shoot(c.x, c.y);
  }

  protected leave(): void {
    this.svc.askLeave();
  }
}
