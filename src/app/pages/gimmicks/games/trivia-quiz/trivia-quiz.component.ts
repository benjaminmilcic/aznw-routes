import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GamesService } from '../games.service';
import { AnswerLetter, TriviaQuestion } from './trivia-quiz.model';
import { TriviaQuizService } from './trivia-quiz.service';

/** Anzahl der Fragen pro Runde. */
const QUESTIONS_PER_ROUND = 15;

/**
 * Quiz "Schon gewusst?" mit drei Antwortmoeglichkeiten und Erlaeuterung.
 * Die Fragen kommen aus der Datenbank (Tabelle trivia_questions) ueber die API,
 * die Illustrationen liegen im Frontend unter assets/quiz-illustrations/.
 */
@Component({
  selector: 'app-trivia-quiz',
  imports: [CommonModule, TranslateModule],
  templateUrl: './trivia-quiz.component.html',
  styleUrl: './trivia-quiz.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriviaQuizComponent implements OnInit {
  private readonly quizService = inject(TriviaQuizService);
  private readonly gamesService = inject(GamesService);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly questions = signal<TriviaQuestion[]>([]);
  protected readonly index = signal(0);
  /** Angeklickte Antwort der aktuellen Frage, null solange nicht geantwortet. */
  protected readonly selected = signal<AnswerLetter | null>(null);
  protected readonly rightAnswers = signal(0);
  protected readonly wrongAnswers = signal(0);
  protected readonly finished = signal(false);

  protected readonly total = computed(() => this.questions().length);
  protected readonly current = computed<TriviaQuestion | null>(
    () => this.questions()[this.index()] ?? null
  );
  protected readonly answered = computed(() => this.selected() !== null);
  protected readonly isRight = computed(
    () => this.selected() === this.current()?.correctAnswer
  );
  protected readonly explanationParagraphs = computed(() =>
    (this.current()?.explanation ?? '').split('\n\n').filter((part) => !!part)
  );
  protected readonly answeredCount = computed(
    () => this.rightAnswers() + this.wrongAnswers()
  );
  /** Anteil richtiger Antworten in Prozent, 0 wenn noch nichts beantwortet. */
  protected readonly percentRight = computed(() => {
    const answered = this.answeredCount();
    return answered === 0
      ? 0
      : Math.round((this.rightAnswers() * 100) / answered);
  });

  ngOnInit(): void {
    this.gamesService.changeGameName.next('trivia-quiz');
    this.loadQuestions();
  }

  protected loadQuestions(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.quizService.getRandomQuestions(QUESTIONS_PER_ROUND).subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.resetRound();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Quizfragen konnten nicht geladen werden', err);
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected answer(letter: AnswerLetter): void {
    if (this.answered()) {
      return;
    }
    this.selected.set(letter);
    if (letter === this.current()?.correctAnswer) {
      this.rightAnswers.update((value) => value + 1);
    } else {
      this.wrongAnswers.update((value) => value + 1);
    }
  }

  protected next(): void {
    if (this.index() + 1 >= this.total()) {
      this.finished.set(true);
      return;
    }
    this.index.update((value) => value + 1);
    this.selected.set(null);
  }

  protected quit(): void {
    this.finished.set(true);
  }

  /** Neue Runde mit neuen Zufallsfragen. */
  protected newRound(): void {
    this.loadQuestions();
  }

  /** In der Datenbank stehen die Bildpfade ohne fuehrenden Schraegstrich. */
  protected imageUrl(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Zustandsklasse eines Antwort-Knopfes: vor der Antwort neutral, danach
   * die richtige Antwort gruen und die falsch gewaehlte rot.
   */
  protected answerState(letter: AnswerLetter): string {
    if (!this.answered()) {
      return '';
    }
    if (letter === this.current()?.correctAnswer) {
      return 'is-right';
    }
    return letter === this.selected() ? 'is-wrong' : 'is-muted';
  }

  private resetRound(): void {
    this.index.set(0);
    this.selected.set(null);
    this.rightAnswers.set(0);
    this.wrongAnswers.set(0);
    this.finished.set(false);
  }
}
