---
id: mill
title_de: Mühle
title_en: Nine Men's Morris
title_hr: Mlin
route: /gimmicks/games/mill
category: game
summary: Nine Men's Morris against the computer with three difficulty levels or online with two players.

aliases: [Nine Men's Morris, mill, morris, board game, Mühle, mlin]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [checkers, chess, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/mill
---

# Nine Men's Morris (Game)

## What is the Nine Men's Morris game on Benjamin's website?
Nine Men's Morris is a classic board game: players take turns placing pieces, form mills of three pieces in a row and may then remove one of the opponent's pieces. Whoever has only two pieces left or can no longer move loses.

## How can you play Nine Men's Morris?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person

## How is the Nine Men's Morris game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
