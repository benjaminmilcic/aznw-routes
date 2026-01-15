import { Component, input, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MoviesService } from '../movies.service';
import { CountryWatchProviders, WatchProvider } from '../movies.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movies-watch-providers',
  imports: [MatChipsModule, MatIconModule, MatTooltipModule, TranslateModule],
  templateUrl: './movies-watch-providers.component.html',
  styleUrl: './movies-watch-providers.component.scss',
})
export class MoviesWatchProvidersComponent {
  constructor(private movieService: MoviesService){}
   
  providers = input.required<CountryWatchProviders | null>();

  getProviderLogoUrl(logoPath: string): string {
    return this.movieService.getImageUrl(logoPath, 'w92');
  }

  get hasAnyProviders(): boolean {
    const p = this.providers();
    if (!p) return false;
    return !!(p.flatrate?.length || p.rent?.length || p.buy?.length);
  }

  get streamingProviders(): WatchProvider[] {
    return this.providers()?.flatrate || [];
  }

  get rentProviders(): WatchProvider[] {
    return this.providers()?.rent || [];
  }

  get buyProviders(): WatchProvider[] {
    return this.providers()?.buy || [];
  }

  get linkToTMDB(): string {
    return this.providers()?.link || '';
  }
}
