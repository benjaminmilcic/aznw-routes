import { Component, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  imports: [TranslateModule],
})
export class FooterComponent implements OnInit {
  currentYear = signal<string>('2026');

  ngOnInit(): void {
    const now = new Date();
    this.currentYear.set(now.getFullYear().toString());
  }
}
