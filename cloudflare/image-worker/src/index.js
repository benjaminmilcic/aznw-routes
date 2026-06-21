/**
 * Cloudflare Worker – KI-Bildgenerator für das aznw-routes "AI Images"-Gimmick.
 *
 * Nutzt Cloudflare Workers AI (kostenloses Tageskontingent) und liefert ein
 * fertiges Bild zurück, das direkt in ein <img>-Tag geladen werden kann.
 *
 * Aufruf (GET):
 *   /?prompt=ein%20roter%20Fuchs&model=flux
 *   /?prompt=...&model=sdxl&width=1280&height=720&seed=1234&negative=blurry
 *
 * Modelle:
 *   flux  -> @cf/black-forest-labs/flux-1-schnell  (1024x1024, sehr schnell, hohe Qualität)
 *   sdxl  -> @cf/stabilityai/stable-diffusion-xl-base-1.0 (Format & Seed steuerbar)
 */

const ALLOWED_ORIGINS = [
  'https://auf-zu-neuen-welten.de',
  'https://www.auf-zu-neuen-welten.de',
  'http://localhost:4200',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

/** Leichter Missbrauchsschutz: Referer/Origin muss (falls vorhanden) erlaubt sein. */
function isAllowedCaller(request) {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const host = (value) => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  };
  if (origin) return ALLOWED_ORIGINS.includes(origin);
  if (referer) return ALLOWED_ORIGINS.includes(host(referer));
  // Kein Origin/Referer (z. B. manche img-Requests) -> zulassen.
  return true;
}

function clamp(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Embedding-Endpoint (/embed) für die semantische Volltextsuche.
 *
 * Aufruf:
 *   GET  /embed?q=wie%20wird%20das%20wetter
 *   POST /embed   { "q": "wie wird das wetter" }
 *
 * Liefert { vector: number[] } – ein mehrsprachiges Embedding (bge-m3, 1024 Dim.),
 * das im Frontend per Cosine-Ähnlichkeit gegen den vorab berechneten Routen-Index
 * verglichen wird. Gleiches Modell wie beim Index-Bau -> Vektoren sind vergleichbar.
 */
async function handleEmbed(request, env, cors) {
  let query = '';
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      query = String(body?.q ?? body?.text ?? '');
    } catch {
      query = '';
    }
  } else {
    const url = new URL(request.url);
    query = url.searchParams.get('q') || url.searchParams.get('text') || '';
  }

  // Großzügiges Limit: kurze Nutzer-Queries, aber auch lange Routen-Blobs beim Index-Bau.
  query = query.trim().slice(0, 8000);
  if (!query) {
    return new Response(JSON.stringify({ error: 'q required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await env.AI.run('@cf/baai/bge-m3', { text: [query] });
    // Workers AI liefert { shape: [n, dim], data: [[...]] }.
    const vector = result?.data?.[0];
    if (!Array.isArray(vector)) {
      throw new Error('unexpected embedding response');
    }
    return new Response(JSON.stringify({ vector }), {
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'embedding failed', detail: String(err) }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    if (!isAllowedCaller(request)) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

    const url = new URL(request.url);

    // Semantische Suche: Query-Embedding (GET oder POST).
    if (url.pathname === '/embed') {
      if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: cors });
      }
      return handleEmbed(request, env, cors);
    }

    // Ab hier: Bildgenerierung (nur GET).
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    const prompt = (url.searchParams.get('prompt') || '').trim().slice(0, 800);
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const model = url.searchParams.get('model') === 'sdxl' ? 'sdxl' : 'flux';

    try {
      if (model === 'sdxl') {
        const inputs = {
          prompt,
          width: clamp(url.searchParams.get('width'), 256, 1280, 1024),
          height: clamp(url.searchParams.get('height'), 256, 1280, 1024),
          num_steps: 20,
        };
        const seed = url.searchParams.get('seed');
        if (seed) inputs.seed = clamp(seed, 0, 4294967295, 0);
        const negative = url.searchParams.get('negative');
        if (negative) inputs.negative_prompt = negative.slice(0, 300);

        // SDXL liefert einen Binär-Stream (PNG).
        const stream = await env.AI.run(
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          inputs
        );
        return new Response(stream, {
          headers: {
            ...cors,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // flux-1-schnell liefert { image: "<base64-jpeg>" }.
      const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
        prompt,
        steps: clamp(url.searchParams.get('steps'), 1, 8, 6),
      });
      const bytes = Uint8Array.from(atob(result.image), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        headers: {
          ...cors,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'generation failed', detail: String(err) }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
  },
};
