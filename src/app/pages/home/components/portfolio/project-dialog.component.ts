import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PortfolioProject } from './portfolio.model';
import projectsData from './portfolio.json';

/** The visible portfolio projects, in the order of portfolio.json */
export const PORTFOLIO_PROJECTS = (projectsData as PortfolioProject[]).filter((project) => !project.hidden);

/** Replaces "{lang}" in image paths and links with the language (de, en, hr – English for any other). */
export function localize(value: string, lang: string): string {
  return value.replace('{lang}', ['de', 'en', 'hr'].includes(lang) ? lang : 'en');
}

/**
 * The details of a portfolio project as a modal dialog. Used by the portfolio section and by the AI chat, which
 * opens it right above the conversation when an answer links a project.
 */
@Component({
  selector: 'app-project-dialog',
  templateUrl: './project-dialog.component.html',
  styleUrls: ['./project-dialog.component.css'],
  imports: [TranslateModule, MatIconModule],
})
export class ProjectDialogComponent {
  /** Emitted whenever the dialog closes – close button, Escape or backdrop */
  readonly closed = output<void>();

  private readonly translate = inject(TranslateService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly project = signal<PortfolioProject | null>(null);

  open(project: PortfolioProject): void {
    this.project.set(project);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
  }

  /** Opens the project with this id (case-insensitive) – false if there is no such project with a dialog. */
  openById(id: string): boolean {
    const project = PORTFOLIO_PROJECTS.find((p) => p.id === id.toLowerCase() && !p.route);
    if (project) this.open(project);
    return !!project;
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected localize(value: string): string {
    return localize(value, this.translate.currentLang);
  }

  protected onClose(): void {
    this.closed.emit();
  }
}
