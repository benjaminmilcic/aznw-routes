import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  constructor(private translate: TranslateService) {
    super();

    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      this.updateLabels();
    });

    // Initial translation
    this.updateLabels();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return this.translate.instant('PAGINATOR.RANGE_PAGE_LABEL_1', { length });
    }
    const startIndex = page * pageSize;
    const endIndex = startIndex < length
      ? Math.min(startIndex + pageSize, length)
      : startIndex + pageSize;
    return this.translate.instant('PAGINATOR.RANGE_PAGE_LABEL_2', {
      startIndex: startIndex + 1,
      endIndex,
      length,
    });
  };

  private updateLabels(): void {
    this.itemsPerPageLabel = this.translate.instant('PAGINATOR.ITEMS_PER_PAGE');
    this.nextPageLabel = this.translate.instant('PAGINATOR.NEXT_PAGE');
    this.previousPageLabel = this.translate.instant('PAGINATOR.PREVIOUS_PAGE');
    this.firstPageLabel = this.translate.instant('PAGINATOR.FIRST_PAGE');
    this.lastPageLabel = this.translate.instant('PAGINATOR.LAST_PAGE');
    this.changes.next();
  }
}
