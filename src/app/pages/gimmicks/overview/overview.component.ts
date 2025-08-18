import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GimmicksOverviewSetting } from './overview.types';
import { gimmicksOverViewSettings } from './overview.constants';

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
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements AfterViewInit {
  isTouchDevice: boolean;
  settings: GimmicksOverviewSetting[] = gimmicksOverViewSettings;
  @ViewChild('doors') doors!: ElementRef<HTMLDivElement>;

  constructor(
    public translateService: TranslateService,
    private router: Router
  ) {
    this.isTouchDevice = this.detectPureTouchDevice();
  }

  ngAfterViewInit(): void {
    this.settings.forEach((element, elementIndex) => {
      this.changeColor(elementIndex);
    });
  }

  toHexColor(
    red: number,
    green: number,
    blue: number,
    opacity: number
  ): string {
    const clamp = (val: number) => Math.max(0, Math.min(255, val)); // Werte 0–255 absichern
    const r = clamp(red).toString(16).padStart(2, '0');
    const g = clamp(green).toString(16).padStart(2, '0');
    const b = clamp(blue).toString(16).padStart(2, '0');
    const o = clamp(opacity).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${o}`;
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

  changeColor(index: number) {
    let element = this.settings[index];
    element.hex = this.toHexColor(
      element.red,
      element.green,
      element.blue,
      element.opacity
    );
    (
      this.doors.nativeElement.children[index].children[1] as HTMLElement
    ).style.background = `linear-gradient(to bottom, ${element.hex}, #2563eb)`;
  }

  private detectPureTouchDevice(): boolean {
    const hasTouch = navigator.maxTouchPoints > 0;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const noMouse = !window.matchMedia('(any-hover: hover)').matches;

    // Nur Touchgeräte, die keine Maus oder Präzisionseingabe haben
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
