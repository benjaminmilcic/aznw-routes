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

  /** Random questions for a round. */
  getRandomQuestions(
    count: number,
    language: QuestionLanguage
  ): Observable<TriviaQuestion[]> {
    return this.http.get<TriviaQuestion[]>(
      `${environment.triviaQuiz.randomQuestionsApi}?count=${count}&lang=${language}`
    );
  }

  /**
   * The same questions in another language. That way the running round with
   * score and position is kept when the language changes.
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
