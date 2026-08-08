import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { QuizQuestion } from './wwds-quiz.model';

@Injectable({
  providedIn: 'root',
})
export class WwdsQuizService {
  private readonly http = inject(HttpClient);

  /** Zufaellige Fragen fuer eine Runde. */
  getRandomQuestions(count: number): Observable<QuizQuestion[]> {
    return this.http.get<QuizQuestion[]>(
      `${environment.wwdsQuiz.randomQuestionsApi}?count=${count}`
    );
  }
}
