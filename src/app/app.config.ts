import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { RouterModule } from '@angular/router';

import { routes } from './app.routes';
import {
  HttpBackend,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { environment } from '../environments/environment';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideNgxStripe } from 'ngx-stripe';
import { LocationStrategy } from '@angular/common';
import { ParameterHashLocationStrategy } from './ParameterHashLocationStrategy';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { provideStore } from '@ngrx/store';
import { recipeReducer } from './pages/gimmicks/recipes/store/reducers/recipe.reducer';
import { provideEffects } from '@ngrx/effects';
import { RecipeEffects } from './pages/gimmicks/recipes/store/effects/recipe.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export function HttpLoaderFactory(httpHandler: HttpBackend) {
  const http = new HttpClient(httpHandler);
  const version = environment.version;
  return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${version}`);
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      RouterModule.forRoot(routes, {
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
        useHash: true,
      })
    ),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpBackend],
        },
        defaultLanguage: 'de',
      })
    ),
    importProvidersFrom(ToastrModule.forRoot()),
    importProvidersFrom(BrowserAnimationsModule),
    provideIonicAngular(),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(withInterceptorsFromDi()),
    // {
    //   provide: HTTP_INTERCEPTORS,
    //   useClass: AuthInterceptorService,
    //   multi: true,
    // },
    provideNgxStripe(
      'pk_test_51P05azL6Qm22ltjdlDi75OKMXcdkImE9eB6U7pS709irbBgVW1OuvSEho05cYC3OdwAt4nJh2Zfike65t3OKhviN00RWkBd4Qa'
    ),
    {
      provide: LocationStrategy,
      useClass: ParameterHashLocationStrategy,
    },
    importProvidersFrom(NgCircleProgressModule.forRoot({})),
    provideStore({
      recipes: recipeReducer,
    }),

    provideEffects([RecipeEffects]),
    // Redux DevTools für Debugging (optional, aber sehr hilfreich!)
    provideStoreDevtools({
      maxAge: 25, // Anzahl der gespeicherten States
      logOnly: true, // Im Production-Modus auf true setzen
    }),
  ],
};
