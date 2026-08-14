# aznw-image-gen — Cloudflare Worker

Kleiner Worker, der über **Cloudflare Workers AI** Bilder generiert und sie als
fertiges Bild zurückgibt (für das „AI Images"-Gimmick).

Der Worker ist **nicht öffentlich**. Jeder Aufruf braucht den Header
`X-Worker-Secret`. Das Frontend spricht nur die Nest-API an; Nest setzt das Secret.

## Voraussetzungen

- Ein (kostenloser) Cloudflare-Account
- Node.js installiert

## Secret setzen

Derselbe Wert wie `WORKER_SECRET` in der Nest-`.env`:

```bash
cd cloudflare/image-worker

# Produktion
npx wrangler secret put WORKER_SECRET

# Lokal: Datei .dev.vars anlegen (siehe .dev.vars.example)
```

## Deployen

```bash
cd cloudflare/image-worker

# Wrangler (Cloudflare CLI) – einmalig
npm install -g wrangler

# Einloggen (öffnet den Browser)
wrangler login

# Veröffentlichen
wrangler deploy
```

Nach dem Deploy zeigt Wrangler eine URL wie:

```
https://aznw-image-gen.DEIN-SUBDOMAIN.workers.dev
```

Diese URL nur in der Nest-`.env` als `IMAGEGEN_WORKER_URL` eintragen — **nicht**
im Frontend-Bundle.

## Lokaler Test

```bash
wrangler dev
# dann z. B.:
curl -H "X-Worker-Secret: $WORKER_SECRET" \
  "http://localhost:8787/?prompt=ein%20roter%20Fuchs&model=flux"
```

Ohne Secret antwortet der Worker mit 403.

## Modelle

| `model` | Cloudflare-Modell                              | Besonderheit               |
| ------- | ---------------------------------------------- | -------------------------- |
| `flux`  | `@cf/black-forest-labs/flux-1-schnell`         | 1024×1024, sehr schnell    |
| `sdxl`  | `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Format & Seed steuerbar    |

## Endpoint `/embed` — semantische Suche

Derselbe Worker liefert unter `/embed` Text-Embeddings (Modell
`@cf/baai/bge-m3`, mehrsprachig). Die App holt Embeddings über Nest
(`POST /imagegen/embed`). Der Index-Build spricht den Worker direkt an
und braucht dafür `WORKER_SECRET` in der Umgebung:

```bash
WORKER_SECRET=... npm run build:search
```

```bash
curl -X POST https://.../embed \
  -H 'Content-Type: application/json' \
  -H "X-Worker-Secret: $WORKER_SECRET" \
  -d '{"q":"wie wird das wetter"}'
# Antwort: { "vector": [ ... 1024 Zahlen ... ] }
```

Der Routen-Index wird mit demselben Modell vorab gebaut:
`npm run build:search` (Projekt-Root) → `src/assets/search-index.json`.
Nach Änderungen an Worker oder i18n-Texten: erst `wrangler deploy`, dann
`npm run build:search` erneut ausführen.
