import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
    selector: 'app-analog-clock',
    imports: [],
    templateUrl: './analog-clock.component.html',
    styleUrl: './analog-clock.component.css'
})
export class AnalogClockComponent implements OnInit {
  @ViewChild('hrHand') hrHand: ElementRef;
  @ViewChild('minHand') minHand: ElementRef;
  @ViewChild('secHand') secHand: ElementRef;

  ngOnInit(): void {
    setInterval(() => {
      const date = new Date();
      this.updateClock(date);
    }, 1000);
  }

  updateClock(date: Date) {
    this.secHand.nativeElement.style.transform =
      'rotate(' + date.getSeconds() * 6 + 'deg';
    this.minHand.nativeElement.style.transform =
      'rotate(' + date.getMinutes() * 6 + 'deg';
    this.hrHand.nativeElement.style.transform =
      'rotate(' + (date.getHours() * 30 + date.getMinutes() * 0.5) + 'deg';
  }
}
