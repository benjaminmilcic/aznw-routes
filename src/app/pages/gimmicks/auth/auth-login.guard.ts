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
          // Query parameters must survive the redirect: after a
          // Stripe payment the return_url leads here and carries ?lang=..
          // as well as payment_intent_client_secret. The StripeComponent hangs
          // on the parent route and is only created AFTER this redirect -
          // without passing them on it would have no payment data.
          // (This used to be done by the ParameterHashLocationStrategy.)
          this.router.navigate(['/gimmicks/auth/main'], {
            queryParams: route.queryParams,
          });
        }
      })
    );
  }
}
