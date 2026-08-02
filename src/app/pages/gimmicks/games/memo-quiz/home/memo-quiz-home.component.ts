import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { CARD_MOTIFS } from '../data/card-motifs';
import { MemoQuizService } from '../game/memo-quiz.service';
import { MotifComponent } from '../motif/motif.component';
import type { MemoLevel, MemoMode } from '../game/memo.types';

interface PairOption {
  pairs: number;
  labelKey: string;
}

/** Startbildschirm: Spielart, Name, Tier, Kartenzahl und Spielstärke wählen. */
@Component({
  selector: 'app-memo-quiz-home',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MotifComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  templateUrl: './memo-quiz-home.component.html',
  styleUrl: './memo-quiz-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoQuizHomeComponent implements OnInit {
  protected readonly svc = inject(MemoQuizService);
  protected readonly motifs = CARD_MOTIFS;

  protected readonly pairOptions: PairOption[] = [
    { pairs: 6, labelKey: 'gimmicks.games.memoQuizGame.cards12' },
    { pairs: 10, labelKey: 'gimmicks.games.memoQuizGame.cards20' },
    { pairs: 12, labelKey: 'gimmicks.games.memoQuizGame.cards24' },
  ];

  protected readonly mode = signal<MemoMode>('computer');
  protected readonly level = signal<MemoLevel>('medium');
  protected readonly pairs = signal(6);
  protected readonly name = signal('');
  protected readonly avatar = signal(CARD_MOTIFS[0].id);
  protected readonly joinCode = signal('');
  /** Online: Startbildschirm zeigt entweder "Neues Spiel" oder "Beitreten". */
  protected readonly showJoin = signal(false);

  ngOnInit(): void {
    this.name.set(this.svc.savedName);
    this.avatar.set(this.svc.savedAvatar);
  }

  protected onMode(value: MemoMode): void {
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
    this.svc.startComputerGame(this.name().trim(), this.avatar(), this.pairs(), this.level());
  }

  protected async create(): Promise<void> {
    if (!this.nameValid() || this.svc.busy()) return;
    try {
      await this.svc.createGame(this.name().trim(), this.avatar(), this.pairs());
    } catch {
      /* Fehler wird über svc.error angezeigt. */
    }
  }

  protected async join(): Promise<void> {
    if (!this.nameValid() || this.joinCode().length !== 4 || this.svc.busy()) return;
    try {
      await this.svc.joinGame(this.joinCode(), this.name().trim(), this.avatar());
    } catch {
      /* Fehler wird über svc.error angezeigt. */
    }
  }
}
