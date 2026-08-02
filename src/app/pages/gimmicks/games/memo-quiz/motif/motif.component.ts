import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ALL_MOTIFS } from '../data/card-motifs';

const MOTIF_MAP = new Map(ALL_MOTIFS.map((m) => [m.id, m]));

/** Zeigt ein Kartenmotiv als eingebettetes SVG (keine externen Bilder). */
@Component({
  selector: 'app-memo-motif',
  templateUrl: './motif.component.html',
  styleUrl: './motif.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotifComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly motifId = input.required<string>();

  protected readonly name = computed(() => MOTIF_MAP.get(this.motifId())?.name ?? '');

  protected readonly safeSvg = computed<SafeHtml>(() => {
    const svg = MOTIF_MAP.get(this.motifId())?.svg ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });
}
