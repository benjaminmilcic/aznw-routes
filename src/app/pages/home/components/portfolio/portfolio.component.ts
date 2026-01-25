import { Component, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from '../../home.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
  imports: [TranslateModule, RouterModule, CommonModule, MatIconModule],
})
export class PortfolioComponent {
  constructor(
    public homeService: HomeService,
    private router: Router,
    public translateService: TranslateService
  ) {}

  closeDialog(dialog: HTMLDialogElement) {
    dialog.close();
    this.router.navigate(['/'], { fragment: 'portfolio' });
  }

  openDialog(dialog: HTMLDialogElement) {
    dialog.showModal();
    this.homeService.overflowHidden = true;

    dialog.addEventListener('close', () => {
      this.homeService.overflowHidden = false;
    }, { once: true });
  }
}
