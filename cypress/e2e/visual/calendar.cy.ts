/**
 * Kalenderseite.
 *
 * Der angezeigte Monat haengt vom aktuellen Datum ab. Damit die Tests nicht
 * je nach Tag anders ausgehen, friert `cy.clock()` die Zeit auf ein festes
 * Datum ein - der 15. Maerz 2026, ein Sonntag, mitten im Monat.
 */
describe('Calendar', () => {
  const FIXED_DATE = new Date(2026, 2, 15, 12, 0, 0);

  const openCalendar = (lang: 'de' | 'en' = 'en') => {
    cy.clock(FIXED_DATE, ['Date']);
    cy.visitApp('/gimmicks/calendar', { lang });
    cy.byCy('calendar-month').should('be.visible');
  };

  it('opens on the current month', () => {
    openCalendar();

    cy.byCy('calendar-month').should('contain.text', 'March');
  });

  it('steps to the next and previous month', () => {
    openCalendar();

    cy.byCy('calendar-next-month').click();
    cy.byCy('calendar-month').should('contain.text', 'April');

    cy.byCy('calendar-prev-month').click();
    cy.byCy('calendar-month').should('contain.text', 'March');
  });

  it('shows the right number of days for the month', () => {
    openCalendar();

    cy.get('.day').should('have.length', 31);

    cy.byCy('calendar-next-month').click();
    cy.get('.day').should('have.length', 30);
  });

  it('marks today', () => {
    openCalendar();

    cy.get('.day.border-blue-500, .day.bg-blue-100').should('exist');
  });

  it('opens the day dialog on a click', () => {
    openCalendar();

    cy.get('.day').eq(9).click();

    cy.get('mat-dialog-container, app-day-modal').should('be.visible');
  });

  it('shows the analog clock', () => {
    openCalendar();

    cy.get('app-analog-clock').should('exist');
  });
});
