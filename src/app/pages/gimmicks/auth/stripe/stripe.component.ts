import {
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  Validators,
} from '@angular/forms';

import { MatInputModule } from '@angular/material/input';

import {
  injectStripe,
  NgxStripeModule,
  StripeElementsDirective,
  StripePaymentElementComponent,
} from 'ngx-stripe';
import {
  StripeElementLocale,
  StripeElementsOptions,
  StripePaymentElementOptions,
} from '@stripe/stripe-js';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom, map, take, tap } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { environment } from '../../../../../environments/environment';
import { HttpErrorService } from '../../../http-error/http-error.service';

@Component({
    selector: 'app-stripe',
    imports: [
        MatFormFieldModule,
        ReactiveFormsModule,
        CommonModule,
        NgxStripeModule,
        MatInputModule,
        FormsModule,
        IonSpinner,
        TranslateModule,
    ],
    templateUrl: './stripe.component.html',
    styleUrl: './stripe.component.css'
})
export class StripeComponent implements OnInit {
  @ViewChild(StripePaymentElementComponent)
  paymentElement!: StripePaymentElementComponent;
  @ViewChild(StripeElementsDirective) elements!: StripeElementsDirective;

  viewType: 'payment' | 'success' | 'error' | 'couldNotLoad' | 'spinner' =
    'spinner';
  error: string = null;

  @ViewChild('nameInput') nameInput: ElementRef;
  @ViewChild('emailInput') emailInput: ElementRef;
  @ViewChild('streetInput') streetInput: ElementRef;
  @ViewChild('zipCodeInput') zipCodeInput: ElementRef;
  @ViewChild('cityInput') cityInput: ElementRef;

  private readonly fb = inject(UntypedFormBuilder);

  paymentElementForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required]],
    address: ['', [Validators.required]],
    zipcode: ['', [Validators.required]],
    city: ['', [Validators.required]],
    amount: [1498, [Validators.required, Validators.pattern(/\d+/)]],
  });

  elementsOptions: StripeElementsOptions = {
    locale: <StripeElementLocale>this.translate.currentLang,
    clientSecret: null,
    appearance: {
      theme: 'flat',
    },
  };

  paymentElementOptions: StripePaymentElementOptions = {
    layout: {
      type: 'tabs',
      defaultCollapsed: false,
      radios: false,
      spacedAccordionItems: false,
    },
  };

  // Replace with your own public key
  stripe = injectStripe();
  paying = signal(false);

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private router: Router,
    private authService: AuthService,
    private httpErrorService: HttpErrorService
  ) {}

  // async ngOnInit() {
  //   const items = [{ items: 'book' }];
  //   const { clientSecret } = await lastValueFrom(
  //     this.http.post<{ clientSecret: string }>(
  //       'http://localhost:8080',
  //       JSON.stringify({ items, lang: this.translate.currentLang })
  //     )
  //   );
  //   console.log(clientSecret);

  // }

  async ngOnInit() {
    const url = window.location.toString();
    let clientSecret;
    if (url.includes('?payment_intent')) {
      let queryParams = url.split('?');
      let params = queryParams[2].split('&');
      let language = queryParams[1].split('=').pop();
      this.translate.use(language);

      let isNotAuthenticated = await lastValueFrom(
        this.authService.authUser.pipe(
          take(1),
          map((authUser) => {
            return !authUser;
          })
        )
      );

      if (isNotAuthenticated) {
        this.router.navigate(['/gimmicks/auth/login']);
      } else {
        this.router.navigate(['/gimmicks/auth/main']);
      }

      clientSecret = params
        .filter((param) => param.includes('payment_intent_client_secret'))[0]
        .split('=')
        .pop();

      const { paymentIntent, error } = await lastValueFrom(
        this.stripe.retrievePaymentIntent(clientSecret)
      );

      if (error) {
        this.viewType = 'error';
        this.error = error.message;
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.viewType = 'success';
      } else {
        this.viewType = 'error';
        this.error = this.translate.instant('gimmicks.jokes.paymentFailed');
      }
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          window.scrollTo({
            left: 0,
            top: document.body.scrollHeight,
          });
        }, 50);
      }
    } else {
      this.catchClientSectet();
    }

    this.translate.onLangChange.subscribe(async (lang) => {
      if (this.elements) {
        this.elementsOptions.locale = <StripeElementLocale>lang.lang;
        this.elements.update(this.elementsOptions);
        await this.catchClientSectet();
      }
    });
  }

  private async catchClientSectet() {
    this.viewType = 'spinner';
    const items = [{ items: 'book' }];
    const headers = new HttpHeaders().set(
      'Content-Type',
      'application/json; charset=utf-8'
    );
    try {
      // spring boot api
      //
      // const { clientSecret } = await lastValueFrom(
      //   this.http.post<{ clientSecret: string }>(
      //     environment.stripe.createApi,
      //     JSON.stringify({ items: 1, lang: this.translate.currentLang }),
      //     { headers: headers }
      //   )
      // );
      // old PHP API or new nest api
      //

      const { clientSecret } = await lastValueFrom(
        this.http.post<{ clientSecret: string }>(
          environment.stripe.createApi,
          JSON.stringify({ items, lang: this.translate.currentLang })
        )
      );

      this.elementsOptions.clientSecret = clientSecret;
      this.elementsOptions.locale = <StripeElementLocale>(
        this.translate.currentLang
      );
      if (this.elements) {
        this.elements.update(this.elementsOptions);
      }
      this.viewType = 'payment';
    } catch (error) {
      this.httpErrorService.showHttpError(error, 'StripeComponent');
      this.viewType = 'couldNotLoad';
    }
  }

  pay() {
    if (this.paymentElementForm.invalid) {
      if (this.paymentElementForm.controls['name'].invalid) {
        this.nameInput.nativeElement.focus();
        this.nameInput.nativeElement.blur();
      }
      if (this.paymentElementForm.controls['email'].invalid) {
        this.emailInput.nativeElement.focus();
        this.emailInput.nativeElement.blur();
      }
      if (this.paymentElementForm.controls['address'].invalid) {
        this.streetInput.nativeElement.focus();
        this.streetInput.nativeElement.blur();
      }
      if (this.paymentElementForm.controls['zipcode'].invalid) {
        this.zipCodeInput.nativeElement.focus();
        this.zipCodeInput.nativeElement.blur();
      }
      if (this.paymentElementForm.controls['city'].invalid) {
        this.cityInput.nativeElement.focus();
        this.cityInput.nativeElement.blur();
      }
      return;
    }

    if (this.paying()) return;
    this.paying.set(true);

    const { name, email, address, zipcode, city } =
      this.paymentElementForm.getRawValue();

    this.stripe
      .confirmPayment({
        elements: this.paymentElement.elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: name as string,
              email: email as string,
              address: {
                line1: address as string,
                postal_code: zipcode as string,
                city: city as string,
              },
            },
          },
          return_url:
            environment.stripe.returnUrl +
            '/#/gimmicks/auth/login?lang=' +
            this.translate.currentLang +
            '&',
        },
        redirect: 'if_required',
      })
      .subscribe((result) => {
        this.paying.set(false);
        if (result.error) {
          // Show error to your customer (e.g., insufficient funds)
          this.viewType = 'error';
          this.error = result.error.message;
        } else {
          // The payment has been processed!
          if (result.paymentIntent.status === 'succeeded') {
            // Show a success message to your customer
            this.viewType = 'success';
          }
        }
      });
  }

  async onTryAgain() {
    this.viewType = 'spinner';
    await this.catchClientSectet();
    this.paymentElementForm.controls['name'].setValue('');
    this.paymentElementForm.controls['email'].setValue('');
    this.paymentElementForm.controls['address'].setValue('');
    this.paymentElementForm.controls['zipcode'].setValue('');
    this.paymentElementForm.controls['city'].setValue('');
  }
}
