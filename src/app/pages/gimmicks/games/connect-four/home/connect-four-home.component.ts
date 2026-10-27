import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AVATARS, ConnectFourService } from '../game/connect-four.service';
import type { C4Level, C4Mode } from '../game/game.types';

/** Start screen: choose the game mode, set name/symbol, start the game. */
@Component({
  selector: 'app-connect-four-home',
  imports: [CommonModule, FormsModule, TranslateModule, IonSegment, IonSegmentButton, IonLabel],
  templateUrl: './connect-four-home.component.html',
  styleUrl: './connect-four-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectFourHomeComponent implements OnInit {
  protected readonly svc = inject(ConnectFourService);

  protected readonly avatars = AVATARS;

  protected readonly mode = signal<C4Mode>('computer');
  protected readonly level = signal<C4Level>('medium');
  protected readonly name = signal('');
  protected readonly emoji = signal(AVATARS[0]);
  protected readonly joinCode = signal('');
  /** Online: the start screen shows either "New game" or "Join". */
  protected readonly showJoin = signal(false);

  ngOnInit(): void {
    this.name.set(this.svc.savedName);
    const saved = this.svc.savedEmoji;
    if (saved && AVATARS.includes(saved)) this.emoji.set(saved);
  }

  protected onMode(value: C4Mode): void {
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

  /** Start a game against the computer. */
  protected start(): void {
    if (!this.nameValid()) return;
    this.svc.startComputerGame(this.name().trim(), this.emoji(), this.level());
  }

  protected async create(): Promise<void> {
    if (!this.nameValid() || this.svc.busy()) return;
    try {
      await this.svc.createGame(this.name().trim(), this.emoji());
    } catch {
      /* The error is shown via svc.error. */
    }
  }

  protected async join(): Promise<void> {
    if (!this.nameValid() || this.joinCode().length !== 4 || this.svc.busy()) return;
    try {
      await this.svc.joinGame(this.joinCode(), this.name().trim(), this.emoji());
    } catch {
      /* The error is shown via svc.error. */
    }
  }
}
