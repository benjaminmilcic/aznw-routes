import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AVATARS, ShipsService } from '../game/ships.service';
import type { ShipsLevel, ShipsMode } from '../game/ships.types';

/** Startbildschirm: Spielart wählen, Name/Tier festlegen, Spiel starten. */
@Component({
  selector: 'app-ships-home',
  imports: [CommonModule, FormsModule, TranslateModule, IonSegment, IonSegmentButton, IonLabel],
  templateUrl: './ships-home.component.html',
  styleUrl: './ships-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShipsHomeComponent implements OnInit {
  protected readonly svc = inject(ShipsService);

  protected readonly avatars = AVATARS;

  protected readonly mode = signal<ShipsMode>('computer');
  protected readonly level = signal<ShipsLevel>('medium');
  protected readonly name = signal('');
  protected readonly emoji = signal(AVATARS[0]);
  protected readonly joinCode = signal('');
  /** Online: Startbildschirm zeigt entweder "Neues Spiel" oder "Beitreten". */
  protected readonly showJoin = signal(false);

  ngOnInit(): void {
    this.name.set(this.svc.savedName);
    const saved = this.svc.savedEmoji;
    if (saved && AVATARS.includes(saved)) this.emoji.set(saved);
  }

  protected onMode(value: ShipsMode): void {
    this.mode.set(value);
    this.showJoin.set(false);
    this.svc.error.set(null);
  }

  protected onCode(value: string): void {
    this.joinCode.set(value.replace(/\D/g, '').slice(0, 4));
  }

  protected nameValid(): boolean {
    return this.name().trim().length >= 1;
  }

  /** Spiel gegen den Computer starten. */
  protected start(): void {
    if (!this.nameValid()) return;
    this.svc.startComputerGame(this.name().trim(), this.emoji(), this.level());
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
