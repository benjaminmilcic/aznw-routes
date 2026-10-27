import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Taken over from the whiteboard app.
 *
 * Makes an element draggable with the mouse or a finger (e.g. the result dialog,
 * so that you can push it aside and check the final game state).
 *
 * Clicks on buttons etc. inside the element do NOT start dragging,
 * so that the buttons stay usable as normal.
 */
@Directive({
  selector: '[appDraggable]',
  standalone: true,
})
export class DraggableDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  private dragging = false;
  private startX = 0;
  private startY = 0;
  private baseX = 0;
  private baseY = 0;

  constructor() {
    this.el.style.touchAction = 'none';
    this.el.style.cursor = 'grab';
    this.el.addEventListener('pointerdown', this.onDown);
  }

  private onDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement;
    // Don't use controls for dragging – only grab the "empty" dialog.
    if (target.closest('button, a, input, select, textarea, label')) return;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.el.style.cursor = 'grabbing';
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const x = this.baseX + (e.clientX - this.startX);
    const y = this.baseY + (e.clientY - this.startY);
    this.el.style.transform = `translate(${x}px, ${y}px)`;
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.baseX += e.clientX - this.startX;
    this.baseY += e.clientY - this.startY;
    this.el.style.cursor = 'grab';
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  };

  ngOnDestroy(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  }
}
