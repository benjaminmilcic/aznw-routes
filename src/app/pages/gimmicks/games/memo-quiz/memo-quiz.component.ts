import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-memo-quiz',
    imports: [CommonModule, MatButtonModule, TranslateModule],
    templateUrl: './memo-quiz.component.html',
    styleUrl: './memo-quiz.component.css'
})
export class MemoQuizComponent implements OnInit {
  images: string[] = [
    'assets/memory-images/1.jpg',
    'assets/memory-images/2.jpg',
    'assets/memory-images/4.jpg',
    'assets/memory-images/5.jpg',
    'assets/memory-images/7.jpg',
    'assets/memory-images/9.jpg',
    'assets/memory-images/10.jpg',
    'assets/memory-images/11.jpg',
  ];
  cards: { src: string; flipped: boolean; locked: boolean }[] = [];
  cardA: number = null;
  cardB: number = null;
  checkMatch = false;

  shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }

  constructor(private gameService: GamesService){}

  ngOnInit(): void {
    this.gameService.changeGameName.next('memo-quiz');
    this.init();
  }

  async init() {
    if (this.cards.length > 0) {
      this.cards.forEach((card) => {
        card.flipped = false;
        card.locked = false;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.cards = [];
    this.cardA = null;
    this.cardB = null;
    this.checkMatch = false;
    this.images.forEach((image) => {
      this.cards.push({ src: image, flipped: false, locked: false });
      this.cards.push({ src: image, flipped: false, locked: false });
    });
    this.shuffle(this.cards);
  }

  onCardClick(cardIndex: number) {
    if (this.cards[cardIndex].flipped || this.cards[cardIndex].locked) {
      return;
    }
    if (!this.checkMatch) {
      if (this.cardA === null && this.cardB === null) {
        this.cards[cardIndex].flipped = true;
        this.cardA = cardIndex;
      } else if (this.cardA !== null && this.cardB === null) {
        this.cards[cardIndex].flipped = true;
        this.cardB = cardIndex;
        this.checkMatch = true;
      }
      if (this.checkMatch) {
        if (this.cards[this.cardA].src === this.cards[this.cardB].src) {
          this.cards[this.cardA].locked = true;
          this.cards[this.cardB].locked = true;
          this.cardA = null;
          this.cardB = null;
          this.checkMatch = false;
        } else {
          setTimeout(() => {
            this.cards[this.cardA].flipped = false;
            this.cards[this.cardB].flipped = false;
            this.cardA = null;
            this.cardB = null;
            this.checkMatch = false;
          }, 2500);
        }
      }
    }
  }
}
