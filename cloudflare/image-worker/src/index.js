/**
 * Cloudflare Worker – KI-Bildgenerator für das aznw-routes "AI Images"-Gimmick.
 *
 * Nutzt Cloudflare Workers AI (kostenloses Tageskontingent) und liefert ein
 * fertiges Bild zurück, das direkt in ein <img>-Tag geladen werden kann.
 *
 * Aufruf nur über die Nest-API (Shared Secret in X-Worker-Secret).
 * Direkt aus dem Browser oder per curl ohne Secret → 403.
 *
 *   GET /?prompt=ein%20roter%20Fuchs&model=flux
 *   GET /?prompt=...&model=sdxl&width=1280&height=720&seed=1234&negative=blurry
 *
 * Modelle:
 *   flux  -> @cf/black-forest-labs/flux-1-schnell  (1024x1024, sehr schnell, hohe Qualität)
 *   sdxl  -> @cf/stabilityai/stable-diffusion-xl-base-1.0 (Format & Seed steuerbar)
 */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret',
  };
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const encoder = new TextEncoder();
  const aa = encoder.encode(a);
  const bb = encoder.encode(b);
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa[i] ^ bb[i];
  return out === 0;
}

function hasValidSecret(request, env) {
  const secret = env.WORKER_SECRET;
  if (!secret) return false;
  return timingSafeEqual(request.headers.get('X-Worker-Secret') || '', secret);
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
 * Liefert { vector: number[] } – ein mehrsprachiges Embedding (bge-m3, 1024 Dim.).
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
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }
    if (!hasValidSecret(request, env)) {
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
