import { afterNextRender, Component, DestroyRef, Injector, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HomeService } from '../../home.service';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioProject } from './portfolio.model';
import { localize, PORTFOLIO_PROJECTS, ProjectDialogComponent } from './project-dialog.component';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
  imports: [TranslateModule, RouterModule, MatIconModule, ProjectDialogComponent],
})
export class PortfolioComponent implements OnInit {
  @ViewChild(ProjectDialogComponent) projectDialog: ProjectDialogComponent;

  readonly projects = PORTFOLIO_PROJECTS;

  constructor(
    public homeService: HomeService,
    public translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private injector: Injector,
    private destroyRef: DestroyRef,
  ) {}

  /**
   * Links like /?project=webaro#portfolio open the dialog of that project right away (e.g. a project link from the
   * AI chat opened in a new tab – inside the chat the dialog opens above the conversation instead)
   */
  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('project');
        if (!id) return;
        // Only after rendering: the dialog must exist, and opening it changes the home page's overflow
        afterNextRender(
          () => {
            if (this.projectDialog.openById(id)) this.homeService.overflowHidden = true;
          },
          { injector: this.injector },
        );
      });
  }

  /** Replaces "{lang}" in image paths and links with the current language */
  localize(value: string): string {
    return localize(value, this.translate.currentLang);
  }

  openProject(project: PortfolioProject) {
    if (project.route) {
      this.router.navigate([project.route]);
      return;
    }
    this.projectDialog.open(project);
    this.homeService.overflowHidden = true;
  }

  onDialogClosed() {
    this.homeService.overflowHidden = false;
    this.router.navigate(['/'], { fragment: 'portfolio' });
  }
}
