#!/usr/bin/env node
/**
 * Ein Befehl fuer den kompletten Testlauf: `npm run e2e`.
 *
 * Laeuft auf Port 4200 schon ein Dev-Server, wird dieser benutzt. Nur wenn
 * keiner antwortet, startet das Script selbst einen und beendet ihn nach dem
 * Durchlauf wieder.
 *
 * Diese Unterscheidung ist kein Komfort, sondern Absicht: zwei parallele
 * `ng serve` schreiben denselben Webpack-Cache in `.angular/cache` und der
 * Dev-Server liefert danach dauerhaft veraltete Bundles aus - auch nach einem
 * Neustart. Der Fehler sieht aus wie ein Fehler im Code und ist keiner.
 *
 * Argumente gehen an Cypress weiter:
 *
 *     npm run e2e -- --spec "cypress/e2e/navigation/routing.cy.ts"
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const PORT = 4200;
const BASE_URL = `http://localhost:${PORT}/`;
/** Wie lange auf einen selbst gestarteten Server gewartet wird. */
const START_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 2000;

const cypressArgs = process.argv.slice(2);

/** Antwortet auf Port 4200 bereits etwas? */
async function serverIsUp() {
  try {
    const response = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Pfad zur Angular-CLI, aus deren package.json gelesen statt geraten. */
function findAngularCli() {
  const manifestPath = require.resolve('@angular/cli/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const bin =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.ng;
  return join(dirname(manifestPath), bin);
}

function runCypress() {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [join(here, 'cypress.mjs'), 'run', ...cypressArgs],
      { stdio: 'inherit' },
    );
    child.on('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
    child.on('error', () => resolve(1));
  });
}

function startDevServer() {
  return spawn(
    process.execPath,
    [findAngularCli(), 'serve', '--port', String(PORT)],
    // Die Ausgabe des Servers wuerde die Testausgabe zerschneiden; bleibt er
    // aus, faellt das ueber den Zeitablauf weiter unten auf.
    { stdio: 'ignore' },
  );
}

/**
 * Beendet den Server samt Kindprozessen.
 *
 * `child.kill()` beendet unter Windows nur den angegebenen Prozess - die
 * Build-Worker des Dev-Servers wuerden weiterlaufen und Port 4200 belegt
 * halten. `taskkill /T` raeumt den ganzen Baum ab.
 */
function stopDevServer(server) {
  if (!server.pid) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    server.kill('SIGTERM');
  }
}

async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    if (await serverIsUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

if (await serverIsUp()) {
  console.log(`Dev-Server auf Port ${PORT} laeuft bereits - wird mitbenutzt.`);
  process.exit(await runCypress());
}

console.log(`Kein Server auf Port ${PORT}. Starte einen fuer diesen Lauf ...`);
const server = startDevServer();

let exitCode = 1;
try {
  if (await waitForServer(Date.now() + START_TIMEOUT_MS)) {
    console.log('Dev-Server bereit.');
    exitCode = await runCypress();
  } else {
    console.error(
      `Der Dev-Server war nach ${START_TIMEOUT_MS / 1000} s nicht erreichbar. ` +
        '"npm start" von Hand aufgerufen zeigt die Ursache.',
    );
  }
} finally {
  stopDevServer(server);
}

process.exit(exitCode);
