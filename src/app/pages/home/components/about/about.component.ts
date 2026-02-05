import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [TranslateModule, CommonModule, RouterModule, MatIconModule],
})
export class AboutComponent {
  cvActivated: boolean = false;

  constructor(public translateService: TranslateService) {}

  openCV() {
    let link: string;
    switch (this.translateService.currentLang) {
      case 'de':
        link = '/assets/benjamin_milcic_cv_de.pdf';
        break;
      case 'hr':
        link = '/assets/benjamin_milcic_cv_en.pdf';
        break;

      default:
        link = '/assets/benjamin_milcic_cv_hr.pdf';
        break;
    }
    window.open(link, '_blank');
  }
}
