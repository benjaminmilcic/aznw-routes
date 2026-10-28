---
id: connect-four
title_de: 4 Gewinnt
title_en: Connect 4
title_hr: 4 u nizu
route: /gimmicks/games/connect-four
category: game
summary: Connect 4 against the computer with three difficulty levels or online with two players.

aliases: [Connect 4, Connect Four, four in a row, 4 Gewinnt, Vier gewinnt, 4 u nizu]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [ships, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/connect-four
---

# Connect 4 (Game)

## What is the Connect 4 game on Benjamin's website?
In Connect 4 players take turns dropping discs into a vertical grid. Whoever first gets four of their own discs in a row – horizontally, vertically or diagonally – wins.

## How can you play Connect 4?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person

## How is the Connect 4 game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
