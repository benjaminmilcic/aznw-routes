import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VisitorData {
  sessionId: string;
  timestamp: string;
  userAgent: string;
  language: string;
  languages: readonly string[];
  platform: string;
  screenResolution: {
    width: number;
    height: number;
  };
  viewportSize: {
    width: number;
    height: number;
  };
  timezone: string;
  timezoneOffset: number;
  cookiesEnabled: boolean;
  referrer: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  online: boolean;
}

export interface PageViewData {
  sessionId: string;
  route: string;
  timestamp: string;
  referrer?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly ANALYTICS_API_URL = environment.analytics.sendData;
  private readonly PAGE_VIEW_API_URL = `${environment.analytics.sendData.replace('/visitor-data', '/page-view')}`;
  private readonly SESSION_ID_KEY = 'analytics_session_id';
  private sessionId: string;
  private lastRoute: string = '';

  constructor(private http: HttpClient, private router: Router) {
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Generiert oder lädt eine bestehende Session-ID
   * Verwendet sessionStorage, damit jeder neue Tab/Window eine neue Session bekommt
   */
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);

    if (!sessionId) {
      // Generiere UUID v4
      sessionId = this.generateUUID();
      sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);
    }

    return sessionId;
  }

  /**
   * Generiert eine UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sammelt verfügbare Besucherdaten
   */
  collectVisitorData(): VisitorData {
    const data: VisitorData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height,
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      cookiesEnabled: navigator.cookieEnabled,
      referrer: document.referrer,
      online: navigator.onLine,
    };

    // Optional: Weitere Daten, falls verfügbar
    if ('deviceMemory' in navigator) {
      data.deviceMemory = (navigator as any).deviceMemory;
    }

    if ('hardwareConcurrency' in navigator) {
      data.hardwareConcurrency = navigator.hardwareConcurrency;
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        data.connectionType = connection.effectiveType;
      }
    }

    return data;
  }

  /**
   * Sendet die gesammelten Daten an die API
   */
  sendVisitorData(): void {
    const visitorData = this.collectVisitorData();

    // HTTP POST an die Dummy-API
    this.http.post(this.ANALYTICS_API_URL, visitorData).subscribe({
      next: (response) => {
        // Daten erfolgreich gesendet
      },
      error: (error) => {
        // Fehler werden stillschweigend ignoriert, damit die App normal weiterläuft
      }
    });
  }

  /**
   * Sendet PageView-Daten an die API
   */
  private sendPageView(route: string, referrer?: string): void {
    const pageViewData: PageViewData = {
      sessionId: this.sessionId,
      route: route,
      timestamp: new Date().toISOString(),
      referrer: referrer,
    };

    this.http.post(this.PAGE_VIEW_API_URL, pageViewData).subscribe({
      next: (response) => {
        // PageView erfolgreich gesendet
      },
      error: (error) => {
        // Fehler werden stillschweigend ignoriert
      }
    });
  }

  /**
   * Trackt einen PageView
   */
  private trackPageView(url: string): void {
    const referrer = this.lastRoute || undefined;
    this.sendPageView(url, referrer);
    this.lastRoute = url;
  }

  /**
   * Initialisiert das Analytics-Tracking
   * Sollte beim App-Start aufgerufen werden
   */
  initTracking(): void {
    // Daten direkt beim Start senden
    this.sendVisitorData();

    // Router-Events abonnieren für PageView-Tracking
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }
}
