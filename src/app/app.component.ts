import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { ScrollToTopComponent } from './pages/scroll-to-top/scroll-to-top.component';
import { ChartsHelperService } from './pages/gimmicks/charts/charts-helper.service';
import { AuthService } from './pages/gimmicks/auth/auth.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, SidebarComponent, ScrollToTopComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.chartsHelperService.detectChanges.next();
  }
  constructor(
    private translate: TranslateService,
    private chartsHelperService: ChartsHelperService,
    private authService: AuthService
  ) {
    translate.setDefaultLang('de');
    translate.use('de');
  }

  ngOnInit(): void {
    this.authService.autoLogin();
  }
}
