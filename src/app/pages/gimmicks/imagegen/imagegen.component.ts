import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

type ImageModel = 'flux' | 'sdxl';

interface AspectRatio {
  key: string;
  labelKey: string;
  width: number;
  height: number;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  model: ImageModel;
  seed: number;
  ratioKey: string;
}

@Component({
  selector: 'app-imagegen',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './imagegen.component.html',
  styleUrl: './imagegen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagegenComponent {
  private readonly workerUrl = environment.imagegen.workerUrl.replace(/\/+$/, '');
  private readonly maxRetries = 2;

  // ===== Zustand (Signals) =====
  readonly prompt = signal('');
  readonly model = signal<ImageModel>('flux');
  readonly seed = signal(this.randomSeed());
  readonly lockSeed = signal(false);
  readonly ratioKey = signal('square');

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly retrying = signal(false);
  readonly currentImageUrl = signal<string | null>(null);
  readonly current = signal<GeneratedImage | null>(null);
  readonly history = signal<GeneratedImage[]>([]);

  // Einspaltiges Layout (≤860px): dann keine vh-Höhenbegrenzung, volle Breite.
  private readonly narrow = signal(window.innerWidth <= 860);

  // ===== Konstanten =====
  readonly models: { key: ImageModel; labelKey: string }[] = [
    { key: 'flux', labelKey: 'gimmicks.imagegen.modelFlux' },
    { key: 'sdxl', labelKey: 'gimmicks.imagegen.modelSdxl' },
  ];

  readonly ratios: AspectRatio[] = [
    { key: 'square', labelKey: 'gimmicks.imagegen.ratioSquare', width: 1024, height: 1024 },
    { key: 'landscape', labelKey: 'gimmicks.imagegen.ratioLandscape', width: 1280, height: 720 },
    { key: 'portrait', labelKey: 'gimmicks.imagegen.ratioPortrait', width: 720, height: 1280 },
  ];

  // Beispiel-Prompts für den "Überraschung"-Button
  private readonly examplePromptKeys = [
    'gimmicks.imagegen.example1',
    'gimmicks.imagegen.example2',
    'gimmicks.imagegen.example3',
    'gimmicks.imagegen.example4',
    'gimmicks.imagegen.example5',
    'gimmicks.imagegen.example6',
    'gimmicks.imagegen.example7',
    'gimmicks.imagegen.example8',
    'gimmicks.imagegen.example9',
    'gimmicks.imagegen.example10',
    'gimmicks.imagegen.example11',
    'gimmicks.imagegen.example12',
    'gimmicks.imagegen.example13',
    'gimmicks.imagegen.example14',
  ];

  // ===== Abgeleitete Werte (computed) =====
  readonly selectedRatio = computed<AspectRatio>(() => {
    if (this.model() === 'flux') {
      return this.ratios[0]; // flux-schnell liefert immer 1024x1024
    }
    return this.ratios.find((r) => r.key === this.ratioKey()) ?? this.ratios[0];
  });

  /**
   * Begrenzt im zweispaltigen Layout die Breite so, dass die Höhe (= Breite /
   * Seitenverhältnis) höchstens ~60vh wird – passt so auf niedrige Displays.
   * Im einspaltigen Layout (≤860px) keine Begrenzung -> volle Spaltenbreite.
   */
  readonly canvasMaxWidth = computed<string | null>(() => {
    if (this.narrow()) {
      return null;
    }
    const r = this.selectedRatio();
    return `${(r.width / r.height) * 60}vh`;
  });

  /** "Variation" nur sinnvoll bei SDXL mit freiem Seed. */
  readonly showVariation = computed(
    () => this.model() === 'sdxl' && !this.lockSeed()
  );

  constructor(private translate: TranslateService) {}

  @HostListener('window:resize')
  onResize() {
    this.narrow.set(window.innerWidth <= 860);
  }

  selectModel(model: ImageModel) {
    this.model.set(model);
  }

  selectRatio(key: string) {
    this.ratioKey.set(key);
  }

  toggleLockSeed() {
    this.lockSeed.update((v) => !v);
  }

  rerollSeed() {
    this.seed.set(this.randomSeed());
  }

  surprise() {
    const current = this.prompt().trim();
    const all = this.examplePromptKeys.map((k) => this.translate.instant(k));
    const pool = all.filter((text) => text !== current);
    const list = pool.length ? pool : all;
    this.prompt.set(list[Math.floor(Math.random() * list.length)]);
  }

  generate() {
    const trimmed = this.prompt().trim();
    if (!trimmed || this.loading()) {
      return;
    }
    if (this.model() === 'sdxl' && !this.lockSeed()) {
      this.seed.set(this.randomSeed());
    }
    const ratio = this.selectedRatio();
    const sourceUrl = this.buildUrl(trimmed, ratio);
    this.runGeneration(sourceUrl, {
      url: '',
      prompt: trimmed,
      model: this.model(),
      seed: this.seed(),
      ratioKey: ratio.key,
    });
  }

  /**
   * Generiert das Bild genau EINMAL und behält die Bytes als Blob (Object-URL).
   * Anzeige, Download und "in neuem Tab" nutzen denselben Blob – so wird das Bild
   * nicht bei jeder Aktion neu erzeugt (und sieht z. B. bei Flux ohne Seed nicht
   * jedes Mal anders aus) und es wird nur einmal Workers-AI-Quota verbraucht.
   */
  private async runGeneration(sourceUrl: string, meta: GeneratedImage) {
    this.error.set(false);
    this.retrying.set(false);
    this.loading.set(true);
    this.currentImageUrl.set(null);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.retrying.set(true);
          await this.delay(1500 * attempt);
        }
        const url = attempt === 0 ? sourceUrl : `${sourceUrl}&_retry=${attempt}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        const blob = await response.blob();
        meta.url = URL.createObjectURL(blob);
        this.current.set(meta);
        this.history.update((h) => [meta, ...h].slice(0, 8));
        this.retrying.set(false);
        this.currentImageUrl.set(meta.url); // (load) blendet das Bild ein
        return;
      } catch {
        // nächster Versuch
      }
    }
    this.loading.set(false);
    this.retrying.set(false);
    this.error.set(true);
  }

  onImageLoad() {
    this.loading.set(false);
    this.retrying.set(false);
  }

  onImageError() {
    this.loading.set(false);
    this.error.set(true);
  }

  restore(image: GeneratedImage) {
    this.prompt.set(image.prompt);
    this.model.set(image.model);
    this.seed.set(image.seed);
    this.ratioKey.set(image.ratioKey);
    this.error.set(false);
    this.retrying.set(false);
    this.loading.set(false);
    this.current.set(image);
    this.currentImageUrl.set(image.url); // Blob liegt bereits vor – sofort anzeigen
  }

  download() {
    const image = this.current();
    if (!image) {
      return;
    }
    const ext = image.model === 'sdxl' ? 'png' : 'jpg';
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `ai-image-${image.seed}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private buildUrl(prompt: string, ratio: AspectRatio): string {
    const params = new URLSearchParams({
      prompt,
      model: this.model(),
    });
    if (this.model() === 'sdxl') {
      params.set('width', String(ratio.width));
      params.set('height', String(ratio.height));
      params.set('seed', String(this.seed()));
    }
    return `${this.workerUrl}/?${params.toString()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
