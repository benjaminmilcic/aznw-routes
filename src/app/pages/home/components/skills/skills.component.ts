import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface OrbitSkill {
  name: string;
  icon: string;
  /** Icon width in px – the logos have different proportions */
  size: number;
  url: string;
}

/** The skills around the photo (desktop), clockwise from the right */
const ORBIT_SKILLS: OrbitSkill[] = [
  { name: 'JavaScript', icon: 'assets/svg/js.svg', size: 32, url: 'https://wikipedia.org/wiki/JavaScript' },
  { name: 'Angular', icon: 'assets/angular_logo.png', size: 38, url: 'https://angular.io/' },
  { name: 'RxJs', icon: 'assets/svg/rxjs.svg', size: 32, url: 'https://rxjs.dev/' },
  { name: 'NgRx', icon: 'assets/svg/ngrx.svg', size: 46, url: 'https://ngrx.io/' },
  { name: 'Node.js', icon: 'assets/svg/nodejs.svg', size: 48, url: 'https://nodejs.org' },
  { name: 'NestJS', icon: 'assets/svg/nestjs.svg', size: 48, url: 'https://nestjs.com/' },
  { name: 'LiteLLM', icon: 'assets/litellm_logo.png', size: 34, url: 'https://www.litellm.ai/' },
  { name: 'Ionic', icon: 'assets/svg/ionic.svg', size: 38, url: 'https://ionicframework.com/' },
  { name: 'Capacitor', icon: 'assets/svg/capacitor.svg', size: 32, url: 'https://capacitorjs.com/' },
  { name: 'MySQL', icon: 'assets/svg/mysql.svg', size: 28, url: 'https://www.mysql.com' },
  { name: 'Cypress', icon: 'assets/svg/cypress.svg', size: 40, url: 'https://www.cypress.io/' },
  { name: 'HTML5', icon: 'assets/svg/html5.svg', size: 28, url: 'https://wikipedia.org/wiki/HTML5' },
  { name: 'CSS3', icon: 'assets/svg/css3.svg', size: 30, url: 'https://wikipedia.org/wiki/Cascading_Style_Sheets#CSS3' },
  { name: 'Tailwind', icon: 'assets/svg/tailwind.svg', size: 36, url: 'https://tailwindcss.com/' },
];

@Component({
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css'],
  imports: [
    TranslateModule,
    RouterModule,
    MatTooltipModule,
  ],
})
export class SkillsComponent implements AfterViewInit, OnDestroy {
  /**
   * Evenly spread on the orbit – a new skill only needs an entry in ORBIT_SKILLS. `angle` is the final position
   * (0° = right, 90° = bottom), `start` the top of the orbit, from where each icon flies in along the shorter way.
   */
  protected readonly orbit = ORBIT_SKILLS.map((skill, i) => {
    const angle = (i * 360) / ORBIT_SKILLS.length;
    return angle <= 90 || angle >= 270
      ? { ...skill, angle: angle >= 270 ? angle - 360 : angle, start: -90 }
      : { ...skill, angle, start: 270 };
  });

  private observer?: IntersectionObserver;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    });
    this.el.nativeElement
      .querySelectorAll('.animation')
      .forEach((element: Element) => this.observer!.observe(element));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
