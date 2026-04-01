import { Component, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatViewComponent } from '../chat-view/chat-view.component';
import { TelegramService } from '../../services/telegram.service';
import { TelegramWebSocketService } from '../../services/telegram-websocket.service';
import { Dialog } from '../../models/telegram-interfaces';

@Component({
  selector: 'app-telegram-chat-layout',
  standalone: true,
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    MatTooltipModule,
    ChatListComponent,
    ChatViewComponent,
  ],
  templateUrl: './telegram-chat-layout.component.html',
  styleUrl: './telegram-chat-layout.component.scss',
})
export class TelegramChatLayoutComponent implements OnInit {
  readonly selectedChat = signal<Dialog | null>(null);

  constructor(
    readonly telegramService: TelegramService,
    private readonly telegramWsService: TelegramWebSocketService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.telegramWsService.connect();
  }

  onChatSelected(dialog: Dialog): void {
    this.selectedChat.set(dialog);
  }

  onBackToList(): void {
    this.selectedChat.set(null);
  }

  onChatDeleted(chatId: string): void {
    if (this.selectedChat()?.id === chatId) {
      this.selectedChat.set(null);
    }
  }

  async logout(): Promise<void> {
    await this.telegramService.logout();
    this.telegramWsService.disconnect();
    this.router.navigate(['/gimmicks/telegram/login']);
  }
}
