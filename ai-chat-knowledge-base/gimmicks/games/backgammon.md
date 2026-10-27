---
id: backgammon
title_de: Backgammon
title_en: Backgammon
title_hr: Backgammon
route: /gimmicks/games/backgammon
category: game
summary: Backgammon against the computer with three difficulty levels or online with two players.

aliases: [backgammon, tavla, board game, dice game, Brettspiel, Würfelspiel]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [ludo, chess, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/backgammon
---

# Backgammon (Game)

## What is the Backgammon game on Benjamin's website?
Backgammon is a board and dice game: you roll the dice, move your checkers into your home board and then bear them off. Whoever bears off all checkers first wins.

## How can you play Backgammon?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person

## How is the Backgammon game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
