import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  BODY_BY_ID,
  BodyId,
  J2000_MS,
  MAJOR_BODIES,
  ORBIT_BODIES,
  SPEED_STEPS,
} from './orbit.bodies';
import { OrbitScene } from './orbit.scene';

@Component({
  selector: 'app-orbit',
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './orbit.component.html',
  styleUrl: './orbit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrbitComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('labels', { static: true }) labelsRef!: ElementRef<HTMLElement>;

  readonly major = MAJOR_BODIES;
  readonly labelIds = ORBIT_BODIES.map((b) => b.id);
  readonly speedSteps = SPEED_STEPS;

  readonly loading = signal(true);
  readonly selected = signal<BodyId | null>(null);
  readonly hovered = signal<BodyId | null>(null);
  readonly paused = signal(false);
  readonly speed = signal(8);
  readonly showOrbits = signal(true);
  readonly showLabels = signal(true);
  readonly simDays = signal((Date.now() - J2000_MS) / 86_400_000);
  readonly helpOpen = signal(false);

  readonly selectedDef = computed(() => {
    const id = this.selected();
    return id ? BODY_BY_ID[id] : null;
  });

  readonly simDate = computed(() => {
    const d = new Date(J2000_MS + this.simDays() * 86_400_000);
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'hr' ? 'hr-HR' : lang === 'en' ? 'en-GB' : 'de-DE';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  });

  private scene: OrbitScene | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly translate: TranslateService,
  ) {}

  ngAfterViewInit() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) this.paused.set(true);

    this.zone.runOutsideAngular(() => {
      this.scene = new OrbitScene(
        this.canvasRef.nativeElement,
        this.viewportRef.nativeElement,
        this.labelsRef.nativeElement,
        {
          onReady: () => this.zone.run(() => this.loading.set(false)),
          onSelect: (id) => this.zone.run(() => this.selected.set(id)),
          onHover: (id) => this.zone.run(() => this.hovered.set(id)),
          onDate: (days) => this.zone.run(() => this.simDays.set(days)),
        },
      );
      this.scene.setPaused(this.paused());
      this.scene.setSpeed(this.speed());
    });
  }

  ngOnDestroy() {
    this.scene?.dispose();
    this.scene = null;
  }

  select(id: BodyId) {
    this.scene?.select(id);
  }

  closePlate() {
    this.scene?.select(null);
  }

  togglePause() {
    const next = !this.paused();
    this.paused.set(next);
    this.scene?.setPaused(next);
  }

  cycleSpeed() {
    const i = this.speedSteps.indexOf(this.speed());
    const next = this.speedSteps[(i + 1) % this.speedSteps.length];
    this.speed.set(next);
    this.scene?.setSpeed(next);
  }

  setSpeed(n: number) {
    this.speed.set(n);
    this.scene?.setSpeed(n);
  }

  toggleOrbits() {
    const next = !this.showOrbits();
    this.showOrbits.set(next);
    this.scene?.setShowOrbits(next);
  }

  toggleLabels() {
    const next = !this.showLabels();
    this.showLabels.set(next);
    this.scene?.setShowLabels(next);
  }

  resetView() {
    this.scene?.resetView();
  }

  jumpToday() {
    this.scene?.jumpToToday();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePause();
    } else if (e.code === 'Escape') {
      if (this.selected()) this.closePlate();
      else this.resetView();
    } else if (e.key === 'r' || e.key === 'R') {
      this.resetView();
    } else if (e.key === '+' || e.key === '=') {
      const i = Math.min(this.speedSteps.length - 1, this.speedSteps.indexOf(this.speed()) + 1);
      this.setSpeed(this.speedSteps[i]);
    } else if (e.key === '-' || e.key === '_') {
      const i = Math.max(0, this.speedSteps.indexOf(this.speed()) - 1);
      this.setSpeed(this.speedSteps[i]);
    } else if (e.key === 'l' || e.key === 'L') {
      this.toggleLabels();
    } else if (e.key === 'o' || e.key === 'O') {
      this.toggleOrbits();
    } else if (e.key === '?') {
      this.helpOpen.update((v) => !v);
    }
  }
}
