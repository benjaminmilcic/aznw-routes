import { Directive, HostListener, Input, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Taken over from the whiteboard app.
 *
 * Clicking an element reads the given text aloud. Uses the
 * built-in Web Speech API (window.speechSynthesis) – free, without an
 * API key, offline. Available in Chrome/Edge/Safari.
 *
 * Unlike in the whiteboard (always Croatian there) the pronunciation
 * follows the currently selected app language. If an installed voice
 * matches, it is chosen specifically; otherwise the browser uses the
 * default voice with `lang` set.
 *
 * Usage:  <span [speakOnClick]="spieler.name">{{ spieler.name }}</span>
 */
@Directive({
  selector: '[speakOnClick]',
  standalone: true,
  host: {
    role: 'button',
    tabindex: '0',
    style: 'cursor: pointer',
  },
})
export class SpeakOnClickDirective {
  /** App language → BCP-47 language code for speech output. */
  private static readonly LANG_MAP: Record<string, string> = {
    de: 'de-DE',
    en: 'en-US',
    hr: 'hr-HR',
  };

  private readonly translate = inject(TranslateService);

  /** The text to read aloud (usually a player name). */
  @Input('speakOnClick') text = '';

  @HostListener('click')
  @HostListener('keydown.enter')
  @HostListener('keydown.space')
  speak(): void {
    const text = (this.text || '').trim();
    if (!text) return;

    const synth = window.speechSynthesis;
    if (!synth) return; // Browser without speech output: silently ignore

    synth.cancel(); // cancel the running output so that it doesn't overlap

    // The voice list is loaded asynchronously. If it is still empty on the first
    // click, the output would get no matching voice – the browser would then
    // take its default voice (usually English) and pronounce e.g. German names
    // in English. That's why we wait for 'voiceschanged' if necessary.
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', () => this.utter(synth, text), { once: true });
      return;
    }
    this.utter(synth, text);
  }

  private utter(synth: SpeechSynthesis, text: string, localOnly = false): void {
    const lang = this.speechLang();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;

    const voice = this.voiceFor(synth, lang, localOnly);
    if (voice) utterance.voice = voice;

    // Online voices (e.g. "Google Deutsch") need the internet. If it does not
    // work, retry once with a locally installed voice.
    if (voice && !voice.localService && !localOnly) {
      utterance.onerror = () => this.utter(synth, text, true);
    }

    synth.speak(utterance);
  }

  /** BCP-47 code matching the selected language (fallback: German). */
  private speechLang(): string {
    const current = this.translate.currentLang || this.translate.getDefaultLang() || 'de';
    return SpeakOnClickDirective.LANG_MAP[current] ?? current;
  }

  /**
   * Picks the best available voice for this language.
   *
   * Modern online voices like "Google Deutsch" are preferred – they sound
   * much more natural than the old Windows desktop voices. With
   * `localOnly` it falls back to a locally installed voice (fallback
   * when there is no internet connection).
   */
  private voiceFor(
    synth: SpeechSynthesis,
    lang: string,
    localOnly: boolean,
  ): SpeechSynthesisVoice | null {
    const wanted = lang.toLowerCase();
    const prefix = wanted.slice(0, 2);
    const langOf = (v: SpeechSynthesisVoice) => (v.lang || '').toLowerCase().replace('_', '-');

    const candidates = synth
      .getVoices()
      .filter((v) => langOf(v).startsWith(prefix))
      .filter((v) => !localOnly || v.localService);
    if (candidates.length === 0) return null;

    return candidates.reduce((best, v) => (this.rank(v, wanted) > this.rank(best, wanted) ? v : best));
  }

  /** The higher, the more preferred – sorted purely by sound quality. */
  private rank(voice: SpeechSynthesisVoice, wanted: string): number {
    const name = (voice.name || '').toLowerCase();
    const lang = (voice.lang || '').toLowerCase().replace('_', '-');
    let score = 0;
    if (lang === wanted) score += 8; // exactly matching region
    if (name.includes('google') || name.includes('natural')) score += 4;
    if (!voice.localService) score += 2; // Online voices usually sound better
    if (name.includes('desktop') || name.includes('hedda')) score -= 3; // old voices
    return score;
  }
}
