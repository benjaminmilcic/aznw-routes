import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from '../../home.service';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioProject } from './portfolio.model';
import projectsData from './portfolio.json';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
  imports: [TranslateModule, RouterModule, MatIconModule],
})
export class PortfolioComponent {
  @ViewChild('projectDialog') projectDialog: ElementRef<HTMLDialogElement>;

  readonly projects = (projectsData as PortfolioProject[]).filter(
    (project) => !project.hidden,
  );
  selectedProject: PortfolioProject | null = null;

  constructor(
    public homeService: HomeService,
    public translate: TranslateService,
    private router: Router,
  ) {}

  /** Replaces "{lang}" in image paths and links with the current language */
  localize(value: string): string {
    const lang = this.translate.currentLang;
    const supported = ['de', 'en', 'hr'];
    const suffix = supported.includes(lang) ? lang : 'en';
    return value.replace('{lang}', suffix);
  }

  openProject(project: PortfolioProject) {
    if (project.route) {
      this.router.navigate([project.route]);
      return;
    }
    this.selectedProject = project;
    this.openDialog(this.projectDialog.nativeElement);
  }

  closeDialog(dialog: HTMLDialogElement) {
    dialog.close();
    this.router.navigate(['/'], { fragment: 'portfolio' });
  }

  openDialog(dialog: HTMLDialogElement) {
    dialog.showModal();
    this.homeService.overflowHidden = true;

    dialog.addEventListener(
      'close',
      () => {
        this.homeService.overflowHidden = false;
      },
      { once: true },
    );
  }
}
