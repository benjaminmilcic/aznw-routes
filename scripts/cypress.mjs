#!/usr/bin/env node
/**
 * Startet Cypress mit einer bereinigten Umgebung.
 *
 * Das integrierte Terminal von VS Code setzt `ELECTRON_RUN_AS_NODE=1`. Erbt
 * Cypress diese Variable, laeuft sein mitgeliefertes Electron als reines Node
 * und bricht mit `bad option: --smoke-test` ab - ohne jeden Hinweis auf die
 * Ursache. In einem normalen Terminal ist die Variable nicht gesetzt.
 *
 * Wegen dieser einen Zeile gibt es das Script: `ELECTRON_RUN_AS_NODE= cypress`
 * waere POSIX-Syntax und scheitert unter Windows, wo npm die Scripts ueber
 * cmd.exe ausfuehrt. Node kann die Variable dagegen ueberall entfernen.
 *
 * Alle Argumente werden unveraendert an Cypress durchgereicht:
 *
 *     node scripts/cypress.mjs run --spec "cypress/e2e/games/tiktaktoe.cy.ts"
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Pfad zur Cypress-CLI.
 *
 * `require.resolve('cypress/bin/cypress')` geht nicht - das Paket gibt den
 * Unterpfad in seinen `exports` nicht frei. Deshalb vom Einstiegspunkt aus
 * nach oben laufen, bis das package.json von Cypress auftaucht, und den
 * dort eingetragenen Befehl nehmen.
 */
function findCypressCli() {
  let directory;
  try {
    directory = dirname(require.resolve('cypress'));
  } catch {
    throw new Error(
      'Cypress ist nicht installiert. Bitte zuerst "npm install" ausfuehren.',
    );
  }

  while (directory !== dirname(directory)) {
    const manifestPath = join(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.name === 'cypress') {
        const bin =
          typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.cypress;
        return join(directory, bin);
      }
    }
    directory = dirname(directory);
  }

  throw new Error('Die Cypress-CLI wurde in node_modules nicht gefunden.');
}

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const child = spawn(
  process.execPath,
  [findCypressCli(), ...process.argv.slice(2)],
  { stdio: 'inherit', env: environment },
);

child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
