import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-telegram',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './telegram.component.html',
  styleUrl: './telegram.component.scss',
})
export class TelegramComponent {}
