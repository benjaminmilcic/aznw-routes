---
id: chess
title_de: Schach
title_en: Chess
title_hr: Šah
route: /gimmicks/games/schach
category: game
summary: Chess against the computer with three difficulty levels or online with two players.

aliases: [chess, checkmate, board game, Schach, Schachmatt, šah]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [checkers, mill, backgammon, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/schach
---

# Chess (Game)

## What is the Chess game on Benjamin's website?
The Chess game is a complete chess game in the browser. The goal is to checkmate the opponent's king. When a king is in check, the game shows it.

## How can you play Chess?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** one player starts a game and tells the other person the four-digit game code to join
Before the game you enter your name and choose a symbol as your avatar.

## How is the Chess game built?
Benjamin programmed the rules and the computer opponent himself in TypeScript, without a ready-made chess engine. On the higher levels the computer calculates several moves ahead. Online games are synchronized through the Firebase Realtime Database.
