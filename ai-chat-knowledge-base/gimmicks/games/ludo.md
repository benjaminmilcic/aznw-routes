---
id: ludo
title_de: Mensch ärgere dich nicht
title_en: Ludo
title_hr: Čovječe, ne ljuti se
route: /gimmicks/games/ludo
category: game
summary: Ludo for up to four players – on one device, against the computer or online.

aliases: [Ludo, Sorry, Parcheesi, dice game, board game, Mensch ärgere dich nicht, Čovječe ne ljuti se]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [yahtzee, uno, backgammon, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/ludo
---

# Ludo (Game)

## What is the Ludo game on Benjamin's website?
In Ludo (German: Mensch ärgere dich nicht) you roll the dice and move your four pieces once around the board into the finish. Whoever gets all four pieces home first wins.

## How can you play Ludo?
- **On one device:** with up to four players on the same computer or smartphone, any mix of humans and computer opponents
- **Online:** via a four-digit game code that you tell the others
The computer opponents come in the levels easy, medium and hard.

## How is the Ludo game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
