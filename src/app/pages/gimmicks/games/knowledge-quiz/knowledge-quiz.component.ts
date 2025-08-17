import { Component, OnInit } from '@angular/core';
import { Question, QUESTIONS } from './questions-deepseek3';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GamesService } from '../games.service';

@Component({
    selector: 'app-knowledge-quiz',
    imports: [MatButtonModule, MatIconModule, CommonModule, TranslateModule],
    templateUrl: './knowledge-quiz.component.html',
    styleUrl: './knowledge-quiz.component.css'
})
export class KnowledgeQuizComponent implements OnInit {
  questions: Question[] = JSON.parse(JSON.stringify(QUESTIONS));
  questionsAmount = this.questions.length;
  randomIndex: number;
  currentQuestion: Question;
  language: string;
  showRight = false;
  showWrong = false;
  rightAnswers = 0;
  wrongAnswers = 0;
  answers = [0, 1, 2, 3];
  buttonsDisabled = false;
  selectedAnswer = -1;
  showResult = false;

  constructor(
    private translateService: TranslateService,
    private gameService: GamesService
  ) {}

  ngOnInit(): void {
    this.gameService.changeGameName.next('knowledge-quiz');
    this.language = this.translateService.currentLang;
    this.translateService.onLangChange.subscribe(() => {
      this.language = this.translateService.currentLang;
    });
    this.newQuestion();
  }

  newQuestion() {
    if (this.questions.length > 0) {
      this.buttonsDisabled = false;
      this.selectedAnswer = -1;
      this.shuffle(this.answers);
      this.randomIndex = this.getRandomInt(0, this.questions.length - 1);
      this.currentQuestion = this.questions[this.randomIndex];
    }
  }

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  checkAnswer(index: number, selectedAnswer: number) {
    if (!this.buttonsDisabled) {
      this.buttonsDisabled = true;
      this.selectedAnswer = selectedAnswer;
      if (this.currentQuestion.correctAnswerIndex === index) {
        this.showRight = true;
        this.rightAnswers++;
      } else {
        this.showWrong = true;
        this.wrongAnswers++;
      }
    }
  }

  nextQuestion() {
    this.showRight = false;
    this.showWrong = false;
    this.questions.splice(this.randomIndex, 1);
    if (this.questions.length === 0) {
      this.showResult = true;
    } else {
      this.newQuestion();
    }
  }

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

  newGame() {
    this.showResult = false;
    this.questions = JSON.parse(JSON.stringify(QUESTIONS));
    this.showRight = false;
    this.showWrong = false;
    this.rightAnswers = 0;
    this.wrongAnswers = 0;
    this.selectedAnswer = -1;
    this.buttonsDisabled = false;
    this.newQuestion();
  }

  quitGame() {
    this.showResult = true;
  }
}
