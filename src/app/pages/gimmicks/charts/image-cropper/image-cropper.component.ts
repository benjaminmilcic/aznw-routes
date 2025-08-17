import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AngularCropperjsModule, CropperComponent } from 'angular-cropperjs';

@Component({
    selector: 'app-image-cropper',
    imports: [
        IonHeader,
        IonToolbar,
        IonTitle,
        IonButtons,
        IonButton,
        IonContent,
        IonFab,
        IonFabButton,
        AngularCropperjsModule,
        CommonModule,
        MatIcon,
        IonIcon,
        TranslateModule,
    ],
    templateUrl: './image-cropper.component.html',
    styleUrl: './image-cropper.component.css'
})
export class ImageCropperComponent implements OnInit {
  @ViewChild('cropper') public cropper: CropperComponent;
  @Input() imageUrl: string;
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.setConfig();
  }

  config;
  cropperEnabled = true;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.setConfig();
  }

  setConfig() {
    this.cropperEnabled = false;
    if (window.innerHeight <= 420) {
      this.config = {
        viewMode: 1,
        aspectRatio: 1,
        guides: false,
        center: false,
        minContainerWidth: 180,
        minContainerHeight: 180,
      };
    } else if (window.innerWidth > 650 && window.innerHeight > 800) {
      this.config = {
        viewMode: 1,
        aspectRatio: 1,
        guides: false,
        center: false,
        minContainerWidth: 400,
        minContainerHeight: 400,
      };
    } else {
      this.config = {
        viewMode: 1,
        aspectRatio: 1,
        guides: false,
        center: false,
        minContainerWidth: 260,
        minContainerHeight: 260,
      };
    }
    setTimeout(() => {
      this.cropperEnabled = true;
    }, 50);
  }

  async onFileSelected(event) {
    const file: File = event.target.files[0];
    this.imageUrl = URL.createObjectURL(file);
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    let canvas: HTMLCanvasElement;
    canvas = this.cropper.cropper.getCroppedCanvas({
      width: 400,
      height: 400,
    });
    const imageSrc = canvas.toDataURL('image/png');
    this.modalCtrl.dismiss(imageSrc, 'save');
  }

  moveRight() {
    this.cropper.cropper.move(10, 0);
  }

  moveLeft() {
    this.cropper.cropper.move(-10, 0);
  }

  moveUp() {
    this.cropper.cropper.move(0, -10);
  }

  moveDown() {
    this.cropper.cropper.move(0, 10);
  }

  zoomIn() {
    this.cropper.cropper.zoom(0.1);
  }

  zoomOut() {
    this.cropper.cropper.zoom(-0.1);
  }

  reset() {
    this.cropper.cropper.reset();
  }
}
