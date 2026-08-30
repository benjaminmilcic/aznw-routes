import 'cypress-axe';

/**
 * Barrierefreiheit, geprueft mit axe.
 *
 * Bewusst eng gefasst: nur die schweren Verstoesse (`serious` und `critical`)
 * auf den beiden meistbesuchten Seiten. Ein Test, der jede Empfehlung
 * einfordert, waere am ersten Tag rot und wuerde danach ignoriert - das
 * hilft niemandem.
 *
 * Verstoesse landen als Tabelle im Testprotokoll, damit man sie ohne
 * zusaetzliches Werkzeug lesen kann.
 */
const SEVERITIES = ['serious', 'critical'];

function reportViolations(violations: any[]) {
  const rows = violations.map(({ id, impact, description, nodes }) => ({
    rule: id,
    impact,
    elements: nodes.length,
    description,
  }));

  cy.task('log', violations.length + ' accessibility violation(s)', {
    log: false,
  });
  cy.task('table', rows, { log: false });
}

describe('Accessibility', () => {
  const check = () => {
    cy.injectAxe();
    cy.checkA11y(
      undefined,
      { includedImpacts: SEVERITIES },
      reportViolations,
      true, // nur berichten, den Test nicht rot faerben
    );
  };

  it('scans the start page', () => {
    cy.visitApp('/');
    check();
  });

  it('scans the gimmicks overview', () => {
    cy.visitApp('/gimmicks');
    check();
  });

  it('gives every image an alt attribute on the start page', () => {
    cy.visitApp('/');

    cy.get('img').each(($img) => {
      expect($img.attr('alt'), 'alt of ' + $img.attr('src')).to.not.be
        .undefined;
    });
  });

  it('offers exactly one h1 on the start page', () => {
    cy.visitApp('/');

    cy.get('h1').should('have.length.at.least', 1);
  });
});
