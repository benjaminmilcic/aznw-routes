import { Component, signal, ElementRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TelegramService } from '../../services/telegram.service';
import { LoginStep } from '../../models/telegram-interfaces';

@Component({
  selector: 'app-telegram-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    TranslateModule,
  ],
  templateUrl: './telegram-login.component.html',
  styleUrl: './telegram-login.component.scss',
})
export class TelegramLoginComponent {
  readonly step = signal<LoginStep>('credentials');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly otpInputs = viewChildren<ElementRef>('otpInput');

  phoneNumber = '';
  phoneCode = '';
  password = '';
  otpDigits = ['', '', '', '', ''];

  constructor(
    private readonly telegramService: TelegramService,
    private readonly router: Router,
    private readonly translate: TranslateService,
  ) {}

  async sendCode(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.telegramService.sendCode(this.phoneNumber);
      this.step.set('code');
      this.resetOtp();
      setTimeout(() => this.otpInputs()[0]?.nativeElement.focus());
    } catch (err: any) {
      this.error.set(
        err.error?.message || err.message || this.translate.instant('gimmicks.telegram.login.errorSendCode'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  async signIn(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const result = await this.telegramService.signIn(
        this.phoneNumber,
        this.phoneCode,
      );
      if (result.status === '2fa_required') {
        this.step.set('2fa');
      } else {
        this.router.navigate(['/gimmicks/telegram/chat']);
      }
    } catch (err: any) {
      this.error.set(err.error?.message || err.message || this.translate.instant('gimmicks.telegram.login.wrongCode'));
      this.resetOtp();
      setTimeout(() => this.otpInputs()[0]?.nativeElement.focus());
    } finally {
      this.loading.set(false);
    }
  }

  onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    this.otpDigits[index] = value ? value[0] : '';
    input.value = this.otpDigits[index];
    this.phoneCode = this.otpDigits.join('');

    if (value && index < 4) {
      this.otpInputs()[index + 1].nativeElement.focus();
    }

    if (this.phoneCode.length === 5) {
      this.signIn();
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prev = this.otpInputs()[index - 1].nativeElement;
      prev.focus();
      prev.select();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste =
      event.clipboardData?.getData('text')?.replace(/\D/g, '') || '';
    const inputs = this.otpInputs();
    for (let i = 0; i < 5; i++) {
      this.otpDigits[i] = i < paste.length ? paste[i] : '';
      inputs[i].nativeElement.value = this.otpDigits[i];
    }
    this.phoneCode = this.otpDigits.join('');
    inputs[Math.min(paste.length, 4)].nativeElement.focus();

    if (this.phoneCode.length === 5) {
      this.signIn();
    }
  }

  private resetOtp(): void {
    this.otpDigits.fill('');
    this.phoneCode = '';
    this.otpInputs().forEach((input) => (input.nativeElement.value = ''));
  }

  async signIn2FA(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.telegramService.signIn2FA(this.password);
      this.router.navigate(['/gimmicks/telegram/chat']);
    } catch (err: any) {
      this.error.set(err.error?.message || err.message || this.translate.instant('gimmicks.telegram.login.wrongPassword'));
    } finally {
      this.loading.set(false);
    }
  }
}
