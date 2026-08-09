import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { QuestionLanguage, TriviaQuestion } from './trivia-quiz.model';

@Injectable({
  providedIn: 'root',
})
export class TriviaQuizService {
  private readonly http = inject(HttpClient);

  /** Zufaellige Fragen fuer eine Runde. */
  getRandomQuestions(
    count: number,
    language: QuestionLanguage
  ): Observable<TriviaQuestion[]> {
    return this.http.get<TriviaQuestion[]>(
      `${environment.triviaQuiz.randomQuestionsApi}?count=${count}&lang=${language}`
    );
  }

  /**
   * Dieselben Fragen in einer anderen Sprache. Damit bleibt beim Sprachwechsel
   * die laufende Runde mit Punktestand und Position erhalten.
   */
  getQuestionsByNumbers(
    numbers: number[],
    language: QuestionLanguage
  ): Observable<TriviaQuestion[]> {
    return this.http.get<TriviaQuestion[]>(
      `${environment.triviaQuiz.questionsByNumbersApi}?numbers=${numbers.join(
        ','
      )}&lang=${language}`
    );
  }
}
