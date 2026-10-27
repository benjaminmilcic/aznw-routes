/**
 * Charts page.
 *
 * Chart.js draws into a <canvas>. Comparing pixels would be pointless and
 * red on every style change. That's why the wiring is checked: does
 * the chart type arrive when switching, is a drawing area with a real
 * size created, and do the filters below react.
 *
 * The segments are addressed via their `value`, not via their
 * label: the <ion-label> inside has `pointer-events: none` and cannot
 * be clicked at all - besides, the test stays language-independent that way.
 */
describe('Charts', () => {
  const segment = (value: string) =>
    cy.get('ion-segment-button[value="' + value + '"]');

  const canvasHasSize = () => {
    cy.get('canvas')
      .should('be.visible')
      .and(($canvas) => {
        expect($canvas[0].clientWidth).to.be.greaterThan(0);
        expect($canvas[0].clientHeight).to.be.greaterThan(0);
      });
  };

  beforeEach(() => {
    cy.visitApp('/gimmicks/charts');
  });

  it('starts with the monthly line chart', () => {
    cy.get('app-line-chart').should('exist');
    canvasHasSize();
  });

  it('switches to the yearly comparison', () => {
    segment('yearly').click();

    cy.get('app-double-bar-chart').should('exist');
    cy.get('app-line-chart').should('not.exist');
    canvasHasSize();
  });

  it('switches to the percentage view and offers its filters', () => {
    segment('procentual').click();

    cy.get('app-pie-chart').should('exist');
    segment('2022').should('exist');
    segment('2023').should('exist');
    segment('electricity').should('exist');
    canvasHasSize();
  });

  it('keeps a chart on screen after switching the year', () => {
    segment('procentual').click();
    cy.get('app-pie-chart').should('exist');

    segment('2023').click();

    cy.get('app-pie-chart').should('exist');
    canvasHasSize();
  });

  it('switches the kind of consumption', () => {
    segment('procentual').click();
    cy.get('app-pie-chart').should('exist');

    segment('water').click();

    cy.get('app-pie-chart').should('exist');
    canvasHasSize();
  });

  it('offers every month as a period', () => {
    segment('procentual').click();

    cy.get('mat-select').first().click();
    cy.get('mat-option').should('have.length.at.least', 12);

    cy.get('body').type('{esc}');
  });
});
