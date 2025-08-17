import { Component, EventEmitter, Output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-filter-button',
    imports: [MatTooltipModule],
    templateUrl: './filter-button.component.html',
    styleUrl: './filter-button.component.css'
})
export class FilterButtonComponent {
  @Output() toggle = new EventEmitter<void>();
}
