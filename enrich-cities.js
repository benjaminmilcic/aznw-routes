/**
 * Enriches cities.json with English and Croatian Wikipedia names/links via Wikidata.
 *
 * For each city without EN/HR data:
 *  1. Gets the Wikidata ID from the German Wikipedia API
 *  2. Gets EN + HR sitelinks from Wikidata
 *  3. Sets nameEn, linkEn, nameHr, linkHr and the flags hrTakeEn / hrTakeDe / enTakeDe
 *
 * Skips cities that already have any EN data set.
 */

const https = require('https');
const fs = require('fs');

// ── helpers ────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'CityMapEnricher/1.0' } }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse error (${url.slice(0, 80)}): ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Convert a plain Wikidata title ("Mount Olympus") to a /wiki/ path */
function titleToLink(title) {
  return '/wiki/' + title
    .replace(/ /g, '_')
    .replace(/[^\x21-\x7E]/g, c => encodeURIComponent(c));
}

// ── Wikipedia DE: get Wikidata IDs for a batch of titles ──────────────────

async function fetchWikidataIds(titles) {
  // titles are already decoded (e.g. "München", "Halle_(Saale)")
  const joined = titles.join('|');
  const url =
    `https://de.wikipedia.org/w/api.php` +
    `?action=query&prop=pageprops&ppprop=wikibase_item` +
    `&titles=${encodeURIComponent(joined)}&redirects=1&format=json`;

  const data = await httpsGet(url);

  // Build normalisation map: sent_title → wikipedia_title
  const norm = {};
  for (const n of data.query?.normalized || []) norm[n.from] = n.to;
  for (const r of data.query?.redirects  || []) norm[r.from] = r.to;

  // wikipedia_title → QID
  const pageTitle2Qid = {};
  for (const page of Object.values(data.query?.pages || {})) {
    const qid = page.pageprops?.wikibase_item;
    if (qid) pageTitle2Qid[page.title] = qid;
  }

  // Map each original title back to a QID
  const result = {};
  for (const t of titles) {
    const resolved = norm[t] ?? norm[t.replace(/_/g, ' ')] ?? t;
    const qid = pageTitle2Qid[resolved] ?? pageTitle2Qid[resolved.replace(/ /g, '_')];
    if (qid) result[t] = qid;
  }
  return result; // { title: "München" → "Q1726", ... }
}

// ── Wikidata: get EN + HR sitelinks for a batch of QIDs ───────────────────

async function fetchSitelinks(qids) {
  const url =
    `https://www.wikidata.org/w/api.php` +
    `?action=wbgetentities&ids=${qids.join('%7C')}` +
    `&props=sitelinks&sitefilter=enwiki%7Chrwiki&format=json`;

  const data = await httpsGet(url);

  const result = {};
  for (const [qid, entity] of Object.entries(data.entities ?? {})) {
    result[qid] = {
      en: entity.sitelinks?.enwiki?.title ?? null,
      hr: entity.sitelinks?.hrwiki?.title ?? null,
    };
  }
  return result; // { "Q1726": { en: "Munich", hr: "München" }, ... }
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
  const citiesPath = './src/assets/json/cities.json';
  const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

  // Only process cities that have no EN data yet
  const toProcess = cities.filter(
    c => !c.nameEn && !c.enTakeDe && !c.linkEn
  );
  console.log(`Total cities: ${cities.length}  |  To process: ${toProcess.length}`);

  const BATCH = 40;

  // ── Step 1: get Wikidata IDs ────────────────────────────────────────────
  console.log('\nStep 1: Fetching Wikidata IDs from de.wikipedia.org …');
  const linkToQid = {}; // city.link → QID

  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    const titles = batch.map(c => decodeURIComponent(c.link.slice(6))); // remove /wiki/

    try {
      const qids = await fetchWikidataIds(titles);
      batch.forEach((city, j) => {
        const qid = qids[titles[j]];
        if (qid) linkToQid[city.link] = qid;
      });
    } catch (e) {
      console.error(`\n  Error batch ${i}:`, e.message);
    }

    await sleep(400);
    process.stdout.write(`\r  ${Math.min(i + BATCH, toProcess.length)}/${toProcess.length}`);
  }
  console.log(`\n  QIDs found: ${Object.keys(linkToQid).length}`);

  // ── Step 2: get EN + HR sitelinks ──────────────────────────────────────
  console.log('\nStep 2: Fetching sitelinks from wikidata.org …');
  const allQids = [...new Set(Object.values(linkToQid))];
  const qidToLinks = {}; // QID → { en, hr }

  for (let i = 0; i < allQids.length; i += BATCH) {
    const batch = allQids.slice(i, i + BATCH);
    try {
      Object.assign(qidToLinks, await fetchSitelinks(batch));
    } catch (e) {
      console.error(`\n  Error batch ${i}:`, e.message);
    }
    await sleep(400);
    process.stdout.write(`\r  ${Math.min(i + BATCH, allQids.length)}/${allQids.length}`);
  }
  console.log(`\n  Sitelinks fetched: ${Object.keys(qidToLinks).length}`);

  // ── Step 3: update city entries ─────────────────────────────────────────
  console.log('\nStep 3: Updating cities.json …');
  let updated = 0;

  for (const city of cities) {
    if (city.nameEn || city.enTakeDe || city.linkEn) continue; // already handled

    const qid = linkToQid[city.link];
    if (!qid) continue;

    const sl = qidToLinks[qid];
    if (!sl) continue;

    const deTitle = decodeURIComponent(city.link.slice(6)).replace(/_/g, ' ');

    // ── English ──────────────────────────────────────────────────────────
    if (sl.en) {
      if (sl.en !== deTitle) {
        city.nameEn = sl.en;
        city.linkEn = titleToLink(sl.en);
      }
      // same title as DE → no field needed; getWikiUrl uses city.link on en.wikipedia.org
    } else {
      city.enTakeDe = true;
    }

    // ── Croatian ─────────────────────────────────────────────────────────
    if (sl.hr) {
      if (sl.hr !== deTitle) {
        city.nameHr = sl.hr;
        city.linkHr = titleToLink(sl.hr);
      }
      // same title as DE → no field needed; getWikiUrl uses city.link on hr.wikipedia.org
    } else if (sl.en) {
      city.hrTakeEn = true; // no HR article, but EN exists → use EN wiki
    } else {
      city.hrTakeDe = true; // neither HR nor EN → fall back to DE
    }

    updated++;
  }

  console.log(`  Updated: ${updated} cities`);
  fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2));
  console.log('  cities.json saved ✓');
}

main().catch(err => { console.error(err); process.exit(1); });
