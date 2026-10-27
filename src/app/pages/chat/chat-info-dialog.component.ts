import { Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Info dialog: why the chat only allows a few questions per minute (free tiers) and their limits.
 * Values as of 2026-10 – sources: console.groq.com/docs/rate-limits, developers.cloudflare.com/workers-ai/platform/pricing
 */
@Component({
  selector: 'app-chat-info-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ 'chat.info.title' | translate }}</h2>

    <mat-dialog-content class="chat-dialog">
      <!-- Inner wrapper: Material sets display: block on mat-dialog-content, which overrides Tailwind's flex -->
      <div class="flex flex-col gap-5">
        <p class="m-0 text-sm">{{ 'chat.info.intro' | translate }}</p>

        <section class="flex flex-col gap-2">
          <h3 class="m-0 flex items-center gap-2 text-base font-medium">
            <mat-icon>smart_toy</mat-icon>
            {{ 'chat.info.chatTitle' | translate }}
          </h3>
          <ul class="m-0 pl-5 text-sm">
            <li>{{ 'chat.info.chatLimit1' | translate }}</li>
            <li>{{ 'chat.info.chatLimit2' | translate }}</li>
          </ul>
          <p class="m-0 text-sm opacity-70">{{ 'chat.info.chatNote' | translate }}</p>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="m-0 flex items-center gap-2 text-base font-medium">
            <mat-icon>mic</mat-icon>
            {{ 'chat.info.voiceTitle' | translate }}
          </h3>
          <ul class="m-0 pl-5 text-sm">
            <li>{{ 'chat.info.voiceLimit1' | translate }}</li>
            <li>{{ 'chat.info.voiceLimit2' | translate }}</li>
          </ul>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="m-0 flex items-center gap-2 text-base font-medium">
            <mat-icon>travel_explore</mat-icon>
            {{ 'chat.info.searchTitle' | translate }}
          </h3>
          <ul class="m-0 pl-5 text-sm">
            <li>{{ 'chat.info.searchLimit1' | translate }}</li>
            <li>{{ 'chat.info.searchLimit2' | translate }}</li>
          </ul>
        </section>

        <p class="m-0 text-xs opacity-60">{{ 'chat.info.asOf' | translate }}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="chat-info-close" mat-dialog-close>{{ 'chat.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  // The dialog lives in the CDK overlay outside the chat page, so its styles are global but scoped by the panel class
  encapsulation: ViewEncapsulation.None,
  styles: `
    /* Doubled class: Material injects its dialog styles later with the same specificity */
    .chat-info-panel.chat-info-panel {
      --mat-dialog-subhead-color: #fef3c7;
      --mat-dialog-supporting-text-color: rgba(254, 243, 199, 0.88);

      /* Lighter and warmer than the page, with an amber frame and glow, so it stands out from the wood background */
      .mat-mdc-dialog-surface {
        border: 1px solid rgba(251, 191, 36, 0.6);
        border-radius: 18px;
        background: linear-gradient(160deg, #6b4a30 0%, #523822 55%, #45301d 100%);
        box-shadow:
          0 0 0 4px rgba(251, 191, 36, 0.12),
          0 0 40px rgba(251, 191, 36, 0.18),
          0 24px 60px rgba(0, 0, 0, 0.6);
      }

      /* Scrollbar in the dialog colors (phones / small windows) */
      .mat-mdc-dialog-content {
        scrollbar-color: rgba(251, 191, 36, 0.6) rgba(0, 0, 0, 0.2);
        scrollbar-width: thin;

        &::-webkit-scrollbar {
          width: 8px;
        }

        &::-webkit-scrollbar-track {
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.2);
        }

        &::-webkit-scrollbar-thumb {
          border-radius: 4px;
          background: rgba(251, 191, 36, 0.6);
        }
      }

      .mat-mdc-dialog-title {
        font-family: 'Fraunces', serif;
        font-weight: 600;
      }

      h3 {
        color: #fef3c7;
      }

      h3 .mat-icon,
      li::marker {
        color: #fbbf24;
      }

      .chat-info-close {
        padding: 8px 20px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, #fcd34d, #f59e0b);
        color: #1c1208;
        font-weight: 600;
        cursor: pointer;
      }
    }

    /* Darker, blurred backdrop so the page behind steps back */
    .cdk-overlay-backdrop.chat-info-backdrop {
      background: rgba(10, 6, 3, 0.65);
      backdrop-filter: blur(3px);
    }
  `,
})
export class ChatInfoDialogComponent {}
