import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface VisitorData {
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

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly ANALYTICS_API_URL = environment.analytics.sendData;

  constructor(private http: HttpClient) {}

  /**
   * Sammelt alle verfügbaren Besucherdaten ohne Genehmigung
   */
  collectVisitorData(): VisitorData {
    const data: VisitorData = {
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
   * Initialisiert das Analytics-Tracking
   * Sollte beim App-Start aufgerufen werden
   */
  initTracking(): void {
    // Daten direkt beim Start senden
    this.sendVisitorData();
  }
}
