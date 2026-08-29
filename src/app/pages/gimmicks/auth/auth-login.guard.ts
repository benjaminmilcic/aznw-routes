import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap, take } from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthLoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    router: RouterStateSnapshot
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.authService.authUser.pipe(
      take(1),
      map((authUser) => {
        return !authUser;
      }),
      tap((isNotAuth) => {
        if (!isNotAuth) {
          // Query-Parameter muessen die Umleitung ueberleben: Nach einer
          // Stripe-Zahlung fuehrt die return_url hierher und traegt ?lang=..
          // sowie payment_intent_client_secret. Die StripeComponent haengt
          // an der Eltern-Route und wird erst NACH dieser Umleitung erzeugt -
          // ohne Weitergabe stuende sie ohne Zahlungsdaten da.
          // (Frueher uebernahm das die ParameterHashLocationStrategy.)
          this.router.navigate(['/gimmicks/auth/main'], {
            queryParams: route.queryParams,
          });
        }
      })
    );
  }
}
