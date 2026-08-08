import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AVATARS, CPU_EMOJI, LudoService } from '../game/ludo.service';
import { MAX_PLAYERS, type LudoLevel, type LudoMode } from '../game/ludo.types';

interface Seat {
  name: string;
  emoji: string;
  cpu: boolean;
}

/** Startbildschirm: Spielart wählen, Mitspieler zusammenstellen oder Code eingeben. */
@Component({
  selector: 'app-ludo-home',
  imports: [CommonModule, FormsModule, TranslateModule, IonSegment, IonSegmentButton, IonLabel],
  templateUrl: './ludo-home.component.html',
  styleUrl: './ludo-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LudoHomeComponent implements OnInit {
  protected readonly svc = inject(LudoService);
  private readonly translate = inject(TranslateService);

  protected readonly avatars = AVATARS;
  protected readonly maxPlayers = MAX_PLAYERS;

  protected readonly mode = signal<LudoMode>('local');
  protected readonly level = signal<LudoLevel>('medium');
  /** Mitspieler am Gerät – Menschen wie Computer, in Zugreihenfolge. */
  protected readonly seats = signal<Seat[]>([]);
  /** Online: eigener Name und eigenes Zeichen. */
  protected readonly name = signal('');
  protected readonly emoji = signal(AVATARS[0]);
  protected readonly joinCode = signal('');
  protected readonly showJoin = signal(false);

  ngOnInit(): void {
    const saved = this.svc.savedName;
    const savedEmoji = this.svc.savedEmoji;
    this.name.set(saved);
    if (savedEmoji && AVATARS.includes(savedEmoji)) this.emoji.set(savedEmoji);
    // Voreinstellung am Gerät: du gegen einen Computer.
    this.seats.set([
      { name: saved, emoji: this.emoji(), cpu: false },
      { name: this.cpuName(1), emoji: CPU_EMOJI, cpu: true },
    ]);
    this.svc.error.set(null);
  }

  private cpuName(index: number): string {
    return `${this.translate.instant('gimmicks.games.ludoGame.computer')} ${index}`;
  }

  protected onMode(value: LudoMode): void {
    this.mode.set(value);
    this.showJoin.set(false);
    this.svc.error.set(null);
  }

  protected onCode(value: string): void {
    this.joinCode.set(value.replace(/\D/g, '').slice(0, 4));
  }

  // ---- Mitspieler am Gerät -------------------------------------------------
  protected addHuman(): void {
    if (this.seats().length >= this.maxPlayers) return;
    this.seats.update((s) => [...s, { name: '', emoji: this.freeEmoji(s), cpu: false }]);
  }

  protected addComputer(): void {
    if (this.seats().length >= this.maxPlayers) return;
    this.seats.update((s) => {
      const count = s.filter((x) => x.cpu).length + 1;
      return [...s, { name: this.cpuName(count), emoji: CPU_EMOJI, cpu: true }];
    });
  }

  protected removeSeat(index: number): void {
    this.seats.update((s) => s.filter((_, i) => i !== index));
  }

  protected setSeatName(index: number, value: string): void {
    this.seats.update((s) => s.map((seat, i) => (i === index ? { ...seat, name: value } : seat)));
  }

  /** Klick auf das Zeichen schaltet zum nächsten freien Tier weiter. */
  protected cycleEmoji(index: number): void {
    this.seats.update((s) => {
      const taken = s.filter((_, i) => i !== index).map((x) => x.emoji);
      const start = AVATARS.indexOf(s[index].emoji);
      for (let step = 1; step <= AVATARS.length; step++) {
        const next = AVATARS[(start + step) % AVATARS.length];
        if (!taken.includes(next)) {
          return s.map((seat, i) => (i === index ? { ...seat, emoji: next } : seat));
        }
      }
      return s;
    });
  }

  private freeEmoji(seats: Seat[]): string {
    const taken = seats.map((s) => s.emoji);
    return AVATARS.find((a) => !taken.includes(a)) ?? AVATARS[0];
  }

  /** Mindestens zwei Mitspieler und mindestens ein Mensch. */
  protected canStartLocal(): boolean {
    const s = this.seats();
    return s.length >= 2 && s.some((x) => !x.cpu);
  }

  /** Die Spielstärke ist nur interessant, wenn ein Computer mitspielt. */
  protected hasComputer(): boolean {
    return this.seats().some((s) => s.cpu);
  }

  protected startLocal(): void {
    if (!this.canStartLocal()) return;
    const seats = this.seats().map((s, i) => ({
      ...s,
      name:
        s.name.trim() ||
        this.translate.instant('gimmicks.games.ludoGame.playerNr', { nr: i + 1 }),
    }));
    this.svc.startLocalGame(seats, this.level());
  }

  // ---- Online --------------------------------------------------------------
  protected nameValid(): boolean {
    return this.name().trim().length >= 1;
  }

  protected async create(): Promise<void> {
    if (!this.nameValid() || this.svc.busy()) return;
    try {
      await this.svc.createGame(this.name().trim(), this.emoji());
    } catch {
      /* Fehler wird über svc.error angezeigt. */
    }
  }

  protected async join(): Promise<void> {
    if (!this.nameValid() || this.joinCode().length !== 4 || this.svc.busy()) return;
    try {
      await this.svc.joinGame(this.joinCode(), this.name().trim(), this.emoji());
    } catch {
      /* Fehler wird über svc.error angezeigt. */
    }
  }
}
