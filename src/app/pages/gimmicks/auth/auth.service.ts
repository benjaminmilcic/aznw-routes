import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, catchError, tap, throwError } from 'rxjs';
import { AuthResponseData, AuthUser } from './auth.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  authUser = new BehaviorSubject<AuthUser>(null);

  private tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) {}

  signup(email: string, password: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs',
        {
          email: email,
          password: password,
          returnSecureToken: true,
        }
      )
      .pipe(
        catchError(this.handleError),
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
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBzuR3T7b8V2iC-K5-0wmfqRxnjWnh8QGs',
        {
          email: email,
          password: password,
          returnSecureToken: true,
        }
      )
      .pipe(
        catchError(this.handleError),
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

  private handleError(errorRes: HttpErrorResponse) {
    let errorMessage = 'An unknown error occured!';
    if (!errorRes.error || !errorRes.error.error) {
      return throwError(() => new Error(errorMessage));
    }
    console.log(errorRes.error.error.message);
    if (
      (<string>errorRes.error.error.message).includes(
        'TOO_MANY_ATTEMPTS_TRY_LATER'
      )
    ) {
      errorMessage =
        'We have blocked all requests from this device due to unusual activity. Try again later.';
    } else if (errorRes.error.error.message === 'EMAIL_EXISTS') {
      errorMessage = 'The email address is already in use by another account.';
    } else if (errorRes.error.error.message === 'INVALID_LOGIN_CREDENTIALS') {
      errorMessage =
        'Diese E-Mail ist nicht registriert oder das Passwort ist falsch.';
    }

    return throwError(() => new Error(errorMessage));
  }
}
