import { Component, HostListener } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { AboutComponent } from './components/about/about.component';
import { SkillsComponent } from './components/skills/skills.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { ContactComponent } from './components/contact/contact.component';
import { FooterComponent } from './components/footer/footer.component';
import { TranslateModule } from '@ngx-translate/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { HomeService } from './home.service';

@Component({
    selector: 'app-home',
    imports: [
        CommonModule,
        HeaderComponent,
        AboutComponent,
        SkillsComponent,
        PortfolioComponent,
        ContactComponent,
        FooterComponent,
        TranslateModule,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
  @HostListener('document:DOMContentLoaded')
  onInView() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          // return;
        }
        // entry.target.classList.remove('in-view');
      });
    });
    // Get all the elements with the .animate class applied
    const allAnimatedElements = document.querySelectorAll('.animation');

    // Add the observer to each of those elements
    allAnimatedElements.forEach((element) => observer.observe(element));
  }

  constructor(public homeService:HomeService) {
    
  }
}
