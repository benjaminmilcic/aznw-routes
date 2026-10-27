---
id: telegram
title_de: Telegram
title_en: Telegram
title_hr: Telegram
route: /gimmicks/telegram
category: gimmick
summary: Telegram web chat where you log in with your own Telegram account and read and answer your chats.

aliases: [Telegram, web chat, messenger, chat, messages, WebSocket, real time, Nachrichten, poruke]
tech: [Angular, NestJS, Telegram API, WebSockets, socket.io, Angular guards]
tools: []
related: [guestbook]
subroutes:
  - { path: /gimmicks/telegram/login, title_en: Telegram login }
  - { path: /gimmicks/telegram/chat, title_en: Telegram chat }
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/telegram
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/telegram
---

# Telegram (Gimmick)

## What is the Telegram gimmick?
The Telegram gimmick is a custom web chat for Telegram. You log in with your own Telegram account and can then read your chats, groups and channels and write messages directly on Benjamin's website.

## What can you do in the Telegram gimmick?
- Log in with your phone number and a confirmation code, plus your 2FA password if two-factor authentication is enabled
- Search the chat list and open chats, groups and channels
- Read and send messages, including photos, stickers and files
- Receive new messages in real time
- Clear chat history, leave groups or channels, delete chats and block users

## Is the Telegram gimmick safe?
No data is stored on Benjamin's server. After two hours of inactivity you are logged out automatically.

## How is the Telegram gimmick built?
The NestJS backend talks to the Telegram API and logs in on behalf of the visitor. The backend pushes new messages to the Angular frontend immediately via WebSockets (socket.io). The chat page is protected by an Angular guard, and an HTTP interceptor attaches the session to every request.
