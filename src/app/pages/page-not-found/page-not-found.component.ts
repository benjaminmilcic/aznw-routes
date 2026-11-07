import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-page-not-found',
    imports: [RouterModule, TranslateModule],
    templateUrl: './page-not-found.component.html',
    styleUrl: './page-not-found.component.css'
})
export class PageNotFoundComponent implements OnInit, OnDestroy {
  private location = inject(Location);
  private router = inject(Router);
  private meta = inject(Meta);

  // Unknown paths answer with HTTP 200 (SPA fallback), so search engines are told not to index them
  ngOnInit(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag('name="robots"');
  }

  goBack(): void {
    // No history within the app (e.g. direct entry via a link) -> home page
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
