import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { RouterModule } from '@angular/router';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, HttpBackend, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from '../environments/environment';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthInterceptorService } from './pages/gimmicks/auth/auth-interceptor.service';
import { provideNgxStripe } from 'ngx-stripe';
import { LocationStrategy } from '@angular/common';
import { ParameterHashLocationStrategy } from './ParameterHashLocationStrategy';
import { NgCircleProgressModule } from 'ng-circle-progress';



export function HttpLoaderFactory(httpHandler: HttpBackend) {
  return new TranslateHttpLoader(new HttpClient(httpHandler));
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      RouterModule.forRoot(routes, {
        anchorScrolling: 'enabled',
        useHash: true,
      })
    ),
    provideHttpClient(), // or provideHttpClient() in Angular v15
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
    importProvidersFrom(AngularFireModule.initializeApp(environment.firebase)),
    importProvidersFrom(AngularFireStorageModule),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true,
    },
    provideNgxStripe(
      'pk_test_51P05azL6Qm22ltjdlDi75OKMXcdkImE9eB6U7pS709irbBgVW1OuvSEho05cYC3OdwAt4nJh2Zfike65t3OKhviN00RWkBd4Qa'
    ),
    {
      provide: LocationStrategy,
      useClass: ParameterHashLocationStrategy,
    },
    importProvidersFrom(NgCircleProgressModule.forRoot({})),
  ],
};
