import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-overview',
    imports: [RouterModule, TranslateModule, CommonModule],
    templateUrl: './overview.component.html',
    styleUrl: './overview.component.css'
})
export class OverviewComponent {
  isTouchDevice: boolean;
  constructor(
    public translateService: TranslateService,
    private router: Router
  ) {
    this.isTouchDevice = this.detectPureTouchDevice();
  }

  goToPage(link: any) {
    if (this.isTouchDevice) {
      setTimeout(() => {
        this.router.navigate(link);
      }, 1000);
    } else {
      this.router.navigate(link);
    }
  }

  private detectPureTouchDevice(): boolean {
    const hasTouch = navigator.maxTouchPoints > 0;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const noMouse = !window.matchMedia('(any-hover: hover)').matches;

    // Nur Touchgeräte, die keine Maus oder Präzisionseingabe haben
    return hasTouch && coarsePointer && noMouse;
  }
}
