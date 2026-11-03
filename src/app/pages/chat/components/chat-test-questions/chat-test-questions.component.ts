import { Component, output, signal } from '@angular/core';

interface TestQuestion {
  number: number;
  question: string;
  /** What the answer should contain (the part in brackets in the file) */
  expected: string;
}

/**
 * TEMPORARY test aid, only in development builds: a select with the numbered questions of
 * ai-chat-knowledge-base/test-questions.md (served as asset by the "development" configuration in angular.json).
 * Remove this component, its use in chat.component.html and the asset entry when it is no longer needed.
 */
@Component({
  selector: 'app-chat-test-questions',
  templateUrl: './chat-test-questions.component.html',
  styleUrl: './chat-test-questions.component.scss',
})
export class ChatTestQuestionsComponent {
  /** The selected question, to be sent */
  readonly ask = output<string>();
  protected readonly questions = signal<TestQuestion[]>([]);

  constructor() {
    fetch('assets/chat-test/test-questions.md')
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => this.questions.set(parse(text)))
      .catch(() => this.questions.set([]));
  }

  protected pick(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const question = this.questions().find((q) => q.number === Number(select.value));
    select.value = '';
    if (question) this.ask.emit(question.question);
  }
}

/** Lines like "12. Welche Technologien …? (expected answer)" */
function parse(markdown: string): TestQuestion[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(\d+)\.\s+(.+?)(?:\s+\(([^()]*)\))?\s*$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => ({ number: Number(match[1]), question: match[2], expected: match[3] ?? '' }));
}
