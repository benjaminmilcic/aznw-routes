---
id: uno
title_de: UNO
title_en: UNO
title_hr: UNO
route: /gimmicks/games/uno
category: game
summary: The card game UNO with several players – on one device, against the computer or online.

aliases: [UNO, card game, cards, Kartenspiel, kartaška igra]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [ludo, yahtzee, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/uno
---

# UNO (Game)

## What is the UNO game on Benjamin's website?
UNO is a card game: you play cards that match the color or number of the top card. Whoever has no cards left in their hand first wins.

## How can you play UNO?
- **On one device:** with several players on the same computer or smartphone, any mix of humans and computer opponents
- **Online:** via a four-digit game code that you tell the others
The computer opponents come in the levels easy, medium and hard.

## How is the UNO game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
