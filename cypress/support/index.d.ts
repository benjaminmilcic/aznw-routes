import type { VisitAppOptions } from './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Opens a route of the app and waits until the loading screen from
       * index.html has disappeared. Optionally sets language, signed-in
       * user and a deterministic random generator before the
       * application starts.
       */
      visitApp(path: string, options?: VisitAppOptions): Chainable<void>;

      /** Short form for `cy.get('[data-cy="..."]')`. */
      byCy(name: string): Chainable<JQuery<HTMLElement>>;

      /** Text of the element without surrounding spaces (including non-breaking ones). */
      trimmedText(): Chainable<string>;

      /** Turns off fonts, icon kits, Google Maps and tiles. */
      stubExternals(): Chainable<void>;

      /** Answers all otherwise open API calls with an empty list. */
      stubBackend(): Chainable<void>;
    }
  }
}

export {};
