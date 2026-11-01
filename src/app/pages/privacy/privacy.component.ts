import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface PrivacyItem {
  label: string;
  text: string;
}

interface PrivacySection {
  title: string;
  paragraphs?: string[];
  items?: PrivacyItem[];
  after?: string[];
  basis?: string;
}

@Component({
  selector: 'app-privacy',
  imports: [RouterModule, TranslateModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.css',
})
export class PrivacyComponent {
  private translate = inject(TranslateService);

  readonly email = 'benjamin.milcic@gmail.com';

  // The sections are an array in the translation files, so the page follows the language switch
  readonly sections = toSignal(this.translate.stream('privacy.sections'), {
    initialValue: [] as PrivacySection[],
  });

  isList(value: unknown): value is PrivacySection[] {
    return Array.isArray(value);
  }
}
