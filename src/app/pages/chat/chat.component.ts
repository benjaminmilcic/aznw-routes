import { BreakpointObserver } from '@angular/cdk/layout';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { TextFieldModule } from '@angular/cdk/text-field';
import { afterRenderEffect, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { ChatInfoDialogComponent } from './chat-info-dialog.component';
import { ChatMarkdownPipe } from './chat-markdown.pipe';
import { ChatService } from './chat.service';
import { CopyButtonComponent } from './copy-button.component';
import { VoiceInputError, VoiceInputService } from './voice-input.service';
import { VoiceWaveformComponent } from './voice-waveform.component';

/**
 * The AI chat page: questions about Benjamin and his website, answered by python-aznw-api via nest-aznw-api
 * (RAG and tool calling), streamed token by token.
 */
@Component({
  selector: 'app-chat',
  imports: [
    ClipboardModule,
    FormsModule,
    TextFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    ChatMarkdownPipe,
    CopyButtonComponent,
    VoiceWaveformComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  protected readonly chat = inject(ChatService);
  protected readonly voice = inject(VoiceInputService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  protected input = '';
  /** Phone width: the long placeholder would wrap there and make the textarea grow. */
  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 639.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  /** True for 2 s after the whole chat was copied – the toolbar button then shows a check mark. */
  protected readonly chatCopied = signal(false);
  protected readonly locating = signal(false);
  /** Translation keys of the example questions in the empty chat */
  protected readonly exampleQuestions = ['chat.examples.q1', 'chat.examples.q2', 'chat.examples.q3', 'chat.examples.q4'];

  private readonly scrollContainer = viewChild.required<ElementRef<HTMLElement>>('scrollContainer');

  constructor() {
    // Keep the newest tokens in view while the answer streams in.
    afterRenderEffect(() => {
      this.chat.messages();
      const el = this.scrollContainer().nativeElement;
      el.scrollTop = el.scrollHeight;
    });
  }

  protected openInfo(): void {
    this.dialog.open(ChatInfoDialogComponent, {
      width: '34rem',
      maxWidth: 'calc(100vw - 2rem)',
      panelClass: 'chat-info-panel',
      backdropClass: 'chat-info-backdrop',
    });
  }

  protected send(): void {
    const text = this.input;
    this.input = '';
    this.chat.send(text);
  }

  protected ask(questionKey: string): void {
    this.chat.send(this.translate.instant(questionKey));
  }

  /** Links to the website open with the router in the same tab – the chat stays as it is. */
  protected onMessageClick(event: MouseEvent): void {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-internal]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    this.router.navigateByUrl(link.dataset['internal']!);
  }

  protected async shareLocation(): Promise<void> {
    this.locating.set(true);
    try {
      await this.chat.shareLocation(`📍 ${this.translate.instant('chat.locationShared')}`);
    } catch {
      this.snackBar.open(this.translate.instant('chat.locationDenied'), 'OK', { duration: 5000 });
    } finally {
      this.locating.set(false);
    }
  }

  /** First click starts recording, second click stops it and appends the recognised text to the input. */
  protected async toggleRecording(): Promise<void> {
    try {
      if (this.voice.state() === 'idle') {
        await this.voice.start();
        return;
      }
      const text = await this.voice.stop();
      if (text) {
        this.input = this.input.trim() ? `${this.input.trimEnd()} ${text}` : text;
      }
    } catch (err) {
      const code = err instanceof VoiceInputError ? err.code : 'failed';
      this.snackBar.open(this.translate.instant(`chat.voiceErrors.${code}`), 'OK', { duration: 6000 });
    }
  }

  /** The whole chat as Markdown, for the copy button in the toolbar. */
  protected chatAsText(): string {
    const you = this.translate.instant('chat.you');
    const assistant = this.translate.instant('chat.assistant');
    return this.chat
      .messages()
      .map((m) => `**${m.role === 'user' ? you : assistant}:**\n\n${m.content}`)
      .join('\n\n---\n\n');
  }

  protected onChatCopied(): void {
    this.chatCopied.set(true);
    setTimeout(() => this.chatCopied.set(false), 2000);
  }

  /**
   * cdkTextareaAutosize changes the height after the browser scrolled to the caret, so once the maximum height is
   * reached the line being typed or pasted at the end can end up hidden. After the new height is set, scroll down to it.
   * (Typing in the middle doesn't change the height any more, there the browser keeps the caret in view itself.)
   */
  protected keepCaretVisible(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    requestAnimationFrame(() => {
      if (textarea.selectionEnd === textarea.value.length) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter inserts a line break.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
