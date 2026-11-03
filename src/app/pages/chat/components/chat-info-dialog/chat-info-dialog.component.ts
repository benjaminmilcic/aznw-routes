import { Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Info dialog: the limits of the chat – per visitor (nest-aznw-api), the daily budget (python-aznw-api) and the free
 * tiers of voice input and knowledge search.
 * Values as of 2026-10 – sources: console.groq.com/docs/rate-limits, developers.cloudflare.com/workers-ai/platform/pricing
 */
@Component({
  selector: 'app-chat-info-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslateModule],
  templateUrl: './chat-info-dialog.component.html',
  // The dialog lives in the CDK overlay outside the chat page, so its styles are global but scoped by the panel class
  encapsulation: ViewEncapsulation.None,
  styleUrl: './chat-info-dialog.component.scss',
})
export class ChatInfoDialogComponent {}
