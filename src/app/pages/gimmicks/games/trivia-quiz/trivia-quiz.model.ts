export type AnswerLetter = 'A' | 'B' | 'C';

export interface TriviaAnswer {
  letter: AnswerLetter;
  text: string;
}

/** Eine Frage, wie sie die API unter /trivia/questions liefert. */
export interface TriviaQuestion {
  id: number;
  questionNumber: number;
  question: string;
  answers: TriviaAnswer[];
  correctAnswer: AnswerLetter;
  /** Absaetze sind mit \n\n getrennt. */
  explanation: string;
  /** Pfad relativ zum Frontend, z. B. assets/quiz-illustrations/pinguin.svg */
  image: string | null;
  /** Themenbereich, wird als Chip ueber der Frage angezeigt. */
  category: string;
}
