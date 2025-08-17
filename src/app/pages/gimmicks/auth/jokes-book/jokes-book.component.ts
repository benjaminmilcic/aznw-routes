import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-jokes-book',
    imports: [TranslateModule],
    templateUrl: './jokes-book.component.html',
    styleUrls: ['./jokes-book.component.css']
})
export class JokesBookComponent implements AfterViewInit {

  @ViewChild('bookFront') bookFront: ElementRef;
  @ViewChild('bookBack') bookBack: ElementRef;
  @ViewChild('bookWrap') bookWrap: ElementRef;
  @ViewChild('paypal') paypalElement: ElementRef;

  product = {
    price: '10.00',
    description: 'Book',
    img: 'assets/book.jpg'
  };

  paidFor = false;

  constructor() {

    // loadScript({ "client-id": 'Ae819_wkDXSiajgrgJCjptbV33aYVXTTdK1Mm-TC7_k6le1mltKuy_8FeiQtI9zbtKnFZzag_of7lVOC' })
    //   .then((paypal) => {
    //     paypal.Buttons({
    //       style: {
    //         layout: 'vertical',
    //         color: 'blue',
    //         shape: 'rect',
    //         label: 'paypal'
    //       },
    //       createOrder: function (data, actions) {
    //         // Set up the transaction
    //         return actions.order.create({
    //           purchase_units: [{
    //             amount: {
    //               currency_code: 'USD',
    //               value: '10.00'
    //             },
    //             shipping: {
    //               options: [
    //                 {
    //                   id: "SHIP_123",
    //                   label: "Free Shipping",
    //                   type: "SHIPPING",
    //                   selected: true,
    //                   amount: {
    //                     value: "3.00",
    //                     currency_code: "USD"
    //                   }
    //                 },
    //                 {
    //                   id: "SHIP_456",
    //                   label: "Pick up in Store",
    //                   type: "PICKUP",
    //                   selected: false,
    //                   amount: {
    //                     value: "0.00",
    //                     currency_code: "USD"
    //                   }
    //                 }
    //               ]
    //             }
    //           }]
    //         });
    //       }
    //     }).render(this.paypalElement.nativeElement);
    //   })
  }

  ngAfterViewInit(): void {
    const bookFrontElement = this.bookFront.nativeElement
    bookFrontElement.addEventListener('mouseenter', () => {
      this.bookWrap.nativeElement.classList.add('rotate');
    });
    bookFrontElement.addEventListener('mouseleave', () => {
      this.bookWrap.nativeElement.classList.remove('rotate');
    });
    bookFrontElement.addEventListener('click', () => {
      this.bookWrap.nativeElement.classList.add('flip');
    });
    this.bookBack.nativeElement.addEventListener('click', () => {
      this.bookWrap.nativeElement.classList.remove('flip');
    });
  }
}
