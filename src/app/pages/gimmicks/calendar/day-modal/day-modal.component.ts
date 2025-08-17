import { Component, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  IonHeader,
  ModalController,
  IonContent,
  IonToolbar,
  IonTitle,
  IonCard,
  IonFab,
  IonFabButton,
  IonIcon,
  IonButton,
  IonButtons,
  IonInput,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-day-modal',
    imports: [
        IonCard,
        IonContent,
        IonHeader,
        IonTitle,
        IonToolbar,
        IonCard,
        IonFab,
        IonFabButton,
        IonIcon,
        IonButton,
        IonButtons,
        IonInput,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        TranslateModule,
    ],
    templateUrl: './day-modal.component.html',
    styleUrl: './day-modal.component.css'
})
export class DayModalComponent implements OnInit {
  @Input() day: number;
  @Input() month: string;
  @Input() year: number;
  @Input() from: string;

  @Output() ActionEvent;

  hours = new FormGroup({
    h0: new FormControl(''),
    h1: new FormControl(''),
    h2: new FormControl(''),
    h3: new FormControl(''),
    h4: new FormControl(''),
    h5: new FormControl(''),
    h6: new FormControl(''),
    h7: new FormControl(''),
    h8: new FormControl(''),
    h9: new FormControl(''),
    h10: new FormControl(''),
    h11: new FormControl(''),
    h12: new FormControl(''),
    h13: new FormControl(''),
    h14: new FormControl(''),
    h15: new FormControl(''),
    h16: new FormControl(''),
    h17: new FormControl(''),
    h18: new FormControl(''),
    h19: new FormControl(''),
    h20: new FormControl(''),
    h21: new FormControl(''),
    h22: new FormControl(''),
    h23: new FormControl(''),
  });

  originalHours = {
    h0: '',
    h1: '',
    h2: '',
    h3: '',
    h4: '',
    h5: '',
    h6: '',
    h7: '',
    h8: '',
    h9: '',
    h10: '',
    h11: '',
    h12: '',
    h13: '',
    h14: '',
    h15: '',
    h16: '',
    h17: '',
    h18: '',
    h19: '',
    h20: '',
    h21: '',
    h22: '',
    h23: '',
  };

  constructor(
    private modalCtrl: ModalController,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    const dayString = this.day.toString() + this.month + this.year.toString();
    const localStorageDay = localStorage.getItem(dayString);
    if (localStorageDay) {
      const valueJsonParsed = JSON.parse(localStorageDay);
      this.hours.setValue(valueJsonParsed);
      this.originalHours = JSON.parse(JSON.stringify(this.hours.value));
    }
    if (this.from === 'print') {
      const localStorageDay = localStorage.getItem('print');
      const valueJsonParsed = JSON.parse(localStorageDay);
      this.hours.setValue(valueJsonParsed);
    }
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    await this.modalCtrl.dismiss(null, 'save').then(() => {
      const dayString = this.day.toString() + this.month + this.year.toString();
      const valueJsonStringified = JSON.stringify(this.hours.value);
      localStorage.setItem(dayString, valueJsonStringified);
    });
  }

  isSaveButtonDisabled(): boolean {
    return (
      JSON.stringify(this.originalHours) === JSON.stringify(this.hours.value)
    );
  }

  print() {
    this.close();
    const valueJsonStringified = JSON.stringify(this.hours.value);
    localStorage.setItem('print', valueJsonStringified);
    this.ActionEvent.emit({
      day: this.day,
      month: this.month,
      year: this.year,
    });
  }
}
