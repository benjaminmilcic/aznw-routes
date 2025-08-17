import { Component, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateSendButtonService } from '../home/components/shared/translate-send-button.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    imports: [TranslateModule, CommonModule, RouterModule, MatMenuModule, MatButtonModule]
})
export class SidebarComponent implements OnInit {
  sidebarActivated: boolean = false;

  language: string = this.translate.currentLang;

  constructor(
    private translate: TranslateService,
    private translateSendButtonService: TranslateSendButtonService
  ) {}

  ngOnInit(): void {
    this.translate.onLangChange.subscribe(
      () => (this.language = this.translate.currentLang)
    );
  }

  onToggleSidebar(event: Event | null) {
    if (event) {
      event.preventDefault();
    }

    this.sidebarActivated = !this.sidebarActivated;

    // this is necessary because ngClass does not work with FontAwesome CSS Libary
    // Next time better use FontAwesome Angular Package
    const menuClosed = document.body.querySelector('.fa-bars.menu-button');
    const menuOpen = document.body.querySelector('.fa-xmark.menu-button');
    if (menuClosed) {
      menuClosed.classList.remove('fa-bars');
      menuClosed.classList.add('fa-xmark');
    }
    if (menuOpen) {
      menuOpen.classList.remove('fa-xmark');
      menuOpen.classList.add('fa-bars');
    }
  }

  onClick(target: string = '#') {
    this.onToggleSidebar(null);
  }

  toggleLanguage(language:string) {
    this.language = language;
    this.translate.use(this.language);
    this.translateSendButtonService.translateSendButton.next();
  }
}
