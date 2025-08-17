import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-skills',
    templateUrl: './skills.component.html',
    styleUrls: ['./skills.component.css'],
    imports: [TranslateModule, RouterModule, MatTooltipModule, CommonModule]
})
export class SkillsComponent {
  constructor(public translateService: TranslateService) {}

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
