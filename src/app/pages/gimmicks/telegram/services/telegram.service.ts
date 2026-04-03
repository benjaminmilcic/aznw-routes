import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthStatus, Dialog, Message, TelegramUser } from '../models/telegram-interfaces';
import { environment } from '../../../../../environments/environment';

const SESSION_KEY = 'telegram_session_id';

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly baseUrl = environment.telegram.apiUrl;

  readonly authenticated = signal(false);
  readonly currentUser = signal<TelegramUser | null>(null);
  readonly mediaToken = signal<string>('');
  private readonly mediaTokenExpiresAt = signal(0);
  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  });

  constructor(private readonly http: HttpClient) {}

  getSessionId(): string | null {
    return localStorage.getItem(SESSION_KEY);
  }

  private setSessionId(id: string): void {
    localStorage.setItem(SESSION_KEY, id);
  }

  private clearSessionId(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  private getHeaders(): HttpHeaders {
    const sessionId = this.getSessionId();
    let headers = new HttpHeaders();
    if (sessionId) {
      headers = headers.set('x-telegram-session', sessionId);
    }
    return headers;
  }

  async checkAuthStatus(): Promise<AuthStatus> {
    const status = await firstValueFrom(
      this.http.get<AuthStatus>(`${this.baseUrl}/auth/status`, {
        headers: this.getHeaders(),
      }),
    );
    this.authenticated.set(status.authenticated);
    if (status.user) {
      this.currentUser.set(status.user);
    }
    return status;
  }

  async sendCode(phoneNumber: string): Promise<{ phoneCodeHash: string; sessionId: string }> {
    const result = await firstValueFrom(
      this.http.post<{ phoneCodeHash: string; sessionId: string }>(
        `${this.baseUrl}/auth/send-code`,
        { phoneNumber },
        { headers: this.getHeaders() },
      ),
    );
    // Backend returns a new sessionId – store it
    this.setSessionId(result.sessionId);
    return result;
  }

  async signIn(phoneNumber: string, phoneCode: string): Promise<{ status: string; user?: TelegramUser }> {
    const result = await firstValueFrom(
      this.http.post<{ status: string; user?: TelegramUser }>(
        `${this.baseUrl}/auth/sign-in`,
        { phoneNumber, phoneCode },
        { headers: this.getHeaders() },
      ),
    );
    if (result.status === 'success' && result.user) {
      this.authenticated.set(true);
      this.currentUser.set(result.user);
    }
    return result;
  }

  async signIn2FA(password: string): Promise<{ status: string; user?: TelegramUser }> {
    const result = await firstValueFrom(
      this.http.post<{ status: string; user?: TelegramUser }>(
        `${this.baseUrl}/auth/sign-in-2fa`,
        { password },
        { headers: this.getHeaders() },
      ),
    );
    if (result.status === 'success' && result.user) {
      this.authenticated.set(true);
      this.currentUser.set(result.user);
    }
    return result;
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/auth/logout`, {}, {
        headers: this.getHeaders(),
      }),
    );
    this.clearSession();
  }

  // Leert nur den lokalen Auth-State ohne einen HTTP-Call zu machen.
  // Wird vom Interceptor aufgerufen, wenn der Server 401 zurückgibt.
  clearSession(): void {
    this.authenticated.set(false);
    this.currentUser.set(null);
    this.mediaToken.set('');
    this.mediaTokenExpiresAt.set(0);
    this.clearSessionId();
  }

  async getDialogs(limit = 30, offset = 0): Promise<Dialog[]> {
    return firstValueFrom(
      this.http.get<Dialog[]>(`${this.baseUrl}/dialogs`, {
        headers: this.getHeaders(),
        params: { limit: limit.toString(), offset: offset.toString() },
      }),
    );
  }

  async getDialog(chatId: string): Promise<Dialog> {
    return firstValueFrom(
      this.http.get<Dialog>(`${this.baseUrl}/dialogs/${chatId}`, {
        headers: this.getHeaders(),
      }),
    );
  }

  async deleteChat(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/dialogs/${chatId}`, {
        headers: this.getHeaders(),
      }),
    );
  }

  async clearHistory(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/dialogs/${chatId}/clear-history`, {}, {
        headers: this.getHeaders(),
      }),
    );
  }

  async blockUser(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/dialogs/${chatId}/block`, {}, {
        headers: this.getHeaders(),
      }),
    );
  }

  async getMessages(chatId: string, limit = 30, offsetId?: number): Promise<{ messages: Message[]; readOutboxMaxId: number }> {
    const params: any = { limit: limit.toString() };
    if (offsetId) {
      params.offsetId = offsetId.toString();
    }
    return firstValueFrom(
      this.http.get<{ messages: Message[]; readOutboxMaxId: number }>(
        `${this.baseUrl}/messages/${chatId}`,
        { headers: this.getHeaders(), params },
      ),
    );
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    return firstValueFrom(
      this.http.post<Message>(
        `${this.baseUrl}/messages/${chatId}`,
        { text },
        { headers: this.getHeaders() },
      ),
    );
  }

  async sendFile(chatId: string, file: File, caption?: string): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return firstValueFrom(
      this.http.post<Message>(
        `${this.baseUrl}/messages/${chatId}/file`,
        formData,
        { headers: this.getHeaders() },
      ),
    );
  }

  async markAsRead(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/messages/${chatId}/read`, {}, {
        headers: this.getHeaders(),
      }),
    );
  }

  async getMediaToken(): Promise<string> {
    const now = Date.now();
    const token = this.mediaToken();
    if (token && now < this.mediaTokenExpiresAt() - 60_000) {
      return token;
    }

    const result = await firstValueFrom(
      this.http.post<{ token: string; expiresAt: number }>(
        `${this.baseUrl}/media/token`,
        {},
        { headers: this.getHeaders() },
      ),
    );
    this.mediaToken.set(result.token);
    this.mediaTokenExpiresAt.set(result.expiresAt);
    return result.token;
  }

  getMediaUrl(chatId: string, messageId: number): string {
    const token = this.mediaToken();
    return token
      ? `${this.baseUrl}/media/${chatId}/${messageId}?token=${token}`
      : `${this.baseUrl}/media/${chatId}/${messageId}`;
  }
}
