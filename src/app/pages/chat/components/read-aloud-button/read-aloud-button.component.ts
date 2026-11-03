import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { detectLanguage, SpeechLanguage, SpeechPlayerService } from '../../speech-player.service';

/** Small button below an answer that reads it aloud – a second click stops it. Looks like the copy button. */
@Component({
  selector: 'app-read-aloud-button',
  imports: [MatIconModule, MatTooltipModule, TranslateModule],
  templateUrl: './read-aloud-button.component.html',
  styleUrl: './read-aloud-button.component.scss',
})
export class ReadAloudButtonComponent {
  readonly text = input.required<string>();

  private readonly player = inject(SpeechPlayerService);
  private readonly translate = inject(TranslateService);
  protected readonly reading = computed(() => this.player.reading() === this.text());

  protected toggle(): void {
    if (this.reading()) {
      this.player.stop();
      return;
    }
    // The answer is in the language of the question – the website's language only decides when that is unclear
    const websiteLanguage = (['de', 'en', 'hr'].includes(this.translate.currentLang) ? this.translate.currentLang : 'en') as SpeechLanguage;
    this.player.speak(this.text(), detectLanguage(this.text(), websiteLanguage));
  }
}
