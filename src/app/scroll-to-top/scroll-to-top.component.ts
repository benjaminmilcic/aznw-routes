import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-scroll-to-top',
    templateUrl: './scroll-to-top.component.html',
    styleUrls: ['./scroll-to-top.component.css'],
    imports: [TranslateModule, CommonModule, RouterModule]
})
export class ScrollToTopComponent implements OnInit {
  scrollToTopVisible = false;
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event) {
    this.scrollToTopVisible = document.documentElement.scrollTop > 100;
  }

  currentRoute: string;

  constructor(private router: Router) {}
  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = this.router.url.split('#')[0];
      }
    });
  }
}
