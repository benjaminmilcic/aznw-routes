import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateSendButtonService } from '../pages/home/components/shared/translate-send-button.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [
    TranslateModule,
    CommonModule,
    RouterModule,
    MatMenuModule,
    MatButtonModule,
  ],
})
export class SidebarComponent implements OnInit {
  sidebarActivated: boolean = false;

  language: string = this.translate.currentLang;

  @ViewChild(MatMenuTrigger) languageMenuTrigger!: MatMenuTrigger;
  @ViewChild('sidebarWrapper') sidebarWrapper!: ElementRef;

  constructor(
    private translate: TranslateService,
    private translateSendButtonService: TranslateSendButtonService,
  ) {}

  ngOnInit(): void {
    this.translate.onLangChange.subscribe(
      () => (this.language = this.translate.currentLang),
    );
  }

  onToggleSidebar(event: Event | null) {
    if (event) {
      event.preventDefault();
    }

    // Close language menu if open when closing sidebar
    if (this.sidebarActivated && this.languageMenuTrigger) {
      this.languageMenuTrigger.closeMenu();
    }

    this.sidebarActivated = !this.sidebarActivated;

    // Reset scroll position when opening sidebar
    if (this.sidebarActivated && this.sidebarWrapper) {
      setTimeout(() => {
        this.sidebarWrapper.nativeElement.scrollTop = 0;
      }, 0);
    }

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

  onClick() {
    this.onToggleSidebar(null);
  }

  toggleLanguage(language: string) {
    this.language = language;
    this.translate.use(this.language);
    this.translateSendButtonService.translateSendButton.next();

    // Close sidebar after language change
    if (this.sidebarActivated) {
      this.onToggleSidebar(null);
    }
  }
}
