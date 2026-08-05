import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GameEffectsService } from '../../shared/effects/game-effects.service';
import { ShipsService } from '../game/ships.service';
import { CPU_ID, type ShipsPlayer } from '../game/ships.types';

/** Ergebnis-Dialog mit Feuerwerk beim Sieg und sinkendem Schiff beim Verlieren. */
@Component({
  selector: 'app-ships-result',
  imports: [TranslateModule],
  templateUrl: './ships-result.component.html',
  styleUrl: './ships-result.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsResultComponent implements OnInit, OnDestroy {
  protected readonly svc = inject(ShipsService);
  private readonly effects = inject(GameEffectsService);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    if (this.svc.amWinner()) this.effects.celebrate();
    else this.effects.commiserate();
  }

  ngOnDestroy(): void {
    // Feuerwerk/Töne stoppen, wenn der Dialog verschwindet.
    this.effects.stop();
  }

  protected displayName(p: ShipsPlayer | null | undefined): string {
    if (!p) return '';
    return p.id === CPU_ID
      ? this.translate.instant('gimmicks.games.shipsGame.computer')
      : p.name;
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
