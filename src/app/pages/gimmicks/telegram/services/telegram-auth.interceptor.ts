import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TelegramService } from './telegram.service';
import { environment } from '../../../../../environments/environment';

@Injectable()
export class TelegramAuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly router: Router,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isTelegramApi = req.url.startsWith(environment.telegram.apiUrl);
    // Logout-Endpoint ausnehmen, um Endlosschleifen zu vermeiden
    const isLogout = req.url.includes('/auth/logout');

    if (!isTelegramApi || isLogout) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.telegramService.clearSession();
          this.router.navigate(['/gimmicks/telegram/login']);
        }
        return throwError(() => error);
      }),
    );
  }
}
