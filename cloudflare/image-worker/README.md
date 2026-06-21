# aznw-image-gen — Cloudflare Worker

Kleiner Worker, der über **Cloudflare Workers AI** Bilder generiert und sie als
fertiges Bild zurückgibt (für das „AI Images"-Gimmick).

## Voraussetzungen

- Ein (kostenloser) Cloudflare-Account
- Node.js installiert

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

Diese URL in `src/environments/environment.ts` **und** `environment.prod.ts`
bei `imagegen.workerUrl` eintragen.

## Lokaler Test

```bash
wrangler dev
# dann z. B. im Browser:
# http://localhost:8787/?prompt=ein%20roter%20Fuchs&model=flux
```

## Modelle

| `model` | Cloudflare-Modell                              | Besonderheit               |
| ------- | ---------------------------------------------- | -------------------------- |
| `flux`  | `@cf/black-forest-labs/flux-1-schnell`         | 1024×1024, sehr schnell    |
| `sdxl`  | `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Format & Seed steuerbar    |

## Endpoint `/embed` — semantische Suche

Derselbe Worker liefert unter `/embed` Text-Embeddings (Modell
`@cf/baai/bge-m3`, mehrsprachig) für die semantische Volltextsuche der App.

```bash
# Query-Embedding (Frontend nutzt POST):
curl -X POST https://.../embed -H 'Content-Type: application/json' -d '{"q":"wie wird das wetter"}'
# Antwort: { "vector": [ ... 1024 Zahlen ... ] }
```

Der Routen-Index wird mit demselben Modell vorab gebaut:
`npm run build:search` (Projekt-Root) → `src/assets/search-index.json`.
Nach Änderungen an Worker oder i18n-Texten: erst `wrangler deploy`, dann
`npm run build:search` erneut ausführen.

## Erlaubte Aufrufer

In `src/index.js` unter `ALLOWED_ORIGINS` sind die erlaubten Domains hinterlegt
(Produktion + `localhost:4200`). Bei neuer Domain dort ergänzen und erneut
`wrangler deploy` ausführen.
