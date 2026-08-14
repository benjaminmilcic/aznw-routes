/**
 * Baut den semantischen Such-Index.
 *
 *   node scripts/build-search-index.mjs
 *
 * Ablauf:
 *   1. Liest alle i18n-Dateien (de/en/hr) und die hardcodierten Tech-Listen aus
 *      overview.constants.ts.
 *   2. Setzt pro Route (siehe search-config.mjs) einen mehrsprachigen Text-Blob
 *      zusammen.
 *   3. Schickt jeden Blob an den Cloudflare-Worker (/embed, bge-m3) und holt den
 *      Embedding-Vektor.
 *   4. Normalisiert die Vektoren und schreibt src/assets/search-index.json.
 *
 * Voraussetzung: Der Worker mit dem /embed-Endpoint ist deployed.
 * Worker-URL via Umgebungsvariable EMBED_URL überschreibbar.
 * Secret via WORKER_SECRET (gleicher Wert wie in Nest und Wrangler).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SEARCH_ROUTES } from './search-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const I18N_DIR = resolve(ROOT, 'src/assets/i18n');
const OVERVIEW_CONSTANTS = resolve(
  ROOT,
  'src/app/pages/gimmicks/overview/overview.constants.ts'
);
const OUTPUT = resolve(ROOT, 'src/assets/search-index.json');
const LANGS = ['de', 'en', 'hr'];
const EMBED_URL =
  process.env.EMBED_URL ||
  'https://little-sky-725e.benjamin-milcic.workers.dev/embed';
const WORKER_SECRET = process.env.WORKER_SECRET || '';

/** Wert an einem Punkt-Pfad ("gimmicks.weather") aus einem Objekt holen. */
function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** Alle Blatt-Strings unterhalb eines Werts einsammeln (rekursiv). */
function collectLeaves(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectLeaves(v, out);
  }
  return out;
}

/**
 * Hardcodierte `elements` aus overview.constants.ts je goToPage einsammeln.
 * Trennt i18n-Keys (werden später pro Sprache aufgelöst) von festen Literalen
 * (Tech-Begriffe wie "NestJS API", "Chart.js").
 */
async function parseOverviewConstants(i18nDe) {
  const map = {}; // route -> { keys: [], literals: [] }
  let src = '';
  try {
    src = await readFile(OVERVIEW_CONSTANTS, 'utf8');
  } catch {
    return map;
  }

  const blockRe = /goToPage:\s*'([^']+)'[\s\S]*?elements:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const route = m[1];
    const body = m[2];
    const keys = [];
    const literals = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) continue; // auskommentierte Zeilen ignorieren
      const strRe = /'([^']+)'/g;
      let s;
      while ((s = strRe.exec(trimmed)) !== null) {
        const val = s[1];
        // Sieht aus wie ein i18n-Key und ist auflösbar -> Key, sonst Literal.
        if (val.includes('.') && typeof resolvePath(i18nDe, val) === 'string') {
          keys.push(val);
        } else {
          literals.push(val);
        }
      }
    }
    map[route] = { keys, literals };
  }
  return map;
}

/** Embedding für einen Text vom Worker holen. */
async function embed(text) {
  if (!WORKER_SECRET) {
    throw new Error(
      'WORKER_SECRET fehlt. Derselbe Wert wie in der Nest-.env und bei wrangler secret put.',
    );
  }
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Worker-Secret': WORKER_SECRET,
    },
    body: JSON.stringify({ q: text }),
  });
  if (!res.ok) {
    throw new Error(`Embed failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  if (!Array.isArray(json.vector)) {
    throw new Error('Embed response missing vector');
  }
  return json.vector;
}

/** L2-Normalisierung + auf 4 Nachkommastellen runden (kleinere Datei). */
function normalize(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => Number((v / norm).toFixed(4)));
}

async function main() {
  const i18n = {};
  for (const lang of LANGS) {
    i18n[lang] = JSON.parse(
      await readFile(resolve(I18N_DIR, `${lang}.json`), 'utf8')
    );
  }

  const hardcoded = await parseOverviewConstants(i18n.de);

  const routes = [];
  let i = 0;
  for (const cfg of SEARCH_ROUTES) {
    i++;
    const parts = [];
    const push = (s) => {
      if (typeof s === 'string' && s.trim()) parts.push(s.trim());
    };

    let extra = hardcoded[cfg.route] || { keys: [], literals: [] };
    // Hub-Seiten (z. B. die Gimmicks-Übersicht) zeigen ALLE Türen -> sämtliche
    // Elemente aller Einträge aus overview.constants.ts einsammeln.
    if (cfg.aggregateAllElements) {
      const keys = new Set(extra.keys);
      const literals = new Set(extra.literals);
      for (const entry of Object.values(hardcoded)) {
        entry.keys.forEach((k) => keys.add(k));
        entry.literals.forEach((l) => literals.add(l));
      }
      extra = { keys: [...keys], literals: [...literals] };
    }

    for (const lang of LANGS) {
      const data = i18n[lang];
      if (cfg.labelKey) push(resolvePath(data, cfg.labelKey));
      for (const p of cfg.prefixes || []) {
        collectLeaves(resolvePath(data, p)).forEach(push);
      }
      // i18n-basierte Tech-Elemente pro Sprache auflösen.
      for (const k of extra.keys) push(resolvePath(data, k));
    }

    // Sprachneutrales (nur einmal).
    if (cfg.label) push(cfg.label);
    if (cfg.extra) push(cfg.extra);
    extra.literals.forEach(push);

    // Exakte Duplikate (z. B. Label == Menüeintrag) entfernen, Phrasen erhalten.
    const text = [...new Set(parts)].join('. ');

    process.stdout.write(
      `[${i}/${SEARCH_ROUTES.length}] embedding ${cfg.route}${cfg.fragment ? '#' + cfg.fragment : ''} (${text.length} chars) ... `
    );
    const vector = normalize(await embed(text));
    console.log('ok');

    routes.push({
      route: cfg.route,
      ...(cfg.fragment ? { fragment: cfg.fragment } : {}),
      ...(cfg.labelKey ? { labelKey: cfg.labelKey } : {}),
      ...(cfg.label ? { label: cfg.label } : {}),
      icon: cfg.icon,
      category: cfg.category,
      text,
      vector,
    });
  }

  const out = {
    model: '@cf/baai/bge-m3',
    dim: routes[0]?.vector.length ?? 0,
    generatedAt: new Date().toISOString(),
    routes,
  };
  await writeFile(OUTPUT, JSON.stringify(out), 'utf8');
  console.log(`\n✓ ${routes.length} Routen -> ${OUTPUT}`);
}

main().catch((err) => {
  console.error('\n✗ Build fehlgeschlagen:', err.message);
  process.exit(1);
});
