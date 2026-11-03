import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/** Imprint: only name, email and the contact form – Benjamin does not want his address on the website. */
@Component({
  selector: 'app-imprint',
  imports: [RouterModule, TranslateModule],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
})
export class ImprintComponent {
  readonly email = 'benjamin.milcic@gmail.com';
}
