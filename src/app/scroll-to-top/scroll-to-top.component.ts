import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-scroll-to-top',
    templateUrl: './scroll-to-top.component.html',
    styleUrls: ['./scroll-to-top.component.css'],
    imports: [TranslateModule, CommonModule, RouterModule]
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  scrollToTopVisible = false;

  /** Umfang des Fortschrittskreises (r=23 im 50x50-viewBox des Templates). */
  readonly progressCircumference = 2 * Math.PI * 23;
  /** 0 = ganz oben, 1 = ganz unten. */
  scrollProgress = 0;

  get progressOffset(): number {
    return this.progressCircumference * (1 - this.scrollProgress);
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event?: Event) {
    const el = document.documentElement;
    const scrolled = el.scrollTop;
    const scrollable = el.scrollHeight - el.clientHeight;
    this.scrollToTopVisible = scrolled > 600;
    this.scrollProgress =
      scrollable > 0 ? Math.min(1, Math.max(0, scrolled / scrollable)) : 0;
  }

  currentRoute: string;
  private routerEventsSub: Subscription;

  constructor(private router: Router) {}
  ngOnInit(): void {
    this.onWindowScroll();
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = this.router.url.split('#')[0];
      }
    });
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
  }
}
