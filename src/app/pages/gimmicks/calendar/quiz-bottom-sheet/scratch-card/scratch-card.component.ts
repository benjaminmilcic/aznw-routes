import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  Renderer2,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-scratch-card',
    imports: [TranslateModule],
    templateUrl: './scratch-card.component.html',
    styleUrl: './scratch-card.component.css'
})
export class ScratchCardComponent implements AfterViewInit, OnChanges {
  @Input() word: string;

  @ViewChild('scratchCanvas')
  scratchCanvas: ElementRef<HTMLCanvasElement>;

  context: CanvasRenderingContext2D;

  isDragging = false;

  @HostListener('touchstart', ['$event']) onTouchStart(event) {
    event.preventDefault();
    this.isDragging = true;
    let rect = this.scratchCanvas.nativeElement.getBoundingClientRect();
    this.scratch(
      event.touches[0].pageX - rect.x,
      event.touches[0].pageY - rect.y
    );
  }

  @HostListener('touchmove', ['$event']) onTouchMove(event) {
    event.preventDefault();
    if (this.isDragging) {
      let rect = this.scratchCanvas.nativeElement.getBoundingClientRect();
      this.scratch(
        event.touches[0].pageX - rect.x,
        event.touches[0].pageY - rect.y
      );
    }
  }

  @HostListener('touchend', ['$event']) onTouchEnd(event) {
    event.preventDefault();
    this.isDragging = false;
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
    let rect = this.scratchCanvas.nativeElement.getBoundingClientRect();
    this.scratch(event.pageX - rect.x, event.pageY - rect.y);
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
    event.preventDefault();
    if (this.isDragging) {
      let rect = this.scratchCanvas.nativeElement.getBoundingClientRect();
      this.scratch(event.pageX - rect.x, event.pageY - rect.y);
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  constructor(
    private renderer: Renderer2,
    private translate: TranslateService
  ) {}

  ngAfterViewInit(): void {
    this.context = this.scratchCanvas.nativeElement.getContext('2d');
    this.fillScratchCard();
  }

  fillScratchCard() {
    this.context.globalCompositeOperation = 'source-over';
    const grad = this.context.createLinearGradient(0, 0, 0, 50);
    grad.addColorStop(0, '#fecaca');
    grad.addColorStop(1, '#60a5fa');
    this.context.fillStyle = grad;
    this.context.fillRect(0, 0, 250, 50);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['word'].firstChange) {
      this.fillScratchCard();
    }
  }

  scratch(x: number, y: number) {
    this.context.globalCompositeOperation = 'destination-out';
    this.context.beginPath();
    this.context.arc(x, y, 7, 0, 2 * Math.PI);
    this.context.fill();
  }
}
