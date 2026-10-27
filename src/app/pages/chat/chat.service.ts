import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

/** Why an answer failed – shown as a translated message. */
export type ChatErrorCode = 'rate_limit' | 'daily_limit' | 'error';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  errorCode?: ChatErrorCode;
  /** For 'daily_limit': minutes until Groq's free daily allowance has room again */
  retryAfterMinutes?: number;
  /** Set when older messages had to be summarized for this answer to fit the model's context window. */
  summarized?: boolean;
  /** Tool the assistant is calling right now (e.g. search_recipes) – shown while no text has arrived yet. */
  tool?: string;
  /** The assistant needs the visitor's location (weather) – a "share location" button is shown. */
  locationRequest?: boolean;
}

/**
 * State of the AI chat. Provided in root, so the conversation survives navigating to a page the chat linked to and
 * back. It lives only in memory: a reload starts a new chat (also in the backend, which forgets the session).
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly messages = signal<ChatMessage[]>([]);
  readonly streaming = signal(false);

  private readonly translate = inject(TranslateService);

  private sessionId = crypto.randomUUID();
  private abortController?: AbortController;
  private location?: { latitude: number; longitude: number };

  /**
   * Sends a question. `shown` is what appears in the chat, if it differs from the text sent to the model
   * (used when the location is shared: the bubble says so, the question is asked again).
   */
  async send(text: string, shown?: string): Promise<void> {
    const message = text.trim();
    if (!message || this.streaming()) return;

    this.messages.update((m) => [...m, { role: 'user', content: shown ?? message }, { role: 'assistant', content: '' }]);
    this.streaming.set(true);
    this.abortController = new AbortController();

    try {
      const response = await fetch(environment.chat.streamApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // language: the website language, the answer language when the message itself has none (e.g. "aaaa")
        body: JSON.stringify({
          sessionId: this.sessionId,
          message,
          location: this.location,
          language: this.translate.currentLang,
        }),
        signal: this.abortController.signal,
      });
      if (response.status === 429) {
        this.updateLast({ errorCode: 'rate_limit' });
      } else if (!response.ok || !response.body) {
        this.updateLast({ errorCode: 'error' });
      } else {
        await this.readEventStream(response.body);
        // The stream ended without any answer (connection dropped, unexpected response)
        const last = this.messages()[this.messages().length - 1];
        if (!last.content && !last.errorCode) this.updateLast({ errorCode: 'error' });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        this.updateLast({ errorCode: 'error' });
      }
    } finally {
      this.updateLast({ tool: undefined });
      this.streaming.set(false);
      this.abortController = undefined;
    }
  }

  stop(): void {
    this.abortController?.abort();
  }

  async reset(): Promise<void> {
    this.stop();
    const oldSession = this.sessionId;
    this.sessionId = crypto.randomUUID();
    this.messages.set([]);
    await fetch(`${environment.chat.sessionApi}/${oldSession}`, { method: 'DELETE' }).catch(() => undefined);
  }

  /** Asks the browser for the location and asks the last question again, now with the location. */
  async shareLocation(shownText: string): Promise<void> {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 10 * 60 * 1000 }),
    );
    this.location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    this.messages.update((messages) => messages.map((m) => ({ ...m, locationRequest: false })));
    const lastQuestion = [...this.messages()].reverse().find((m) => m.role === 'user')?.content ?? '';
    await this.send(lastQuestion, shownText);
  }

  /** Parses the SSE stream (`data: {...}\n\n`, comment lines start with ":") and updates the last message. */
  private async readEventStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        if (!event.startsWith('data: ')) continue; // ":ok" and heartbeat comments
        const data = event.slice(6);
        if (data === '[DONE]') return;
        // The backend also sends {"usage": ...} with token counts – not shown on the website
        const payload = JSON.parse(data) as {
          summary?: unknown;
          token?: string;
          tool?: string;
          action?: string;
          error?: string;
          code?: ChatErrorCode;
          retryAfterMinutes?: number;
        };
        if (payload.summary) this.updateLast({ summarized: true });
        if (payload.tool) this.updateLast({ tool: payload.tool });
        if (payload.token) this.appendToLast(payload.token);
        if (payload.action === 'request_location') this.updateLast({ locationRequest: true });
        if (payload.error) {
          const code: ChatErrorCode = payload.code === 'rate_limit' || payload.code === 'daily_limit' ? payload.code : 'error';
          this.updateLast({ errorCode: code, retryAfterMinutes: payload.retryAfterMinutes });
        }
      }
    }
  }

  private appendToLast(text: string): void {
    this.messages.update((messages) => {
      const last = messages[messages.length - 1];
      return [...messages.slice(0, -1), { ...last, content: last.content + text, tool: undefined }];
    });
  }

  private updateLast(changes: Partial<ChatMessage>): void {
    this.messages.update((messages) => [...messages.slice(0, -1), { ...messages[messages.length - 1], ...changes }]);
  }
}
