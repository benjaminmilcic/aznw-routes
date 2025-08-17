import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-print-schedule',
    imports: [CommonModule],
    templateUrl: './print-schedule.component.html',
    styleUrl: './print-schedule.component.css'
})
export class PrintScheduleComponent implements OnInit {
  printDate: string[];
  day: number;
  month: string;
  year: number;
  hours = null;
  hoursKeys = [];

  constructor(route: ActivatedRoute, private router: Router) {
    this.printDate = route.snapshot.params['printDate'].split('.');
    this.day = +this.printDate[0];
    this.month = this.printDate[1];
    this.year = +this.printDate[2];
  }

  ngOnInit() {
    const localStorageDay = localStorage.getItem('print');
    if (localStorageDay) {
      this.hours = JSON.parse(localStorageDay);
      this.hoursKeys = Object.keys(this.hours);
    }
    setTimeout(() => {
      window.print();
      this.router.navigate([{ outlets: { print: null } }]);
    });
  }

  getSvgOfMonth(): string {
    switch (this.month) {
      case 'january':
        return '/assets/svg/january.svg';
      case 'february':
        return '/assets/svg/february.svg';
      case 'march':
        return '/assets/svg/march.svg';
      case 'april':
        return '/assets/svg/april.svg';
      case 'may':
        return '/assets/svg/may.svg';
      case 'june':
        return '/assets/svg/june.svg';
      case 'july':
        return '/assets/svg/july.svg';
      case 'august':
        return '/assets/svg/august.svg';
      case 'september':
        return '/assets/svg/september.svg';
      case 'october':
        return '/assets/svg/october.svg';
      case 'november':
        return '/assets/svg/november.svg';
      case 'december':
        return '/assets/svg/december.svg';
      default:
        return '';
    }
  }
}
