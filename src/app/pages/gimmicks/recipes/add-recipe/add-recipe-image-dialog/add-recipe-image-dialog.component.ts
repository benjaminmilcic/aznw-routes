import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AngularCropperjsModule, CropperComponent } from 'angular-cropperjs';

@Component({
  selector: 'app-add-recipe-image-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    AngularCropperjsModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './add-recipe-image-dialog.component.html',
  styleUrl: './add-recipe-image-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRecipeImageDialogComponent implements OnInit {
  @ViewChild('angularCropper') public angularCropper!: CropperComponent;
  config = signal<any>({});
  imageUrl = signal<string>('');
  isDragging = signal<boolean>(false);

  cropperEnabled = signal<boolean>(true);

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.setConfig();
  }

  // cropperConfig = {
  //   aspectRatio: 1,
  //   viewMode: 1,
  //   guides: true,
  //   center: true,
  //   highlight: true,
  //   cropBoxResizable: true,
  //   cropBoxMovable: true,
  //   dragMode: 'move' as const,
  //   autoCropArea: 1,
  //   responsive: true,
  // };

  constructor(public dialogRef: MatDialogRef<AddRecipeImageDialogComponent>) {}

  ngOnInit(): void {
    this.setConfig();
  }

  setConfig() {
    this.cropperEnabled.set(false);
    if (window.innerHeight <= 420) {
      this.config.set({
        viewMode: 1,
        aspectRatio: 1,
        guides: true,
        center: false,
        minContainerWidth: 180,
        minContainerHeight: 180,
      });
    } else if (window.innerWidth > 650 && window.innerHeight > 800) {
      this.config.set({
        viewMode: 1,
        aspectRatio: 1,
        guides: true,
        center: false,
        minContainerWidth: 400,
        minContainerHeight: 400,
      });
    } else {
      this.config.set({
        viewMode: 1,
        aspectRatio: 1,
        guides: true,
        center: false,
        minContainerWidth: 260,
        minContainerHeight: 260,
      });
    }
    setTimeout(() => {
      this.cropperEnabled.set(true);
    }, 50);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine Bilddatei aus.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Die Datei ist zu groß. Maximale Größe: 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.imageUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  onCrop(): void {
    if (this.angularCropper && this.angularCropper.cropper) {
      const canvas = this.angularCropper.cropper.getCroppedCanvas({
        width: 200,
        height: 200,
      });
      if (canvas) {
        const croppedImage = canvas.toDataURL();
        this.dialogRef.close(croppedImage);
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  moveRight() {
    this.angularCropper.cropper.move(10, 0);
  }

  moveLeft() {
    this.angularCropper.cropper.move(-10, 0);
  }

  moveUp() {
    this.angularCropper.cropper.move(0, -10);
  }

  moveDown() {
    this.angularCropper.cropper.move(0, 10);
  }

  zoomIn() {
    this.angularCropper.cropper.zoom(0.1);
  }

  zoomOut() {
    this.angularCropper.cropper.zoom(-0.1);
  }

  reset() {
    this.angularCropper.cropper.reset();
  }
}
