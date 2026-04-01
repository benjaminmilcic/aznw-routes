import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TelegramService } from '../services/telegram.service';

export const TelgramAuthGuard: CanActivateFn = async () => {
  const telegramService = inject(TelegramService);
  const router = inject(Router);

  if (telegramService.authenticated()) {
    return true;
  }

  try {
    const status = await telegramService.checkAuthStatus();
    if (status.authenticated) {
      return true;
    }
  } catch {}

  router.navigate(['/gimmicks/telegram/login']);
  return false;
};
