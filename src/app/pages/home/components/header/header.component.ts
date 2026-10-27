import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';

interface Availability {
  available: boolean;
  year: number;
  quarter: number;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [TranslateModule, RouterModule],
})
export class HeaderComponent implements OnInit {
  // Comes from the backend (also used by the AI chat), so it is only changed there.
  // Stays null while loading or if the backend is unreachable – then nothing is shown.
  availability = signal<Availability | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<Availability>(environment.availability.availabilityApi)
      .subscribe({
        next: (availability) => this.availability.set(availability),
        error: () => this.availability.set(null),
      });
  }
}
