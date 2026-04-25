import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LanguageSwitcherComponent } from './language-switcher/language-switcher.component';
import { SearchDialogComponent } from './search/search-dialog.component';

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSwitcherComponent,
    SearchDialogComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy, AfterViewInit {
  activeFragment: string = 'header';
  private observer?: IntersectionObserver;
  private fragmentSub?: Subscription;
  private isNavigating = false;
  private readonly sections = [
    'header',
    'about',
    'skills',
    'portfolio',
    'contact',
    'footer',
  ];
  searchOpen: boolean = false;
  gimmicksExpanded: boolean = false;
  isGimmicksRoute: boolean = false;
  private gimmicksTimeout: any;
  private routerSub?: Subscription;
  mobileMenuOpen: boolean = false;
  mobileGimmicksExpanded: boolean = false;
  @ViewChild('mobileMenuContent') mobileMenuContent!: ElementRef<HTMLElement>;

  // Close mobile menu / search on escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.searchOpen) {
      this.searchOpen = false;
      return;
    }
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
    if (this.gimmicksExpanded) {
      this.gimmicksExpanded = false;
    }
  }

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    // Reset mobile gimmicks expansion when closing
    this.mobileGimmicksExpanded = false;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fragmentSub = this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.activeFragment = fragment;
        // Lock observer during navigation scroll
        this.isNavigating = true;
        setTimeout(() => (this.isNavigating = false), 1000);
      }
    });

    // Check initial route
    this.isGimmicksRoute = this.router.url.startsWith('/gimmicks');

    // Subscribe to route changes
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const wasGimmicksRoute = this.isGimmicksRoute;
        this.isGimmicksRoute = event.urlAfterRedirects.startsWith('/gimmicks');

        // Re-setup observer when returning from gimmicks to home
        if (wasGimmicksRoute && !this.isGimmicksRoute) {
          this.observer?.disconnect();
          setTimeout(() => this.setupIntersectionObserver(), 100);
        }
      });
  }

  ngAfterViewInit(): void {
    // Delay to ensure all section elements are rendered
    setTimeout(() => this.setupIntersectionObserver(), 100);
  }

  onGimmicksHover(isHovering: boolean): void {
    if (this.gimmicksTimeout) {
      clearTimeout(this.gimmicksTimeout);
    }

    if (isHovering) {
      this.gimmicksExpanded = true;
    } else {
      // Delay closing to allow moving to mega menu
      this.gimmicksTimeout = setTimeout(() => {
        this.gimmicksExpanded = false;
      }, 150);
    }
  }

  private setupIntersectionObserver(): void {
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    };

    this.observer = new IntersectionObserver((entries) => {
      if (this.isNavigating) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.activeFragment = entry.target.id;
        }
      });
    }, options);

    this.sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        this.observer!.observe(element);
      }
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    if (this.mobileMenuOpen) {
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';

      // Auto-expand gimmicks submenu and scroll down when on gimmicks route
      if (this.isGimmicksRoute) {
        this.mobileGimmicksExpanded = true;
        // Wait for menu animation and submenu expansion, then scroll to bottom
        setTimeout(() => {
          if (this.mobileMenuContent?.nativeElement) {
            this.mobileMenuContent.nativeElement.scrollTo({
              top: this.mobileMenuContent.nativeElement.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 300);
      }
    } else {
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      // Reset mobile gimmicks expansion when closing
      this.mobileGimmicksExpanded = false;
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.fragmentSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }
}
