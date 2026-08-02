import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { pips } from '../game/scoring';

/** Ausrichtung des Würfels, damit die gewünschte Augenzahl nach vorne zeigt. */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: -90 },
};

/**
 * Die fünf Würfel als echte 3D-Würfel (aus der bisherigen Yahtzee-Variante
 * übernommen). Die Rollanimation entsteht dadurch, dass zur Zielausrichtung
 * volle Umdrehungen addiert werden – dadurch dreht sich der Würfel sichtbar
 * und landet trotzdem exakt auf der richtigen Seite.
 */
@Component({
  selector: 'app-yahtzee-dice',
  templateUrl: './yahtzee-dice.component.html',
  styleUrl: './yahtzee-dice.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YahtzeeDiceComponent {
  readonly values = input.required<number[]>();
  readonly held = input.required<boolean[]>();
  /** Zählt jeden Wurf hoch – ändert sich der Wert, rollen die Würfel. */
  readonly rollCount = input<number>(0);
  /** Dürfen Würfel gerade festgehalten werden? */
  readonly clickable = input<boolean>(false);

  readonly toggle = output<number>();

  /** Volle Umdrehungen je Würfel – nur die geworfenen zählen hoch. */
  private readonly spins = signal<number[]>([0, 0, 0, 0, 0]);

  constructor() {
    effect(() => {
      this.rollCount(); // einzige Abhängigkeit: nur ein echter Wurf dreht die Würfel
      // `held` bewusst ungetrackt lesen – sonst würde schon das Festhalten
      // eines Würfels die Animation der übrigen auslösen.
      const held = untracked(() => this.held());
      this.spins.update((current) => current.map((s, i) => (held[i] ? s : s + 1)));
    });
  }

  protected faces = [1, 2, 3, 4, 5, 6];

  protected pipsFor(value: number): boolean[] {
    return pips(value);
  }

  /**
   * Zielausrichtung plus volle Umdrehungen. Beide Winkel müssen Vielfache von
   * 360° sein – sonst landet der Würfel verdreht auf der falschen Seite.
   */
  protected transformFor(index: number): string {
    const value = this.values()[index] ?? 1;
    const face = FACE_ROTATION[value] ?? FACE_ROTATION[1];
    const spin = this.spins()[index] ?? 0;
    return `rotateX(${face.x + spin * 720}deg) rotateY(${face.y + spin * 1080}deg)`;
  }

  protected onClick(index: number): void {
    if (this.clickable()) this.toggle.emit(index);
  }
}
