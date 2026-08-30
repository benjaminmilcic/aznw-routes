/**
 * Diagramm-Seite.
 *
 * Chart.js zeichnet in ein <canvas>. Pixel zu vergleichen waere sinnlos und
 * bei jeder Stiländerung rot. Geprueft wird deshalb die Verdrahtung: kommt
 * beim Umschalten der Diagrammtyp an, entsteht eine Zeichenflaeche mit echter
 * Groesse, und reagieren die Filter darunter.
 *
 * Die Segmente werden ueber ihren `value` angesprochen, nicht ueber ihre
 * Beschriftung: das <ion-label> darin hat `pointer-events: none` und laesst
 * sich gar nicht anklicken - ausserdem bleibt der Test so sprachunabhaengig.
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
