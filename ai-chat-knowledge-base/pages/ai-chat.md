---
id: ai-chat
title_de: KI-Chat
title_en: AI chat
title_hr: AI chat
route: /chat
category: page
summary: The AI chat on Benjamin's website – answers questions about Benjamin and his website with RAG and tool calling.

aliases: [AI chat, chatbot, assistant, AI assistant, KI-Chat, KI, Chatbot, Assistent, UI chat, umjetna inteligencija, RAG, LLM, tool calling]
tech: [Angular, NestJS, Python, FastAPI, LiteLLM, OpenAI, GPT-5.4 mini, Groq, Whisper, Cloudflare Workers AI, bge-m3, RAG, tool calling]
tools: []
related: [architecture, skills, person]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/chat
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/ai-chat-knowledge-base
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/chat
  - https://github.com/benjaminmilcic/python-aznw-api
---

# AI chat

## What is the AI chat on Benjamin's website?
The AI chat answers questions about Benjamin Milčić, his work, his projects and his website, in any language. It is opened with the "AI" button in the navigation, next to the language switcher. Benjamin built it to show his skills as an AI engineer. The chat only answers questions about Benjamin and his website; for anything else it refers to his email and the contact form.

## What can the AI chat do?
- Answer questions about Benjamin's career, skills, courses, portfolio and the pages and gimmicks of the website, with links to the pages
- Show where something is implemented, with links to the source code on GitHub
- Look up live data with tools: whether Benjamin is available for projects, recipes with photos, a random joke from Benjamin's joke book, guestbook entries with images, the current weather at the visitor's location and the Moorhuhn high score
- Speech input: the question can be spoken instead of typed
- Copy questions, answers or the whole chat, start a new chat, stop an answer

## How is the AI chat built?
The Angular frontend sends the question to the NestJS backend, which keeps the conversation history and forwards it to a separate Python service (FastAPI). The Python service does everything that involves the language model, via LiteLLM:
- **RAG (retrieval-augmented generation):** the knowledge base – Markdown files about every page, the portfolio data and the CV – is split into sections and turned into vectors with the multilingual embedding model bge-m3 on Cloudflare Workers AI. For each question the most similar sections are added to the prompt.
- **Tool calling:** the model can call tools that fetch live data from the NestJS backend and from Open-Meteo.
- **LLM:** GPT-5.4 mini from OpenAI; speech input uses Whisper on Groq.
- The answer is streamed token by token as Server-Sent Events. Long conversations are summarized automatically to fit the model's context window.

## Why does the AI chat sometimes say it is busy?
The chat is a demonstration, and every question costs money (about one cent). To keep the costs manageable, each visitor can ask 5 questions per minute and 100 per day, and there is a daily budget for all visitors together. If a visitor reaches the limit, the chat asks to try again in a minute; once the daily budget is used up, the chat says from what time it answers again (after midnight UTC). The info button in the chat shows the limits.
