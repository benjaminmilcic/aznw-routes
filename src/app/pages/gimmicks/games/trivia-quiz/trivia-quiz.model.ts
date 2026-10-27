export type AnswerLetter = 'A' | 'B' | 'C';
export type QuestionLanguage = 'de' | 'en' | 'hr';

export interface TriviaAnswer {
  letter: AnswerLetter;
  text: string;
}

/** A question as the API delivers it under /trivia/questions. */
export interface TriviaQuestion {
  id: number;
  /** The same question across all languages. */
  questionNumber: number;
  language: QuestionLanguage;
  question: string;
  answers: TriviaAnswer[];
  correctAnswer: AnswerLetter;
  /** Paragraphs are separated by \n\n. */
  explanation: string;
  /** Path relative to the frontend, e.g. assets/quiz-illustrations/pinguin.svg */
  image: string | null;
  /** Topic, shown as a chip above the question. */
  category: string;
}
