import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-page-not-found',
    imports: [RouterModule, TranslateModule],
    templateUrl: './page-not-found.component.html',
    styleUrl: './page-not-found.component.css'
})
export class PageNotFoundComponent {
  private location = inject(Location);
  private router = inject(Router);

  goBack(): void {
    // No history within the app (e.g. direct entry via a link) -> home page
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
