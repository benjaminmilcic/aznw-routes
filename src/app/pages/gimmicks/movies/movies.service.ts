import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MovieDetail, MovieSearchResponse, PersonDetail, WatchProvidersResponse } from './movies.model';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private readonly http = inject(HttpClient);
  private readonly translateService = inject(TranslateService);
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  searchMovies(
    query: string,
    page: number = 1
  ): Observable<MovieSearchResponse> {
    return this.http.get<MovieSearchResponse>(`${this.baseUrl}/search/movie`, {
      params: {
        query,
        page: page.toString(),
      },
    });
  }

  getImageUrl(path: string | null, size: string = 'original'): string {
    if (!path) {
      const lang = this.translateService.currentLang || 'en';
      return `assets/movie-placeholder-${lang}.svg`;
    }
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getPopularMovies(page: number = 1): Observable<MovieSearchResponse> {
    return this.http.get<MovieSearchResponse>(
      `${this.baseUrl}/discover/movie`,
      {
        params: {
          page: page.toString(),
        },
      }
    );
  }

  getTopRatedMovies(page: number = 1): Observable<MovieSearchResponse> {
    return this.http.get<MovieSearchResponse>(
      `${this.baseUrl}/movie/top_rated`,
      {
        params: {
          page: page.toString(),
        },
      }
    );
  }

  getNowPlayingMovies(page: number = 1): Observable<MovieSearchResponse> {
    return this.http.get<MovieSearchResponse>(
      `${this.baseUrl}/movie/now_playing`,
      {
        params: {
          page: page.toString(),
        },
      }
    );
  }

  getMovieDetail(id: number): Observable<MovieDetail> {
    return this.http.get<MovieDetail>(`${this.baseUrl}/movie/${id}`, {
      params: {
        append_to_response: 'credits,videos,images,similar,recommendations',
      },
    });
  }

  getMovieWatchProviders(id: number): Observable<WatchProvidersResponse> {
    return this.http.get<WatchProvidersResponse>(
      `${this.baseUrl}/movie/${id}/watch/providers`
    );
  }

  getActorDetail(id: number): Observable<PersonDetail> {
    return this.http.get<PersonDetail>(`${this.baseUrl}/person/${id}`, {
      params: {
        append_to_response: 'movie_credits',
      },
    });
  }
}
