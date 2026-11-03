import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  DOCUMENT,
  NgZone,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, Subscription, take } from 'rxjs';
import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { ChartsHelperService } from './pages/gimmicks/charts/charts-helper.service';
import { AuthService } from './pages/gimmicks/auth/auth.service';
import { SeoService } from './seo/seo.service';
import { ScrollbarThemeService } from './services/scrollbar-theme.service';
import { environment } from '../environments/environment';
import { NavbarComponent } from './navbar/navbar.component';
import { MapService } from './pages/gimmicks/map/map.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrollToTopComponent, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  appLoaded = false;
  private routerSub?: Subscription;
  /** Ends the position correction of the last fragment scroll (see scrollToFragment) */
  private stopFragmentAlign?: () => void;
  private langChangeSub?: Subscription;
  private previousRoute = '';
  private mapsScript?: HTMLScriptElement;
  private readonly googleMapsScriptId = 'google-maps-script';
  private readonly googleMapsCallbackName = 'initGoogleMaps';
  private currentMapsLanguage?: string;
  private googleMapsLoadVersion = 0;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.chartsHelperService.detectChanges.next();
  }
  private document = inject(DOCUMENT);

  constructor(
    private translate: TranslateService,
    private chartsHelperService: ChartsHelperService,
    private authService: AuthService,
    private seoService: SeoService,
    private scrollbarThemeService: ScrollbarThemeService,
    private router: Router,
    private mapService: MapService,
    private ngZone: NgZone,
  ) {
    translate.setDefaultLang('de');
    const language = navigator.language || (navigator as any).userLanguage;
    let translateLanguage = 'de';
    switch (language) {
      case 'de-DE':
      case 'de-AT':
      case 'de-CH':
      case 'de-LU':
      case 'de-LI':
      case 'de-BE':
      case 'de':
        translateLanguage = 'de';
        break;
      case 'hr-HR':
      case 'bs-BA':
      case 'sr-RS':
      case 'sr-ME':
      case 'cnr-ME':
      case 'sr-Latn-RS':
      case 'sr-Cyrl-RS':
        translateLanguage = 'hr';
        break;

      default:
        translateLanguage = 'en';
        break;
    }
    translate.use(translateLanguage);
    this.loadGoogleMapsScript(translateLanguage);
  }

  ngOnInit(): void {
    this.langChangeSub = this.translate.onLangChange.subscribe(({ lang }) => {
      if (lang !== this.currentMapsLanguage) {
        this.mapService.saveMapTypeId$.next();
        this.reloadGoogleMapsScript(lang);
      }
    });
    // Sets title, description and canonical per route and on language change.
    this.seoService.init();
    // Scrollbars in the color of the current page
    this.scrollbarThemeService.init();
    this.authService.autoLogin();

    // Hide the loading animation only once the first route has finished loading
    // (including the lazy chunk of the HomeComponent)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      )
      .subscribe(() => {
        this.appLoaded = true;
        this.hideLoader();
      });

    // Handle fragment scrolling on navigation (including browser back/forward)
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;

        // Extract route path (before any fragment)
        const routePath = url.split('#')[0] || '/';
        // Extract fragment from URL (e.g. /#portfolio)
        const fragmentMatch = url.match(/#([^#]+)$/);
        const fragment = fragmentMatch ? fragmentMatch[1] : null;

        // Check if we navigated to a different route
        const routeChanged = this.previousRoute !== routePath;
        const prevRoute = this.previousRoute;
        this.previousRoute = routePath;

        this.stopFragmentAlign?.();
        if (fragment) {
          // Small delay to ensure DOM is ready after navigation
          setTimeout(() => this.scrollToFragment(fragment), 100);
        } else if (routeChanged) {
          // Skip scroll-to-top for auth child route transitions (login <-> main)
          const isAuthChildNav =
            prevRoute.startsWith('/gimmicks/auth/') &&
            routePath.startsWith('/gimmicks/auth/');
          if (!isAuthChildNav) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
  }

  /**
   * Scrolls the section below the navbar. On the first visit of the home page, images and sections above the target
   * are still loading and push it down after the scroll – so the position is corrected while the layout keeps
   * changing, until it has been quiet for a moment, the visitor scrolls or clicks themselves, or a time limit is hit.
   */
  private scrollToFragment(fragment: string): void {
    const element = document.getElementById(fragment);
    if (!element) return;
    const navbarOffset = 70;
    const target = () => element.getBoundingClientRect().top + window.scrollY - navbarOffset;
    let lastTarget = target();
    window.scrollTo({ top: lastTarget, behavior: 'smooth' });

    // Checked every frame: the html and body elements have a fixed height, so a ResizeObserver would not notice
    // the content growing
    const userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    const quietMs = 2500;
    const startedAt = performance.now();
    let changedAt = startedAt;
    let frame = 0;
    const check = (now: number) => {
      const newTarget = target();
      if (Math.abs(newTarget - lastTarget) >= 1) {
        lastTarget = newTarget;
        changedAt = now;
        window.scrollTo({ top: newTarget, behavior: 'smooth' });
      }
      if (now - changedAt > quietMs || now - startedAt > 10_000) stop();
      else frame = requestAnimationFrame(check);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      userEvents.forEach((name) => window.removeEventListener(name, stop));
      if (this.stopFragmentAlign === stop) this.stopFragmentAlign = undefined;
    };
    frame = requestAnimationFrame(check);
    userEvents.forEach((name) => window.addEventListener(name, stop, { passive: true }));
    this.stopFragmentAlign = stop;
  }

  ngOnDestroy(): void {
    this.stopFragmentAlign?.();
    this.routerSub?.unsubscribe();
    this.langChangeSub?.unsubscribe();
  }

  private hideLoader(): void {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.classList.add('loaded');
      // Remove the element completely after the fade-out animation
      setTimeout(() => {
        loader.remove();
      }, 500);
    }
  }

  private suppressGoogleMapsReloadWarnings(): void {
    if ((window as any).__googleMapsWarningSuppressed) return;
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('already defined') && msg.includes('gmp-')) return;
      originalWarn(...args);
    };
    (window as any).__googleMapsWarningSuppressed = true;
  }

  private loadGoogleMapsScript(language: string): void {
    const loadVersion = ++this.googleMapsLoadVersion;

    this.currentMapsLanguage = language;
    this.mapService.mapsReady = false;

    (window as any)[this.googleMapsCallbackName] = () =>
      this.ngZone.run(() => {
        if (loadVersion === this.googleMapsLoadVersion) {
          this.mapService.mapsReady = true;
        }
      });

    const script = this.document.createElement('script');
    script.id = this.googleMapsScriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?libraries=places,drawing,geometry&key=${environment.googleMaps.apiKey}&loading=async&callback=${this.googleMapsCallbackName}&language=${language}`;
    script.async = true;
    script.defer = true;

    this.mapsScript = script;
    this.document.head.appendChild(script);
  }

  private reloadGoogleMapsScript(language: string): void {
    this.suppressGoogleMapsReloadWarnings();
    this.mapService.mapsReady = false;
    this.mapsScript?.remove();
    this.document.getElementById(this.googleMapsScriptId)?.remove();
    delete (window as any).google;

    this.loadGoogleMapsScript(language);
  }
}
