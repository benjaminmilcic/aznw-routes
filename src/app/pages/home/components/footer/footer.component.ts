import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  imports: [TranslateModule],
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = signal<string>('2026');

  private readonly meta = viewChild<ElementRef<HTMLDivElement>>('meta');
  private readonly metaWrapper = viewChild<ElementRef<HTMLDivElement>>('metaWrapper');
  private readonly translate = inject(TranslateService);
  private resizeObserver: ResizeObserver | null = null;
  private langChangeSub?: Subscription;
  /** Breite, fuer die zuletzt gerechnet wurde – Hoehenaenderungen ignorieren. */
  private lastWidth = -1;

  constructor() {
    afterNextRender(() => {
      this.updateMetaSeparators();

      const wrapper = this.metaWrapper()?.nativeElement;
      if (wrapper && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(([entry]) => {
          const width = entry.contentRect.width;
          if (Math.abs(width - this.lastWidth) < 1) return;
          this.lastWidth = width;
          this.updateMetaSeparators();
        });
        this.resizeObserver.observe(wrapper);
      }

      // Erst mit der geladenen Monospace-Schrift stimmen die Umbrueche.
      document.fonts?.ready.then(() => this.updateMetaSeparators());
    });
  }

  ngOnInit(): void {
    const now = new Date();
    this.currentYear.set(now.getFullYear().toString());

    // Andere Sprache heisst andere Textlaenge und damit andere Umbrueche.
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      setTimeout(() => this.updateMetaSeparators());
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.langChangeSub?.unsubscribe();
  }

  /**
   * Blendet in der Meta-Zeile jeden Trennpunkt aus, an dem umbrochen wird, und
   * erzwingt den Umbruch dort stattdessen per <br>. Ohne den erzwungenen Umbruch
   * wuerde der naechste Eintrag durch den frei gewordenen Platz eine Zeile
   * hochrutschen und stuende dann ohne Punkt neben seinem Vorgaenger.
   */
  private updateMetaSeparators(): void {
    const host = this.meta()?.nativeElement;
    if (!host) return;

    const items = Array.from(host.querySelectorAll<HTMLElement>('.meta-item'));
    const gaps = Array.from(host.querySelectorAll<HTMLElement>('.meta-gap'));
    if (items.length < 2 || gaps.length < items.length - 1) return;

    // Zuerst den natuerlichen Umbruch herstellen und komplett vermessen ...
    gaps.forEach((gap) => gap.classList.remove('is-break'));
    const tops = items.map((item) => item.offsetTop);

    // ... danach erst die Punkte setzen, sonst verschiebt sich die Messung.
    for (let i = 1; i < items.length; i++) {
      gaps[i - 1].classList.toggle('is-break', tops[i] > tops[i - 1]);
    }
  }
}
