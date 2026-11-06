---
id: language-trainer
title_de: AI Language Trainer
title_en: AI Language Trainer
title_hr: AI Language Trainer
route: /?project=language-trainer#portfolio
category: project
summary: Benjamin's own web app for learning Croatian, German, English, Spanish and French by translating AI-generated texts, with a vocabulary trainer and a basic vocabulary from A1 to B2.

aliases: [AI Language Trainer, language trainer, language learning, learn languages, translate, basic vocabulary, Sprachtrainer, Sprachen lernen, Französisch lernen, Grundwortschatz, KI-Sprachtrainer, trener jezika, učenje jezika, osnovni vokabular]
tech: [Angular, Angular Material, Tailwind CSS, Transloco, NestJS, TypeORM, MySQL, LLMs, Anthropic Claude, Google Gemini, OpenAI]
tools: []
related: [portfolio, vocabulary-trainer, todo-app, ai-chat]
subroutes: []
source: []
---

# AI Language Trainer (Portfolio project)

## What is the AI Language Trainer?
The AI Language Trainer is Benjamin's own web app for learning languages by translating. It supports Croatian, German, English, Spanish and French, in any combination, and its interface is available in the same five languages. Benjamin wrote it to expand his own Croatian vocabulary and then put it online for others. It is a private, free project; the live demo is linked in the portfolio.

## What can you do in the AI Language Trainer?
- **Translate:** the AI writes a text for your level, topic and length and evaluates your translation with corrections
- **Look up words:** clicking a word in a text shows its base form and translations, and you can save it
- **Learn:** saved words come back on a schedule as flashcards, multiple choice, letter puzzles, typing or gap fills
- **Review texts:** the AI writes new texts that repeat your saved words
- **Basic vocabulary:** go through about 12,000 words from A1 to B2 and sort them into known and unknown
- **Listen:** words and texts can be read aloud

The basic vocabulary and learning saved words work without an API key. Texts, evaluations and the word menu need one.

## How is the AI Language Trainer built?
The frontend is built with Angular (standalone components, signals, zoneless), Angular Material, Tailwind CSS and Transloco. The backend is built with NestJS, TypeORM and MySQL and deployed automatically with GitHub Actions. All AI calls run through the backend, behind one interface for models from Anthropic, Google and OpenAI. Users bring their own API key, which is stored encrypted, and choose between ready-made combinations of models for texts, evaluation and the word menu. Reading aloud uses Microsoft's neural voices, with the browser's own voice as a fallback.

## How was the basic vocabulary of the AI Language Trainer created?
The word lists were created with the AI model Claude Opus 5.5 and are not proofread by native speakers, so the app notes that they can contain mistakes. The division into levels A1 to B2 is an estimate, not an official standard. Each word has translations into the four other languages and an example sentence; nouns and verbs also show grammar such as gender, plural or verbal aspect.

## How did Benjamin compare AI models for the AI Language Trainer?
Benjamin tested the models the app offers with identical tasks: generating texts, looking up words and evaluating translations with deliberately inserted errors. The app publishes the complete comparison, including costs and speed, so users can choose models themselves.
