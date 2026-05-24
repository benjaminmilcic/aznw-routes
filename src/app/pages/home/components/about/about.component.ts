import { Component } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [TranslateModule, RouterModule, MatTooltipModule],
})
export class AboutComponent {
  constructor(public translateService: TranslateService) {}

  openCV() {
    let link: string;
    switch (this.translateService.currentLang) {
      case 'de':
        link = '/assets/benjamin_milcic_cv_de.pdf';
        break;
      case 'hr':
        link = '/assets/benjamin_milcic_cv_hr.pdf';
        break;
      default:
        link = '/assets/benjamin_milcic_cv_en.pdf';
        break;
    }
    window.open(link, '_blank');
  }
}
