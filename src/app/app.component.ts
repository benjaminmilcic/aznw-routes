import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { ScrollToTopComponent } from './pages/scroll-to-top/scroll-to-top.component';
import { ChartsHelperService } from './pages/gimmicks/charts/charts-helper.service';
import { AuthService } from './pages/gimmicks/auth/auth.service';
import { Meta, Title } from '@angular/platform-browser';
import { AnalyticsService } from './services/analytics.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, ScrollToTopComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
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
    private analyticsService: AnalyticsService
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
  }
}
