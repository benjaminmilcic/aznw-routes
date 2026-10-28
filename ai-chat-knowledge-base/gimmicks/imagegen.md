---
id: imagegen
title_de: KI-Bilder
title_en: AI Images
title_hr: AI Slike
route: /gimmicks/imagegen
category: gimmick
summary: AI image generator that creates an image from a text description using the Flux or SDXL models.

aliases: [AI images, AI image generator, image generator, text to image, generate image, Flux, SDXL, Stable Diffusion, AI, KI-Bilder, Bildgenerator, AI slike, umjetna inteligencija]
tech: [Angular, NestJS, Cloudflare Workers, Cloudflare Workers AI, Flux, SDXL]
tools: []
related: [movies, overview]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/imagegen
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/imagegen
---

# AI Images (Gimmick)

## What is the AI Images gimmick?
The AI Images gimmick is an image generator: you describe in words what you want to see, and an AI model paints the image within a few seconds.

## What can you do in the AI Images gimmick?
- Write your own prompt or get an example prompt with "Surprise me"
- Choose between two models: Flux is the fastest model with high quality and always delivers 1024×1024 pixels. SDXL supports different formats (square, landscape, portrait, wide) and a fixed seed.
- Lock the seed: the same seed and the same prompt produce the same image, so details can be compared
- Download images, open them in a new tab or create a variation
- View the most recently generated images again

## How is the AI Images gimmick built?
The frontend sends the prompt to Benjamin's NestJS backend. The backend forwards it to a Cloudflare Worker that generates the images with Cloudflare Workers AI. Originally the generator ran on Pollinations, which then became a paid service.
