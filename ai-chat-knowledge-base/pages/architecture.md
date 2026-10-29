---
id: architecture
title_de: Aufbau der Webseite
title_en: Website architecture
title_hr: Arhitektura web stranice
route: /
category: page
summary: How benjamin-milcic.dev is built – Angular frontend, NestJS backend, Python AI service, hosting and deployment.

aliases: [architecture, tech stack, how is the website built, repositories, source code, backend, frontend, hosting, deployment, CI/CD, GitHub Actions, Aufbau, Architektur, Quellcode, arhitektura]
tech: [Angular, NestJS, TypeORM, MySQL, Python, FastAPI, LiteLLM, Firebase, Cloudflare, Apache, systemd, GitHub Actions, Cypress]
tools: []
related: [home, ai-chat, links, skills]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes
  - https://github.com/benjaminmilcic/nest-aznw-api
  - https://github.com/benjaminmilcic/python-aznw-api
---

# Website architecture

## How is Benjamin's website built?
The website benjamin-milcic.dev consists of three parts, each in its own public GitHub repository:
- **Frontend – aznw-routes:** an Angular single-page application with Angular Material, Ionic components, Tailwind CSS and ngx-translate (German, English, Croatian). It contains the home page, all gimmicks and games and the AI chat.
- **Backend – nest-aznw-api:** a NestJS API with TypeORM and a MySQL database. It provides the data of the gimmicks (guestbook, recipes, Moorhuhn high scores, quiz questions, jokes), login and authentication, Stripe payments, email sending for the contact form, geolocation, the Telegram connection, the image generator and the AI chat endpoint.
- **AI service – python-aznw-api:** a Python service with FastAPI and LiteLLM that runs the AI chat: RAG over the knowledge base, tool calling and speech recognition.

## Which modules does the NestJS backend have?
The NestJS backend nest-aznw-api has one module per feature, among others: guestbook, recipes, files (uploads), auth and users (login, Google login), jokes, stripe, form2email (contact form), error2email, moorhuhn, trivia, yahtzee-game, geolocation, imagegen (AI images via Cloudflare Workers AI), telegram, availability and chat (the AI chat, which forwards to the Python service).

## How is the website hosted and deployed?
The website runs on a Linux server at Strato with Apache as reverse proxy; the backend services run as systemd services. The domain and the protection of the server run through Cloudflare. Each repository has a GitHub Actions workflow: a push runs the tests (for the frontend Cypress end-to-end tests) and deploys automatically to the server. Online games use the Firebase Realtime Database. The AI features use OpenAI (GPT-5.4 mini for the AI chat), Groq (Whisper for the speech input) and Cloudflare Workers AI (embeddings for the knowledge search and AI images).
