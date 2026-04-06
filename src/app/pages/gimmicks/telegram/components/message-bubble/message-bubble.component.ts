import {
  AfterViewInit,
  Component,
  input,
  OnDestroy,
  output,
  SecurityContext,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { Message } from '../../models/telegram-interfaces';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, TranslateModule],
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.scss',
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();
  readonly chatId = input.required<string>();
  readonly mediaBaseUrl = input<string>('');
  readonly mediaToken = input<string>('');
  readonly readOutboxMaxId = input<number>(0);
  readonly mediaLoaded = output<void>();

  isRead(): boolean {
    return this.message().out && this.message().id <= this.readOutboxMaxId();
  }

  private static readonly URL_REGEX =
    /(?:https?:\/\/|www\.)[\w\-._~:/?#\[\]@!$&'()*+,;=%]+[\w\-_~/#]/gi;

  constructor(private readonly sanitizer: DomSanitizer) {}

  linkifyText(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const linked = escaped.replace(MessageBubbleComponent.URL_REGEX, (url) => {
      const rawHref = url.startsWith('www.') ? 'https://' + url : url;
      try {
        const parsed = new URL(rawHref);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return url;
        }
        const safeHref = parsed.href.replace(/"/g, '%22');
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
      } catch {
        return url;
      }
    });

    return this.sanitizer.sanitize(SecurityContext.HTML, linked) ?? '';
  }

  getMediaUrl(): string {
    const base = `${this.mediaBaseUrl()}/${this.chatId()}/${this.message().id}`;
    const media = this.message().media;

    let fileName: string | undefined;
    if (media?.hasMedia) {
      fileName = media.fileName;
      if (!fileName && media.mimeType) {
        const ext = this.mimeToExtension(media.mimeType);
        fileName = `${media.type}.${ext}`;
      }
    }

    const path = fileName ? `${base}/${encodeURIComponent(fileName)}` : base;
    const token = this.mediaToken();
    return token ? `${path}?token=${token}` : path;
  }

  private mimeToExtension(mime: string): string {
    const map: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'video/quicktime': 'mov',
    };
    return map[mime] || mime.split('/').pop() || 'bin';
  }

  formatTime(timestamp: number): string {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatFileSize(sizeStr?: string): string {
    if (!sizeStr) return '';
    const size = parseInt(sizeStr);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  getMediaIcon(): string {
    const type = this.message().media?.type;
    switch (type) {
      case 'video':
        return 'videocam';
      case 'audio':
        return 'audiotrack';
      case 'document':
        return 'description';
      case 'sticker':
        return 'emoji_emotions';
      default:
        return 'attachment';
    }
  }
}
