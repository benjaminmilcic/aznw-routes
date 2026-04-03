import { Component, input, output, signal, effect, ElementRef, viewChild, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { TelegramService } from '../../services/telegram.service';
import { TelegramWebSocketService } from '../../services/telegram-websocket.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Dialog, Message } from '../../models/telegram-interfaces';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    TextFieldModule,
    MessageBubbleComponent,
    TranslateModule,
  ],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss',
})
export class ChatViewComponent implements OnInit, OnDestroy {
  readonly chat = input<Dialog | null>(null);
  readonly back = output<void>();

  readonly messages = signal<Message[]>([]);
  readonly readOutboxMaxId = signal(0);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly mediaToken = signal('');
  readonly loadingOlder = signal(false);
  readonly hasMore = signal(true);

  readonly messagesContainer = viewChild<ElementRef>('messagesContainer');

  messageText = '';
  avatarFailed = false;
  private mediaBaseUrl = `${environment.telegram.apiUrl}/media`;
  private stickToBottom = false;
  private oldestMessageId: number | null = null;
  private mediaTokenRefreshHandle: ReturnType<typeof setInterval> | null = null;

  private readonly avatarColors = [
    'linear-gradient(135deg, #ff516a, #ff885e)',
    'linear-gradient(135deg, #ffa85c, #ffcd6b)',
    'linear-gradient(135deg, #a695e7, #7b8fe6)',
    'linear-gradient(135deg, #6ec9cb, #65d4a4)',
    'linear-gradient(135deg, #65aadd, #6bc0eb)',
    'linear-gradient(135deg, #ee7aae, #e5679b)',
    'linear-gradient(135deg, #7bc862, #a0d872)',
  ];

  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramWsService: TelegramWebSocketService,
    private readonly translate: TranslateService,
  ) {
    // React to chat changes
    effect(() => {
      const currentChat = this.chat();
      this.avatarFailed = false;
      if (currentChat) {
        this.hasMore.set(true);
        this.oldestMessageId = null;
        this.loadMessages(currentChat.id);
      } else {
        this.messages.set([]);
        this.hasMore.set(false);
        this.oldestMessageId = null;
      }
    });

    // React to new WebSocket messages
    effect(() => {
      const newMsg = this.telegramWsService.lastMessage();
      if (newMsg && this.chat() && newMsg.chatId === this.chat()!.id) {
        this.messages.update((msgs) => {
          if (msgs.some((m) => m.id === newMsg.id)) return msgs;
          return [...msgs, newMsg];
        });
        setTimeout(() => this.scrollToBottom(), 50);
        if (!newMsg.out) {
          this.telegramService.markAsRead(this.chat()!.id).catch(() => {});
        }
      }
    });

    // React to read history updates (other person read your messages)
    effect(() => {
      const readEvent = this.telegramWsService.lastReadEvent();
      if (readEvent && this.chat() && readEvent.chatId === this.chat()!.id) {
        this.readOutboxMaxId.set(readEvent.maxId);
      }
    });
  }

  ngOnInit(): void {
    this.refreshMediaToken();
    this.mediaTokenRefreshHandle = setInterval(() => {
      this.refreshMediaToken();
    }, 50 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.mediaTokenRefreshHandle) {
      clearInterval(this.mediaTokenRefreshHandle);
      this.mediaTokenRefreshHandle = null;
    }
  }

  private async refreshMediaToken(): Promise<void> {
    try {
      const token = await this.telegramService.getMediaToken();
      this.mediaToken.set(token);
    } catch {
      // ignore token refresh errors; media loads will fail gracefully
    }
  }

  async loadMessages(chatId: string): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.telegramService.getMessages(chatId, 50);
      const ordered = result.messages.reverse();
      this.messages.set(ordered);
      this.oldestMessageId = ordered[0]?.id ?? null;
      this.hasMore.set(result.messages.length === 50);
      this.readOutboxMaxId.set(result.readOutboxMaxId);
      setTimeout(() => this.scrollToBottom(), 100);
      this.telegramService.markAsRead(chatId).catch(() => {});
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      this.loading.set(false);
    }
  }


  async sendMessage(): Promise<void> {
    const chat = this.chat();
    const text = this.messageText.trim();
    if (!chat || !text) return;

    this.sending.set(true);
    this.messageText = '';
    try {
      const sent = await this.telegramService.sendMessage(chat.id, text);
      const fullMsg: Message = { ...sent, senderName: this.translate.instant('gimmicks.telegram.chatView.you'), senderId: null, media: null };
      this.messages.update((msgs) => [...msgs, fullMsg]);
      this.telegramWsService.lastMessage.set({ ...fullMsg, chatId: chat.id });
      setTimeout(() => this.scrollToBottom(), 50);
    } catch (err) {
      console.error('Failed to send message', err);
      this.messageText = text;
    } finally {
      this.sending.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const chat = this.chat();
    if (!file || !chat) return;

    this.sending.set(true);
    try {
      const sent = await this.telegramService.sendFile(chat.id, file);
      let mediaType: 'photo' | 'video' | 'audio' | 'document' = 'document';
      if (file.type.startsWith('image/')) mediaType = 'photo';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      const fullMsg: Message = {
        ...sent,
        senderName: this.translate.instant('gimmicks.telegram.chatView.you'),
        senderId: null,
        media: { type: mediaType, hasMedia: true, fileName: file.name, mimeType: file.type, size: file.size.toString() },
      };
      this.messages.update((msgs) => [...msgs, fullMsg]);
      this.telegramWsService.lastMessage.set({ ...fullMsg, chatId: chat.id });
      setTimeout(() => this.scrollToBottom(), 50);
    } catch (err) {
      console.error('Failed to send file', err);
    } finally {
      this.sending.set(false);
      input.value = '';
    }
  }

  async loadOlderMessages(): Promise<void> {
    const chat = this.chat();
    if (!chat || this.loadingOlder() || !this.hasMore()) return;
    if (!this.oldestMessageId) return;

    this.loadingOlder.set(true);
    const container = this.messagesContainer();
    const prevScrollHeight = container?.nativeElement.scrollHeight ?? 0;

    try {
      const result = await this.telegramService.getMessages(chat.id, 50, this.oldestMessageId);
      const older = result.messages.reverse();
      if (older.length === 0) {
        this.hasMore.set(false);
        return;
      }
      const existingIds = new Set(this.messages().map((m) => m.id));
      const deduped = older.filter((m) => !existingIds.has(m.id));
      if (deduped.length === 0) {
        this.hasMore.set(false);
        return;
      }
      if (older.length < 50) {
        this.hasMore.set(false);
      }
      this.messages.update((msgs) => [...deduped, ...msgs]);
      this.oldestMessageId = this.messages()[0]?.id ?? this.oldestMessageId;

      setTimeout(() => {
        const containerNow = this.messagesContainer();
        if (containerNow) {
          const newScrollHeight = containerNow.nativeElement.scrollHeight;
          containerNow.nativeElement.scrollTop += newScrollHeight - prevScrollHeight;
        }
      }, 0);
    } catch (err) {
      console.error('Failed to load older messages', err);
    } finally {
      this.loadingOlder.set(false);
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;

    if (el.scrollTop < 50) {
      this.loadOlderMessages();
    }
  }

  onMediaLoaded(): void {
    if (this.stickToBottom) {
      this.scrollToBottom();
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (event.key === 'Enter' && !event.shiftKey && !isMobile) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getMediaBaseUrl(): string {
    return this.mediaBaseUrl;
  }


  getInitials(title: string): string {
    return title
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getAvatarColor(dialogId: string): string {
    let hash = 0;
    for (let i = 0; i < dialogId.length; i++) {
      hash = Math.imul(31, hash) + dialogId.charCodeAt(i);
    }
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }

  shouldShowDateSeparator(index: number): boolean {
    const msgs = this.messages();
    const current = msgs[index];
    if (!current.date) return false;
    if (index === 0) return true;

    const prev = msgs[index - 1];
    if (!prev.date) return true;

    const currentDay = new Date(current.date * 1000).toDateString();
    const prevDay = new Date(prev.date * 1000).toDateString();
    return currentDay !== prevDay;
  }

  getDateLabel(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateDay.getTime() === today.getTime()) return this.translate.instant('gimmicks.telegram.chatView.today');
    if (dateDay.getTime() === yesterday.getTime()) return this.translate.instant('gimmicks.telegram.chatView.yesterday');

    const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / 86400000);
    if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'long' });
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
    }

    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer();
    if (container) {
      container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      this.stickToBottom = true;
    }
  }
}
