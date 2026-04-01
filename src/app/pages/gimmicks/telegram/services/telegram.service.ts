import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthStatus, Dialog, Message, TelegramUser } from '../models/telegram-interfaces';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly baseUrl = environment.telegram.apiUrl;

  readonly authenticated = signal(false);
  readonly currentUser = signal<TelegramUser | null>(null);
  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  });

  constructor(private readonly http: HttpClient) {}

  async checkAuthStatus(): Promise<AuthStatus> {
    const status = await firstValueFrom(
      this.http.get<AuthStatus>(`${this.baseUrl}/auth/status`),
    );
    this.authenticated.set(status.authenticated);
    if (status.user) {
      this.currentUser.set(status.user);
    }
    return status;
  }

  async sendCode(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    return firstValueFrom(
      this.http.post<{ phoneCodeHash: string }>(`${this.baseUrl}/auth/send-code`, {
        phoneNumber,
      }),
    );
  }

  async signIn(phoneNumber: string, phoneCode: string): Promise<{ status: string; user?: TelegramUser }> {
    const result = await firstValueFrom(
      this.http.post<{ status: string; user?: TelegramUser }>(`${this.baseUrl}/auth/sign-in`, {
        phoneNumber,
        phoneCode,
      }),
    );
    if (result.status === 'success' && result.user) {
      this.authenticated.set(true);
      this.currentUser.set(result.user);
    }
    return result;
  }

  async signIn2FA(password: string): Promise<{ status: string; user?: TelegramUser }> {
    const result = await firstValueFrom(
      this.http.post<{ status: string; user?: TelegramUser }>(`${this.baseUrl}/auth/sign-in-2fa`, {
        password,
      }),
    );
    if (result.status === 'success' && result.user) {
      this.authenticated.set(true);
      this.currentUser.set(result.user);
    }
    return result;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/auth/logout`, {}));
    this.authenticated.set(false);
    this.currentUser.set(null);
  }

  async getDialogs(limit = 30, offset = 0): Promise<Dialog[]> {
    return firstValueFrom(
      this.http.get<Dialog[]>(`${this.baseUrl}/dialogs`, {
        params: { limit: limit.toString(), offset: offset.toString() },
      }),
    );
  }

  async getDialog(chatId: string): Promise<Dialog> {
    return firstValueFrom(
      this.http.get<Dialog>(`${this.baseUrl}/dialogs/${chatId}`),
    );
  }

  async deleteChat(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/dialogs/${chatId}`),
    );
  }

  async clearHistory(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/dialogs/${chatId}/clear-history`, {}),
    );
  }

  async blockUser(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/dialogs/${chatId}/block`, {}),
    );
  }

  async getMessages(chatId: string, limit = 30, offsetId?: number): Promise<{ messages: Message[]; readOutboxMaxId: number }> {
    const params: any = { limit: limit.toString() };
    if (offsetId) {
      params.offsetId = offsetId.toString();
    }
    return firstValueFrom(
      this.http.get<{ messages: Message[]; readOutboxMaxId: number }>(`${this.baseUrl}/messages/${chatId}`, { params }),
    );
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    return firstValueFrom(
      this.http.post<Message>(`${this.baseUrl}/messages/${chatId}`, { text }),
    );
  }

  async sendFile(chatId: string, file: File, caption?: string): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return firstValueFrom(
      this.http.post<Message>(`${this.baseUrl}/messages/${chatId}/file`, formData),
    );
  }

  async markAsRead(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/messages/${chatId}/read`, {}),
    );
  }

  getMediaUrl(chatId: string, messageId: number): string {
    return `${this.baseUrl}/media/${chatId}/${messageId}`;
  }
}
