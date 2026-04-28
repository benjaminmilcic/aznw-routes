import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GimmicksOverviewSetting } from './overview.types';
import { gimmicksOverViewSettings } from './overview.constants';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-overview',
  imports: [
    RouterModule,
    TranslateModule,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
    FormsModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  isTouchDevice: boolean;
  settings: GimmicksOverviewSetting[] = gimmicksOverViewSettings;
  infoOpen = false;

  constructor(
    public translateService: TranslateService,
    private router: Router
  ) {
    this.isTouchDevice = this.detectPureTouchDevice();
  }

  toggleInfo(event: Event) {
    event.stopPropagation();
    this.infoOpen = !this.infoOpen;
  }

  @HostListener('document:click')
  closeInfo() {
    this.infoOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeInfoOnEscape() {
    this.infoOpen = false;
  }

  getPanelBackground(red: number, green: number, blue: number, opacity: number): string {
    const alpha = (opacity / 255).toFixed(2);
    const r2 = Math.round(red * 0.5);
    const g2 = Math.round(green * 0.5);
    const b2 = Math.round(blue * 0.5);
    return `linear-gradient(165deg, rgba(${red},${green},${blue},${alpha}) 0%, rgba(${r2},${g2},${b2},0.85) 50%, #1e3a8a 100%)`;
  }

  getDoorNum(goToPage: string, index: number): string {
    const key = goToPage.split('/').pop() ?? '';
    return `/${key} · ${String(index + 1).padStart(2, '0')}`;
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
    return hasTouch && coarsePointer && noMouse;
  }

  playAudio(index: number) {
    if (this.settings[index].playAudio) {
      let audio = new Audio();
      audio.src = 'assets/audio/creaking-door.mp3';
      audio.load();
      audio.play();
    }
  }
}
