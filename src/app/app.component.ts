import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, Subscription, take } from 'rxjs';
import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';
import { ChartsHelperService } from './pages/gimmicks/charts/charts-helper.service';
import { AuthService } from './pages/gimmicks/auth/auth.service';
import { Meta, Title } from '@angular/platform-browser';
import { AnalyticsService } from './services/analytics.service';
import { environment } from '../environments/environment';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ScrollToTopComponent,
    NavbarComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  appLoaded = false;
  private routerSub?: Subscription;
  private previousRoute = '';

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.chartsHelperService.detectChanges.next();
  }
  constructor(
    private translate: TranslateService,
    private chartsHelperService: ChartsHelperService,
    private authService: AuthService,
    private meta: Meta,
    private title: Title,
    private analyticsService: AnalyticsService,
    private router: Router,
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
  }

  ngOnInit(): void {
    this.title.setTitle('Benjamin Milčić - Full Stack Web Developer');
    this.meta.updateTag({
      name: 'description',
      content:
        'Passionate developer with a focus on modern web technologies. I transform ideas into elegant, functional solutions. Core competencies: Angular, Ionic and NestJS',
    });
    this.authService.autoLogin();

    // Analytics-Tracking beim App-Start initialisieren
    if (environment.production) {
      this.analyticsService.initTracking();
    }

    // Ladeanimation erst ausblenden, wenn die erste Route fertig geladen ist
    // (inkl. Lazy-Chunk des HomeComponent)
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      take(1)
    ).subscribe(() => {
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
        // Extract fragment from URL (handles hash routing with fragments like /#/#portfolio)
        const fragmentMatch = url.match(/#([^#]+)$/);
        const fragment = fragmentMatch ? fragmentMatch[1] : null;

        // Check if we navigated to a different route
        const routeChanged = this.previousRoute !== routePath;
        const prevRoute = this.previousRoute;
        this.previousRoute = routePath;

        if (fragment) {
          // Small delay to ensure DOM is ready after navigation
          setTimeout(() => {
            const element = document.getElementById(fragment);
            if (element) {
              const navbarOffset = 70;
              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({
                top: elementPosition - navbarOffset,
                behavior: 'smooth'
              });
            }
          }, 100);
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

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private hideLoader(): void {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.classList.add('loaded');
      // Element nach der Fade-Out-Animation komplett entfernen
      setTimeout(() => {
        loader.remove();
      }, 500);
    }
  }
}
