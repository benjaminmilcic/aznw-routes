import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { IonSpinner } from '@ionic/angular/standalone';
import { Observable } from 'rxjs';
import { AuthResponseData } from '../auth.model';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-auth',
    imports: [
        IonSpinner,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        CommonModule,
        TranslateModule,
    ],
    templateUrl: './auth-login.component.html',
    styleUrl: './auth-login.component.css'
})
export class AuthLoginComponent implements OnInit {
  isLoginMode = true;
  isLoading = false;
  error: string = null;
  @ViewChild('emailInput') emailInput: ElementRef;
  @ViewChild('passwordInput') passwordInput: ElementRef;
  @ViewChild('emailInput2') emailInput2: ElementRef;
  @ViewChild('passwordInput2') passwordInput2: ElementRef;
  @ViewChild('confirmInput') confirmInput: ElementRef;
  passwordError: string = null;
  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {}
  ngOnInit() {}

  onSwitchMode() {
    this.error = null;
    this.passwordError = null;
    this.isLoginMode = !this.isLoginMode;
  }

  onLogin(form: NgForm) {
    if (form.controls['email'].invalid) {
      this.emailInput.nativeElement.focus();
      this.emailInput.nativeElement.blur();
    }
    if (form.controls['password'].invalid) {
      this.passwordInput.nativeElement.focus();
      this.passwordInput.nativeElement.blur();
    }
  }

  onSignUp(form: NgForm) {
    this.passwordError = null;
    if (form.controls['email'].invalid) {
      this.emailInput2.nativeElement.focus();
      this.emailInput2.nativeElement.blur();
    }
    if (form.controls['password'].invalid) {
      this.passwordInput2.nativeElement.focus();
      this.passwordInput2.nativeElement.blur();
      this.passwordError = this.translate.instant(
        'gimmicks.jokes.password6Char'
      );
    }
    if (form.controls['confirmPassword'].invalid) {
      this.confirmInput.nativeElement.focus();
      this.confirmInput.nativeElement.blur();
    }
  }

  onSubmit(form: NgForm) {
    if (!form.valid) {
      return;
    }
    const email = form.value.email;
    const password = form.value.password;
    const confirmPassword = form.value.confirmPassword;

    let authObs: Observable<AuthResponseData>;

    this.isLoading = true;
    if (this.isLoginMode) {
      authObs = this.authService.login(email, password);
    } else {
      if (password === confirmPassword) {
        authObs = this.authService.signup(email, password);
      } else {
        this.error = this.translate.instant(
          'gimmicks.jokes.passwordsDontMatch'
        );
        this.isLoading = false;
        return;
      }
    }
    authObs.subscribe(
      (resData) => {
        this.isLoading = false;
        this.router.navigate(['/gimmicks/auth/main']);
      },
      (error) => {
        console.log(error);
        let errorMessage = this.translate.instant(
          'gimmicks.jokes.unknownError'
        );
        if (
          (<string>error.error.error.message).includes(
            'Too many failed login attempts. Try again in 5 minutes.'
          )
        ) {
          errorMessage = this.translate.instant(
            'gimmicks.jokes.requestBlocked'
          );
        } else if (error.error.error.message === 'EMAIL_EXISTS') {
          errorMessage = this.translate.instant('gimmicks.jokes.emailExists');
        } else if (error.error.error.message === 'INVALID_LOGIN_CREDENTIALS') {
          errorMessage = this.translate.instant(
            'gimmicks.jokes.invalidCredentials'
          );
        }
        this.error = errorMessage;
        this.isLoading = false;
      }
    );
    form.reset();
  }

  onGoogleLogin() {
    window.location.href = environment.googleLogin.loginApi;
  }
}
