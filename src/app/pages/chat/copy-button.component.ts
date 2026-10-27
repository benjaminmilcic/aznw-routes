import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

/** Small button that copies `text` to the clipboard and briefly shows a check mark, like in ChatGPT. */
@Component({
  selector: 'app-copy-button',
  imports: [MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <button
      type="button"
      class="copy-button"
      [attr.aria-label]="label() | translate"
      [matTooltip]="(copied() ? 'chat.copied' : label()) | translate"
      (click)="copy()"
    >
      <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
    </button>
  `,
})
export class CopyButtonComponent {
  readonly text = input.required<string>();
  /** Translation key of the tooltip */
  readonly label = input('chat.copy');

  private readonly clipboard = inject(Clipboard);
  protected readonly copied = signal(false);
  private resetTimer?: ReturnType<typeof setTimeout>;

  protected copy(): void {
    if (!this.clipboard.copy(this.text())) return;
    this.copied.set(true);
    clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => this.copied.set(false), 2000);
  }
}
