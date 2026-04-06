import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const moviesInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept TMDB API requests
  if (!req.url.startsWith(TMDB_BASE_URL)) {
    return next(req);
  }

  const translateService = inject(TranslateService);

   let language;
   switch (translateService.currentLang) {
     case 'de':
       language = 'de-DE';
       break;
     case 'hr':
       language = 'hr-HR';
       break;

     default:
       language = 'en-US';

       break;
   }

  // Clone the request and add API key and language parameters
  const modifiedReq = req.clone({
    setParams: {
      api_key: environment.tmdb.apiKey,
      language,
      include_adult: 'false',
    },
  });

  return next(modifiedReq);
};
