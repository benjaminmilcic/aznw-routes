export type AnswerLetter = 'A' | 'B' | 'C';

export interface QuizAnswer {
  letter: AnswerLetter;
  text: string;
}

/** Eine Quizfrage, wie sie die API unter /quiz/questions liefert. */
export interface QuizQuestion {
  id: number;
  questionNumber: number;
  question: string;
  answers: QuizAnswer[];
  correctAnswer: AnswerLetter;
  /** Absaetze sind mit \n\n getrennt. */
  explanation: string;
  /** Pfad relativ zum Frontend, z. B. assets/quiz-wwds/frage-001.jpeg */
  questionImage: string | null;
  explanationImage: string | null;
  source: string;
}
