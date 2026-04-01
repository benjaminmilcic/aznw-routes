import { Injectable, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Message } from '../models/telegram-interfaces';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TelegramWebSocketService implements OnDestroy {
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly lastMessage = signal<(Message & { chatId: string }) | null>(null);
  readonly lastReadEvent = signal<{ chatId: string; maxId: number } | null>(null);

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.telegram.webSocketsUrl, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });

    this.socket.on('newMessage', (message: Message & { chatId: string }) => {
      this.lastMessage.set(message);
    });

    this.socket.on('readHistory', (data: { chatId: string; maxId: number }) => {
      this.lastReadEvent.set(data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
