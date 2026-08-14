import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AVATARS, SchachService } from '../game/schach.service';
import type { ChessLevel, ChessMode } from '../game/game.types';

@Component({
  selector: 'app-schach-home',
  imports: [CommonModule, FormsModule, TranslateModule, IonSegment, IonSegmentButton, IonLabel],
  templateUrl: './schach-home.component.html',
  styleUrl: './schach-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchachHomeComponent implements OnInit {
  protected readonly svc = inject(SchachService);

  protected readonly avatars = AVATARS;

  protected readonly mode = signal<ChessMode>('computer');
  protected readonly level = signal<ChessLevel>('medium');
  protected readonly name = signal('');
  protected readonly emoji = signal(AVATARS[0]);
  protected readonly joinCode = signal('');
  protected readonly showJoin = signal(false);

  ngOnInit(): void {
    this.name.set(this.svc.savedName);
    const saved = this.svc.savedEmoji;
    if (saved && AVATARS.includes(saved)) this.emoji.set(saved);
  }

  protected onMode(value: ChessMode): void {
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
