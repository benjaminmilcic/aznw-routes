---
id: checkers
title_de: Dame
title_en: Checkers
title_hr: Dama
route: /gimmicks/games/dame
category: game
summary: Checkers against the computer with three difficulty levels or online with two players.

aliases: [checkers, draughts, board game, Dame, dama]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [chess, mill, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/dame
---

# Checkers (Game)

## What is the Checkers game on Benjamin's website?
Checkers is a classic board game: you capture the opponent's pieces by jumping over them and try to reach the last row, where a piece becomes a king.

## How can you play Checkers?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person

## How is the Checkers game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
