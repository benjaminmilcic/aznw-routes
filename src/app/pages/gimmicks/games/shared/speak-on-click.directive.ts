import { Directive, HostListener, Input, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Aus der Whiteboard-App übernommen.
 *
 * Klick auf ein Element liest den übergebenen Text laut vor. Nutzt die
 * eingebaute Web Speech API (window.speechSynthesis) – kostenlos, ohne
 * API-Key, offline. Verfügbar in Chrome/Edge/Safari.
 *
 * Anders als im Whiteboard (dort immer kroatisch) richtet sich die
 * Aussprache nach der aktuell eingestellten App-Sprache. Passt eine
 * installierte Stimme dazu, wird sie gezielt gewählt; sonst nutzt der
 * Browser die Standardstimme mit gesetztem `lang`.
 *
 * Verwendung:  <span [speakOnClick]="spieler.name">{{ spieler.name }}</span>
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
  /** App-Sprache → BCP-47-Sprachcode für die Sprachausgabe. */
  private static readonly LANG_MAP: Record<string, string> = {
    de: 'de-DE',
    en: 'en-US',
    hr: 'hr-HR',
  };

  private readonly translate = inject(TranslateService);

  /** Der vorzulesende Text (i.d.R. ein Spielername). */
  @Input('speakOnClick') text = '';

  @HostListener('click')
  @HostListener('keydown.enter')
  @HostListener('keydown.space')
  speak(): void {
    const text = (this.text || '').trim();
    if (!text) return;

    const synth = window.speechSynthesis;
    if (!synth) return; // Browser ohne Sprachausgabe: still ignorieren

    synth.cancel(); // laufende Ausgabe abbrechen, damit es nicht überlappt

    // Die Stimmenliste wird asynchron geladen. Ist sie beim ersten Klick noch
    // leer, bekäme die Ausgabe keine passende Stimme – der Browser würde dann
    // seine Standardstimme nehmen (meist englisch) und z. B. deutsche Namen
    // englisch aussprechen. Deshalb notfalls auf 'voiceschanged' warten.
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

    // Online-Stimmen (z. B. "Google Deutsch") brauchen Internet. Klappt es
    // nicht, einmalig mit einer lokal installierten Stimme wiederholen.
    if (voice && !voice.localService && !localOnly) {
      utterance.onerror = () => this.utter(synth, text, true);
    }

    synth.speak(utterance);
  }

  /** BCP-47-Code passend zur eingestellten Sprache (Fallback: Deutsch). */
  private speechLang(): string {
    const current = this.translate.currentLang || this.translate.getDefaultLang() || 'de';
    return SpeakOnClickDirective.LANG_MAP[current] ?? current;
  }

  /**
   * Wählt die beste verfügbare Stimme für diese Sprache.
   *
   * Bevorzugt werden moderne Online-Stimmen wie "Google Deutsch" – die klingen
   * deutlich natürlicher als die alten Windows-Desktop-Stimmen. Mit
   * `localOnly` wird auf eine lokal installierte Stimme ausgewichen (Rückfall,
   * wenn keine Internetverbindung besteht).
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

  /** Je höher, desto lieber – rein nach Klangqualität sortiert. */
  private rank(voice: SpeechSynthesisVoice, wanted: string): number {
    const name = (voice.name || '').toLowerCase();
    const lang = (voice.lang || '').toLowerCase().replace('_', '-');
    let score = 0;
    if (lang === wanted) score += 8; // exakt passende Region
    if (name.includes('google') || name.includes('natural')) score += 4;
    if (!voice.localService) score += 2; // Online-Stimmen klingen meist besser
    if (name.includes('desktop') || name.includes('hedda')) score -= 3; // alte Stimmen
    return score;
  }
}
