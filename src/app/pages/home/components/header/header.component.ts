import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [TranslateModule, RouterModule],
})
export class HeaderComponent implements OnInit {
  available = signal(true);
  year = signal(2026);
  quarter = signal(1);
  ngOnInit(): void {
    const now = new Date();
    const month = now.getMonth(); // 0–11
    const currentQuarter = Math.floor(month / 3) + 1;
    this.year.set(now.getFullYear());
    this.quarter.set(currentQuarter);
  }
}
