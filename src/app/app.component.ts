import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { ScrollToTopComponent } from './pages/scroll-to-top/scroll-to-top.component';
import { ChartsHelperService } from './pages/gimmicks/charts/charts-helper.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ScrollToTopComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.chartsHelperService.detectChanges.next();
  }
  constructor(
    private translate: TranslateService,
    private chartsHelperService: ChartsHelperService,
  ) {
    translate.setDefaultLang('en');
    translate.use('en');
  }
}
