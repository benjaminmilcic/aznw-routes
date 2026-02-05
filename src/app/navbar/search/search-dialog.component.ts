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
import Fuse from 'fuse.js';
import { SEARCHABLE_ROUTES, SearchableRoute } from './search-routes';

interface SearchResult extends SearchableRoute {
  translatedLabel: string;
  matchScore: number;
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
  navigatingWithKeys = false;

  private fuse!: Fuse<SearchableRoute & { translatedLabel: string }>;
  private keyNavTimeout: ReturnType<typeof setTimeout> | null = null;

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
      this.buildFuseIndex();
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  onSearch(): void {
    const q = this.query.trim();
    if (!q) {
      this.groupedResults = [];
      this.flatResults = [];
      this.activeIndex = -1;
      return;
    }

    const fuseResults = this.fuse.search(q, { limit: 15 });

    const matches: SearchResult[] = fuseResults.map((result) => ({
      ...result.item,
      matchScore: result.score ?? 1,
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
    // flatResults must match the visual display order (grouped), not the Fuse relevance order
    this.flatResults = this.groupedResults.flatMap((g) => g.items);
    this.activeIndex = this.flatResults.length > 0 ? 0 : -1;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      event.stopPropagation();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.lockKeyNav();
      if (this.flatResults.length > 0 && this.activeIndex < this.flatResults.length - 1) {
        this.activeIndex++;
        this.scrollActiveIntoView();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.lockKeyNav();
      if (this.flatResults.length > 0 && this.activeIndex > 0) {
        this.activeIndex--;
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

  onMouseEnterResult(index: number): void {
    if (!this.navigatingWithKeys) {
      this.activeIndex = index;
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('search-overlay')) {
      this.close();
    }
  }

  private getLabel(route: SearchableRoute): string {
    return route.label || this.translate.instant(route.labelKey);
  }

  private buildFuseIndex(): void {
    const data = SEARCHABLE_ROUTES.map((route) => ({
      ...route,
      translatedLabel: this.getLabel(route),
      descriptionTokens: route.description.split(/\s+/),
    }));

    this.fuse = new Fuse(data, {
      keys: [
        { name: 'translatedLabel', weight: 3 },
        { name: 'keywords', weight: 2 },
        { name: 'descriptionTokens', weight: 1 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }

  private lockKeyNav(): void {
    this.navigatingWithKeys = true;
    if (this.keyNavTimeout) clearTimeout(this.keyNavTimeout);
    this.keyNavTimeout = setTimeout(() => {
      this.navigatingWithKeys = false;
    }, 150);
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      const el = document.querySelector('.search-result-item.active');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
}
