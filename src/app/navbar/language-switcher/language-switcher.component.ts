import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TranslateSendButtonService } from '../../pages/home/components/shared/translate-send-button.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-language-switcher',
  imports: [MatMenuModule, CommonModule,MatButtonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css',
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  language: string = this.translate.currentLang;
  langChangeSub: Subscription;

  constructor(
    private translate: TranslateService,
    private translateSendButtonService: TranslateSendButtonService,
  ) {}

  ngOnInit(): void {
    this.langChangeSub = this.translate.onLangChange.subscribe(
      () => (this.language = this.translate.currentLang),
    );
  }

  toggleLanguage(language: string) {
    this.language = language;
    this.translate.use(this.language);
    this.translateSendButtonService.translateSendButton.next();
  }

  ngOnDestroy(): void {
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
  }
}
