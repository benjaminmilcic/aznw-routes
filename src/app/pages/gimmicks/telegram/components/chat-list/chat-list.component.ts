import { Component, signal, computed, output, effect, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TelegramService } from '../../services/telegram.service';
import { TelegramWebSocketService } from '../../services/telegram-websocket.service';
import { Dialog } from '../../models/telegram-interfaces';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatConfirmDialog } from '../chat-confirm-dialog/chat-confirm-dialog.component';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    FormsModule,
    MatListModule,
    MatInputModule,
    MatIconModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    TranslateModule,
  ],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.scss',
})
export class ChatListComponent implements OnInit {
  readonly chatSelected = output<Dialog>();
  readonly chatDeleted = output<string>();

  readonly dialogs = signal<Dialog[]>([]);
  readonly loading = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly filteredDialogs = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const dialogs = this.dialogs();
    if (!query) return dialogs;
    return dialogs.filter((d) => d.title.toLowerCase().includes(query));
  });

  readonly avatarFailed = new Set<string>();
  readonly contextMenuTrigger = viewChild(MatMenuTrigger);
  private readonly loadingDialogIds = new Set<string>();
  private static readonly CLEARED_CHATS_KEY = 'clearedChatIds';

  contextMenuX = 0;
  contextMenuY = 0;
  contextDialog: Dialog | null = null;

  // Telegram-style avatar colors
  private readonly avatarColors = [
    'linear-gradient(135deg, #ff516a, #ff885e)', // red-orange
    'linear-gradient(135deg, #ffa85c, #ffcd6b)', // orange-yellow
    'linear-gradient(135deg, #a695e7, #7b8fe6)', // purple-blue
    'linear-gradient(135deg, #6ec9cb, #65d4a4)', // teal-green
    'linear-gradient(135deg, #65aadd, #6bc0eb)', // blue
    'linear-gradient(135deg, #ee7aae, #e5679b)', // pink
    'linear-gradient(135deg, #7bc862, #a0d872)', // green
  ];

  constructor(
    private readonly telegramService: TelegramService,
    private readonly telegramWsService: TelegramWebSocketService,
    private dialog: MatDialog,
    private readonly translate: TranslateService,
  ) {
    effect(() => {
      const newMsg = this.telegramWsService.lastMessage();
      if (!newMsg) return;

      this.dialogs.update((dialogs) => {
        const idx = dialogs.findIndex((d) => d.id === newMsg.chatId);
        if (idx === -1) {
          this.loadNewDialog(newMsg.chatId);
          return dialogs;
        }

        // Deduplizierung: gleiche Message-ID ignorieren
        if (dialogs[idx].lastMessageId === newMsg.id) return dialogs;

        const updated = [...dialogs];
        updated[idx] = {
          ...updated[idx],
          lastMessage: newMsg.text || (newMsg.media ? this.translate.instant('gimmicks.telegram.chatList.mediaContent') : ''),
          lastMessageDate: newMsg.date,
          lastMessageOut: newMsg.out ?? false,
          lastMessageId: newMsg.id,
          unreadCount:
            newMsg.out || newMsg.chatId === this.selectedId()
              ? updated[idx].unreadCount
              : updated[idx].unreadCount + 1,
        };

        // Nach oben sortieren
        const [dialog] = updated.splice(idx, 1);
        updated.unshift(dialog);
        return updated;
      });
    });

    // React to read history updates (other person read your messages)
    effect(() => {
      const readEvent = this.telegramWsService.lastReadEvent();
      if (!readEvent) return;

      this.dialogs.update((dialogs) => {
        const idx = dialogs.findIndex((d) => d.id === readEvent.chatId);
        if (idx === -1) return dialogs;
        if (dialogs[idx].readOutboxMaxId >= readEvent.maxId) return dialogs;
        const updated = [...dialogs];
        updated[idx] = { ...updated[idx], readOutboxMaxId: readEvent.maxId };
        return updated;
      });
    });
  }

  ngOnInit(): void {
    this.loadDialogs();
  }

  async loadDialogs(): Promise<void> {
    this.loading.set(true);
    try {
      const dialogs = await this.telegramService.getDialogs(50);

      // Re-fetch dialogs whose history was cleared (Telegram excludes empty dialogs)
      const clearedIds: string[] = JSON.parse(
        localStorage.getItem(ChatListComponent.CLEARED_CHATS_KEY) || '[]',
      );
      const loadedIds = new Set(dialogs.map((d) => d.id));
      const missingIds = clearedIds.filter((id) => !loadedIds.has(id));

      const restored = await Promise.all(
        missingIds.map((id) =>
          this.telegramService.getDialog(id).catch(() => null),
        ),
      );
      const validIds: string[] = [];
      for (const d of restored) {
        if (d) {
          dialogs.push(d);
          validIds.push(d.id);
        }
      }
      localStorage.setItem(
        ChatListComponent.CLEARED_CHATS_KEY,
        JSON.stringify(validIds),
      );

      this.dialogs.set(dialogs);
    } catch (err) {
      console.error('Failed to load dialogs', err);
    } finally {
      this.loading.set(false);
    }
  }

  selectChat(dialog: Dialog): void {
    this.selectedId.set(dialog.id);
    this.dialogs.update((dialogs) => {
      const idx = dialogs.findIndex((d) => d.id === dialog.id);
      if (idx === -1) return dialogs;
      const updated = [...dialogs];
      updated[idx] = { ...updated[idx], unreadCount: 0 };
      return updated;
    });
    this.chatSelected.emit(dialog);
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  getInitials(title: string): string {
    return title
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onAvatarError(dialogId: string): void {
    this.avatarFailed.add(dialogId);
  }

  getAvatarColor(dialogId: string): string {
    let hash = 0;
    for (let i = 0; i < dialogId.length; i++) {
      hash = Math.imul(31, hash) + dialogId.charCodeAt(i);
    }
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }

  private async loadNewDialog(chatId: string): Promise<void> {
    if (this.loadingDialogIds.has(chatId)) return;
    this.loadingDialogIds.add(chatId);

    try {
      const dialog = await this.telegramService.getDialog(chatId);
      this.dialogs.update((dialogs) => {
        if (dialogs.some((d) => d.id === chatId)) return dialogs;
        return [dialog, ...dialogs];
      });
    } catch (err) {
      console.error('Failed to load new dialog', err);
    } finally {
      this.loadingDialogIds.delete(chatId);
    }
  }

  onContextMenu(event: MouseEvent, dialog: Dialog): void {
    event.preventDefault();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextDialog = dialog;
    this.contextMenuTrigger()?.openMenu();
  }

  async deleteChat(): Promise<void> {
    const dialog = this.contextDialog;
    if (!dialog) return;
    const label = dialog.isChannel
      ? this.translate.instant('gimmicks.telegram.chatList.leaveChannel')
      : dialog.isGroup
        ? this.translate.instant('gimmicks.telegram.chatList.leaveGroup')
        : this.translate.instant('gimmicks.telegram.chatList.deleteChat');
    const dialogRef = this.dialog.open(ChatConfirmDialog, {
      data: { title: `${label}?`, message: `${label}: "${dialog.title}"?` },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'success') {
        try {
          await this.telegramService.deleteChat(dialog.id);
          const clearedIds: string[] = JSON.parse(
            localStorage.getItem(ChatListComponent.CLEARED_CHATS_KEY) || '[]',
          );
          localStorage.setItem(
            ChatListComponent.CLEARED_CHATS_KEY,
            JSON.stringify(clearedIds.filter((id) => id !== dialog.id)),
          );
          this.dialogs.update((d) => d.filter((x) => x.id !== dialog.id));
          this.chatDeleted.emit(dialog.id);
        } catch (err) {
          console.error('Failed to delete chat', err);
        }
      }
    });
  }

  async clearHistory(): Promise<void> {
    const dialog = this.contextDialog;
    if (!dialog) return;
    const dialogRef = this.dialog.open(ChatConfirmDialog, {
      data: {
        title: this.translate.instant('gimmicks.telegram.chatList.clearHistoryConfirmTitle'),
        message: this.translate.instant('gimmicks.telegram.chatList.clearHistoryConfirmMessage', { title: dialog.title }),
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'success') {
        try {
          await this.telegramService.clearHistory(dialog.id);
          const clearedIds: string[] = JSON.parse(
            localStorage.getItem(ChatListComponent.CLEARED_CHATS_KEY) || '[]',
          );
          if (!clearedIds.includes(dialog.id)) {
            clearedIds.push(dialog.id);
            localStorage.setItem(
              ChatListComponent.CLEARED_CHATS_KEY,
              JSON.stringify(clearedIds),
            );
          }
          this.dialogs.update((dialogs) => {
            const idx = dialogs.findIndex((d) => d.id === dialog.id);
            if (idx === -1) return dialogs;
            const updated = [...dialogs];
            updated[idx] = { ...updated[idx], lastMessage: '', lastMessageDate: 0, lastMessageOut: false };
            return updated;
          });
        } catch (err) {
          console.error('Failed to clear history', err);
        }
      }
    });
  }

  async blockUser(): Promise<void> {
    const dialog = this.contextDialog;
    if (!dialog) return;
    const dialogRef = this.dialog.open(ChatConfirmDialog, {
      data: {
        title: this.translate.instant('gimmicks.telegram.chatList.blockConfirmTitle'),
        message: this.translate.instant('gimmicks.telegram.chatList.blockConfirmMessage', { title: dialog.title }),
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'success') {
        try {
          await this.telegramService.blockUser(dialog.id);
        } catch (err) {
          console.error('Failed to block user', err);
        }
      }
    });
  }
}
