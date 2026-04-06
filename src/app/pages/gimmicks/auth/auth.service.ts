import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, catchError, tap, throwError } from 'rxjs';
import { AuthResponseData, AuthUser } from './auth.model';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  authUser = new BehaviorSubject<AuthUser>(null);

  private tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) {}

  signup(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(environment.auth.signup, {
        email: email,
        password: password,
        returnSecureToken: true,
      })
      .pipe(
        tap((resData) => {
          this.handleAuthentication(
            resData.email,
            resData.localId,
            resData.idToken,
            +resData.expiresIn
          );
        })
      );
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(environment.auth.login, {
        email: email,
        password: password,
        returnSecureToken: true,
      })
      .pipe(
        tap((resData) => {
          this.handleAuthentication(
            resData.email,
            resData.localId,
            resData.idToken,
            +resData.expiresIn
          );
        })
      );
  }

  autoLogin() {
    const authUserData: {
      email: string;
      id: string;
      _token: string;
      _tokenExpirationDate: string;
    } = JSON.parse(localStorage.getItem('authUserData'));
    if (!authUserData) {
      return;
    }
    const loadedAuthUser = new AuthUser(
      authUserData.email,
      authUserData.id,
      authUserData._token,
      new Date(authUserData._tokenExpirationDate)
    );

    if (loadedAuthUser.token) {
      this.authUser.next(loadedAuthUser);
      const expirationDuration =
        new Date(authUserData._tokenExpirationDate).getTime() -
        new Date().getTime();
      this.autoLogout(expirationDuration);
    }
  }

  logout() {
    this.authUser.next(null);
    this.router.navigate(['/gimmicks/auth/login']);
    localStorage.removeItem('authUserData');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;
  }

  autoLogout(expirationDuration: number) {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  private handleAuthentication(
    email: string,
    userId: string,
    token: string,
    expiresIn: number
  ) {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    const authUser = new AuthUser(email, userId, token, expirationDate);
    this.authUser.next(authUser);
    this.autoLogout(expiresIn * 1000);
    localStorage.setItem('authUserData', JSON.stringify(authUser));
  }

  setUserFromToken(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.email || !payload.sub || !payload.exp) {
        throw new Error('Missing required token claims');
      }
      // Signature validation is not possible client-side (secret stays on server).
      // The backend AuthGuard verifies the signature on every request.
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn <= 0) {
        throw new Error('Token already expired');
      }
      this.handleAuthentication(payload.email, payload.sub, token, expiresIn);
    } catch (err) {
      console.error('Invalid token payload');
      this.authUser.next(null);
    }
  }
}
