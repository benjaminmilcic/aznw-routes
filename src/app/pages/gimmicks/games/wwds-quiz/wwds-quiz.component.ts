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
import { AnswerLetter, QuizQuestion } from './wwds-quiz.model';
import { WwdsQuizService } from './wwds-quiz.service';

/** Anzahl der Fragen pro Runde. */
const QUESTIONS_PER_ROUND = 15;

/**
 * Quiz mit den Fragen aus dem Buch "Wer weiss denn sowas?".
 * Die Fragen kommen aus der Datenbank (Tabelle quiz_questions) ueber die API,
 * die Illustrationen liegen im Frontend unter assets/quiz-wwds/.
 */
@Component({
  selector: 'app-wwds-quiz',
  imports: [CommonModule, TranslateModule],
  templateUrl: './wwds-quiz.component.html',
  styleUrl: './wwds-quiz.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwdsQuizComponent implements OnInit {
  private readonly quizService = inject(WwdsQuizService);
  private readonly gamesService = inject(GamesService);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly questions = signal<QuizQuestion[]>([]);
  protected readonly index = signal(0);
  /** Angeklickte Antwort der aktuellen Frage, null solange nicht geantwortet. */
  protected readonly selected = signal<AnswerLetter | null>(null);
  protected readonly rightAnswers = signal(0);
  protected readonly wrongAnswers = signal(0);
  protected readonly finished = signal(false);

  protected readonly total = computed(() => this.questions().length);
  protected readonly current = computed<QuizQuestion | null>(
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
    this.gamesService.changeGameName.next('wwds-quiz');
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
