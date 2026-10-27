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

/** Orientation of the die so that the desired pip count faces forward. */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: -90 },
};

/**
 * The five dice as real 3D dice (taken over from the previous Yahtzee variant).
 * The rolling animation comes from adding full rotations to the target
 * orientation – that way the die visibly spins
 * and still lands exactly on the right side.
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
  /** Counts up with every roll – when the value changes, the dice roll. */
  readonly rollCount = input<number>(0);
  /** May dice be held right now? */
  readonly clickable = input<boolean>(false);

  readonly toggle = output<number>();

  /** Full rotations per die – only the rolled ones count up. */
  private readonly spins = signal<number[]>([0, 0, 0, 0, 0]);

  constructor() {
    effect(() => {
      this.rollCount(); // only dependency: only a real roll spins the dice
      // read `held` deliberately untracked – otherwise holding a single
      // die would already trigger the animation of the others.
      const held = untracked(() => this.held());
      this.spins.update((current) => current.map((s, i) => (held[i] ? s : s + 1)));
    });
  }

  protected faces = [1, 2, 3, 4, 5, 6];

  protected pipsFor(value: number): boolean[] {
    return pips(value);
  }

  /**
   * Target orientation plus full rotations. Both angles must be multiples of
   * 360° – otherwise the die lands twisted on the wrong side.
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
