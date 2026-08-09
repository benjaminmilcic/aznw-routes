import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TriviaQuestion } from './trivia-quiz.model';

@Injectable({
  providedIn: 'root',
})
export class TriviaQuizService {
  private readonly http = inject(HttpClient);

  /** Zufaellige Fragen fuer eine Runde. */
  getRandomQuestions(count: number): Observable<TriviaQuestion[]> {
    return this.http.get<TriviaQuestion[]>(
      `${environment.triviaQuiz.randomQuestionsApi}?count=${count}`
    );
  }
}
