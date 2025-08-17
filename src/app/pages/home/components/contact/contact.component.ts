import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
import { TranslateSendButtonService } from '../shared/translate-send-button.service';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.css'],
    imports: [TranslateModule, FormsModule, CommonModule]
})
export class ContactComponent implements OnInit, OnDestroy {
  isSending = false;

  sendButtonText = '';

  translateSendButtonSub: Subscription;

  constructor(
    private toastr: ToastrService,
    private http: HttpClient,
    private translate: TranslateService,
    private translateSendButtonService: TranslateSendButtonService
  ) {}

  ngOnInit(): void {
    this.translateSendButtonSub =
      this.translateSendButtonService.translateSendButton.subscribe(() => {
        this.translate.get('contact.send').subscribe((res: string) => {
          this.sendButtonText = res;
        });
      });
    this.translateSendButtonService.translateSendButton.next();
  }

  onSubmit(messageForm: NgForm) {
    this.isSending = true;
    this.translate.get('contact.sending').subscribe((res: string) => {
      this.sendButtonText = res;
    });

    // old Nest API
    //
    //this.http.post('https://nest-form2mail.adaptable.app/', messageForm.value);

    // spring or nest boot api

    const headers = new HttpHeaders().set(
      'Content-Type',
      'application/json; charset=utf-8'
    );

    this.http
      .post(
        environment.contact.form2mailApi,
        JSON.stringify(messageForm.value),
        { headers: headers }
      )
      .subscribe(
        () => {
          this.isSending = false;
          this.translate.get('contact.send').subscribe((res: string) => {
            this.sendButtonText = res;
          });
          messageForm.reset();

          forkJoin(
            this.translate.get('contact.toast.success.text'),
            this.translate.get('contact.toast.success.headline')
          ).subscribe((results) => {
            this.toastr.success(results[0], results[1], {
              positionClass: 'toast-bottom-center',
            });
          });
        },
        (error: Error) => {
          this.isSending = false;
          this.translate.get('contact.send').subscribe((res: string) => {
            this.sendButtonText = res;
          });

          this.translate.get('contact.toast.error').subscribe((res: string) => {
            this.toastr.error(error.message, res, {
              positionClass: 'toast-bottom-center',
            });
          });
        }
      );
  }

  ngOnDestroy(): void {
    this.translateSendButtonSub.unsubscribe();
  }
}
