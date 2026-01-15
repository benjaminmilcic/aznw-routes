import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const TMDB_API_KEY = '3014281c899ed9a200109f0a5f9bfb0f';
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
      api_key: TMDB_API_KEY,
      language,
      include_adult: 'false',
    },
  });

  return next(modifiedReq);
};
