import type { VisitAppOptions } from './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Oeffnet eine Route der App und wartet, bis der Ladebildschirm aus
       * index.html verschwunden ist. Setzt auf Wunsch Sprache, angemeldeten
       * Benutzer und einen deterministischen Zufallsgenerator, bevor die
       * Anwendung startet.
       */
      visitApp(path: string, options?: VisitAppOptions): Chainable<void>;

      /** Kurzform fuer `cy.get('[data-cy="..."]')`. */
      byCy(name: string): Chainable<JQuery<HTMLElement>>;

      /** Text des Elements ohne umgebende Leerzeichen (auch geschuetzte). */
      trimmedText(): Chainable<string>;

      /** Schaltet Schriften, Icon-Kits, Google Maps, Kacheln und Analytics ab. */
      stubExternals(): Chainable<void>;

      /** Beantwortet alle sonst offenen API-Aufrufe mit einer leeren Liste. */
      stubBackend(): Chainable<void>;
    }
  }
}

export {};
