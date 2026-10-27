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
  /** Width that was last calculated for – ignore height changes. */
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

      // The line breaks are only correct once the monospace font is loaded.
      document.fonts?.ready.then(() => this.updateMetaSeparators());
    });
  }

  ngOnInit(): void {
    const now = new Date();
    this.currentYear.set(now.getFullYear().toString());

    // Another language means another text length and therefore other line breaks.
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      setTimeout(() => this.updateMetaSeparators());
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.langChangeSub?.unsubscribe();
  }

  /**
   * Hides every separator dot in the meta line where the line wraps, and
   * forces the line break there with a <br> instead. Without the forced break
   * the next entry would move up a line into the freed space
   * and would then stand next to its predecessor without a dot.
   */
  private updateMetaSeparators(): void {
    const host = this.meta()?.nativeElement;
    if (!host) return;

    const items = Array.from(host.querySelectorAll<HTMLElement>('.meta-item'));
    const gaps = Array.from(host.querySelectorAll<HTMLElement>('.meta-gap'));
    if (items.length < 2 || gaps.length < items.length - 1) return;

    // First establish the natural line breaks and measure them completely ...
    gaps.forEach((gap) => gap.classList.remove('is-break'));
    const tops = items.map((item) => item.offsetTop);

    // ... only then set the dots, otherwise the measurement shifts.
    for (let i = 1; i < items.length; i++) {
      gaps[i - 1].classList.toggle('is-break', tops[i] > tops[i - 1]);
    }
  }
}
