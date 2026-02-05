import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SEARCHABLE_ROUTES, SearchableRoute } from './search-routes';

interface SearchResult extends SearchableRoute {
  translatedLabel: string;
}

interface GroupedResults {
  category: string;
  items: SearchResult[];
}

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './search-dialog.component.html',
  styleUrls: ['./search-dialog.component.css'],
})
export class SearchDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  groupedResults: GroupedResults[] = [];
  flatResults: SearchResult[] = [];
  activeIndex = -1;

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.query = '';
      this.groupedResults = [];
      this.flatResults = [];
      this.activeIndex = -1;
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  onSearch(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.groupedResults = [];
      this.flatResults = [];
      this.activeIndex = -1;
      return;
    }

    const matches: SearchResult[] = SEARCHABLE_ROUTES.filter((route) => {
      const label = this.getLabel(route).toLowerCase();
      if (label.includes(q)) return true;
      return route.keywords.some((kw) => kw.toLowerCase().includes(q));
    }).map((route) => ({
      ...route,
      translatedLabel: this.getLabel(route),
    }));

    // Group by category
    const grouped = new Map<string, SearchResult[]>();
    for (const match of matches) {
      const group = grouped.get(match.category) || [];
      group.push(match);
      grouped.set(match.category, group);
    }

    this.groupedResults = Array.from(grouped.entries()).map(([category, items]) => ({
      category,
      items,
    }));
    this.flatResults = matches;
    this.activeIndex = matches.length > 0 ? 0 : -1;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      event.stopPropagation();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.flatResults.length > 0) {
        this.activeIndex = (this.activeIndex + 1) % this.flatResults.length;
        this.scrollActiveIntoView();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.flatResults.length > 0) {
        this.activeIndex =
          this.activeIndex <= 0
            ? this.flatResults.length - 1
            : this.activeIndex - 1;
        this.scrollActiveIntoView();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeIndex >= 0 && this.activeIndex < this.flatResults.length) {
        this.navigate(this.flatResults[this.activeIndex]);
      }
    }
  }

  navigate(result: SearchResult): void {
    if (result.fragment) {
      this.router.navigate([result.route], { fragment: result.fragment });
    } else {
      this.router.navigate([result.route]);
    }
    this.close();
  }

  close(): void {
    this.open = false;
    this.openChange.emit(false);
  }

  getFlatIndex(result: SearchResult): number {
    return this.flatResults.indexOf(result);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('search-overlay')) {
      this.close();
    }
  }

  private getLabel(route: SearchableRoute): string {
    return route.label || this.translate.instant(route.labelKey);
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      const el = document.querySelector('.search-result-item.active');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
}
