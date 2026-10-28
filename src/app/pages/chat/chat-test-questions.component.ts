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
  template: `
    @if (questions().length) {
      <select
        class="test-select"
        data-cy="chat-test-questions"
        aria-label="Testfrage"
        (change)="pick($event)"
      >
        <option value="">Testfrage …</option>
        @for (q of questions(); track q.number) {
          <option [value]="q.number" [title]="q.expected">{{ q.number }}. {{ q.question }}</option>
        }
      </select>
    }
  `,
  styles: `
    .test-select {
      max-width: min(40vw, 260px);
      height: 28px;
      margin-right: 6px;
      padding: 0 6px;
      border: 1px dashed #fbbf24;
      border-radius: 6px;
      background: #0f172a;
      color: #fde68a;
      font-size: 0.75rem;
    }
  `,
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
