import { Component, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HomeService } from '../../home.service';

@Component({
    selector: 'app-portfolio',
    templateUrl: './portfolio.component.html',
    styleUrls: ['./portfolio.component.css'],
    imports: [TranslateModule, RouterModule]
})
export class PortfolioComponent {
  constructor(public homeService: HomeService, private router: Router) {}

  closeDialog(dialog: HTMLDialogElement) {
    dialog.close();
    this.homeService.overflowHidden = false;
    this.router.navigate(['/'], { fragment: 'portfolio' });
  }
  
  openDialog(dialog: HTMLDialogElement) {
    dialog.showModal();
    this.homeService.overflowHidden = true;
  }
}
