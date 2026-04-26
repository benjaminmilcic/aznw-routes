import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

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
