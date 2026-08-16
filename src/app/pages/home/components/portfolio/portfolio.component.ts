import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from '../../home.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
  imports: [TranslateModule, RouterModule, MatIconModule],
})
export class PortfolioComponent {
  constructor(
    public homeService: HomeService,
    public translate: TranslateService,
    private router: Router,
  ) {}

  get gameCollectionImage(): string {
    const lang = this.translate.currentLang;
    const supported = ['de', 'en', 'hr'];
    const suffix = supported.includes(lang) ? lang : 'en';
    return `assets/game-collection-${suffix}.webp`;
  }

  get gimmicksImage(): string {
    const lang = this.translate.currentLang;
    const supported = ['de', 'en', 'hr'];
    const suffix = supported.includes(lang) ? lang : 'en';
    return `assets/gimmicks-${suffix}.webp`;
  }

  closeDialog(dialog: HTMLDialogElement) {
    dialog.close();
    this.router.navigate(['/'], { fragment: 'portfolio' });
  }

  openDialog(dialog: HTMLDialogElement) {
    dialog.showModal();
    this.homeService.overflowHidden = true;

    dialog.addEventListener(
      'close',
      () => {
        this.homeService.overflowHidden = false;
      },
      { once: true },
    );
  }
}
