import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  SemanticSearchService,
  IndexedRoute,
  RankedRoute,
} from './semantic-search.service';

interface SearchResult {
  route: string;
  fragment?: string;
  icon: string;
  category: string;
  translatedLabel: string;
  score: number;
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
export class SearchDialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  groupedResults: GroupedResults[] = [];
  flatResults: SearchResult[] = [];
  activeIndex = -1;
  navigatingWithKeys = false;
  loading = false;

  private indexReady = false;
  private keyNavTimeout: ReturnType<typeof setTimeout> | null = null;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  private readonly debounceMs = 200;

  constructor(
    private router: Router,
    private translate: TranslateService,
    private semantic: SemanticSearchService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.query = '';
      this.groupedResults = [];
      this.flatResults = [];
      this.activeIndex = -1;
      this.loading = false;
      this.ensureIndex();
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  ngOnDestroy(): void {
    this.cancelPending();
    if (this.keyNavTimeout) clearTimeout(this.keyNavTimeout);
  }

  onSearch(): void {
    const q = this.query.trim();
    this.cancelPending();

    if (!q) {
      this.groupedResults = [];
      this.flatResults = [];
      this.activeIndex = -1;
      this.loading = false;
      return;
    }

    // Sofort lokale (lexikalische) Treffer zeigen, damit Tippen reaktiv wirkt …
    const local = this.semantic.lexical(q).map((r) => this.toResult(r));
    if (local.length) this.applyResults(local);
    this.loading = true;

    // … und kurz darauf die hybride (lexikalisch + semantische) Suche nachladen.
    this.debounceTimeout = setTimeout(() => this.runHybrid(q), this.debounceMs);
  }

  private runHybrid(q: string): void {
    this.abortController = new AbortController();
    this.semantic
      .search(q, { signal: this.abortController.signal })
      .then((ranked) => {
        if (this.query.trim() !== q) return; // veraltete Anfrage verwerfen
        this.loading = false;
        this.applyResults(ranked.map((r) => this.toResult(r)));
      })
      .catch((err) => {
        if (this.query.trim() !== q || err?.name === 'AbortError') return;
        this.loading = false;
        // Bei Fehler die bereits gezeigten lexikalischen Treffer behalten.
        if (!this.flatResults.length) {
          this.applyResults(this.semantic.lexical(q).map((r) => this.toResult(r)));
        }
      });
  }

  private toResult(route: RankedRoute): SearchResult {
    return {
      route: route.route,
      fragment: route.fragment,
      icon: route.icon,
      category: route.category,
      translatedLabel: this.getLabel(route),
      score: route.score,
    };
  }

  private applyResults(matches: SearchResult[]): void {
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
    // flatResults muss der Anzeige-Reihenfolge (gruppiert) entsprechen.
    this.flatResults = this.groupedResults.flatMap((g) => g.items);
    this.activeIndex = this.flatResults.length > 0 ? 0 : -1;
  }

  private cancelPending(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
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

  private getLabel(route: IndexedRoute): string {
    return route.label || (route.labelKey ? this.translate.instant(route.labelKey) : '');
  }

  private ensureIndex(): void {
    if (this.indexReady) return;
    this.semantic
      .loadIndex()
      .then(() => {
        this.indexReady = true;
        // Falls der Nutzer schon getippt hat, bevor der Index da war.
        if (this.query.trim()) this.onSearch();
      })
      .catch((err) => console.warn('Such-Index konnte nicht geladen werden:', err));
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
