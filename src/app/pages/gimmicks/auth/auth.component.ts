import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { JokesBookComponent } from './jokes-book/jokes-book.component';
import { StripeComponent } from './stripe/stripe.component';
import { IonPopover } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-auth',
    imports: [
        IonPopover,
        RouterModule,
        JokesBookComponent,
        StripeComponent,
        TranslateModule,
    ],
    templateUrl: './auth.component.html',
    styleUrl: './auth.component.css'
})
export class AuthComponent {
  constructor(private translate: TranslateService) {}

  copyToClipboard(text: string, event: any) {
    navigator.clipboard.writeText(text);
    let div = document.createElement('div');
    div.id = 'copiedDiv';
    div.innerHTML = this.translate.instant('gimmicks.jokes.copied');
    div.style.width = 'fit';
    div.style.height = 'fit';
    div.style.background = 'rgba(0, 0, 0, 0.9)';
    div.style.borderRadius = '12px';
    div.style.padding = '4px';
    div.style.color = 'white';
    div.style.position = 'fixed';
    div.style.transform = 'translate(-50%, 0)';
    div.style.transition = 'all .1s ease';
    let container = document.getElementById('container');
    container.appendChild(div);
    let rect = div.getClientRects();
    div.style.top = (event.clientY - rect[0].height - 10).toString() + 'px';
    div.style.left = event.clientX.toString() + 'px';
    setTimeout(() => {
      container.removeChild(div);
    }, 3000);
  }
}
