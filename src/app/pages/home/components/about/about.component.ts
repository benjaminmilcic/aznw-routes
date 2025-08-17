import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.css'],
    imports: [TranslateModule, CommonModule, RouterModule]
})
export class AboutComponent {
  cvActivated: boolean = false;

  

  constructor(public translateService: TranslateService) {}

  toggleCv(event: Event | null) {
    if (event) {
      event.preventDefault();
    }

    this.cvActivated = !this.cvActivated;
  }
}
