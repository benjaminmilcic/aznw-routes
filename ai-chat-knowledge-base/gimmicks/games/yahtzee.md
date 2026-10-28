---
id: yahtzee
title_de: Yahtzee
title_en: Yahtzee
title_hr: Yahtzee
route: /gimmicks/games/yahtzee
category: game
summary: The dice game Yahtzee with several players – on one device, against the computer or online.

aliases: [Yahtzee, dice game, dice, full house, straight, Kniffel, Würfelspiel, kockice]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [ludo, uno, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/yahtzee
---

# Yahtzee (Game)

## What is the Yahtzee game on Benjamin's website?
Yahtzee, known in Germany as Kniffel, is a dice game with five dice and thirteen categories. Each turn you may roll up to three times and then enter the result in a category, such as threes, full house, large straight or Yahtzee. Whoever has the most points at the end wins.

## How can you play Yahtzee?
- **On one device:** with several players on the same computer or smartphone, any mix of humans and computer opponents
- **Online:** via a four-digit game code that you tell the others
The computer opponents come in the levels easy, medium and hard.

## How is the Yahtzee game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Depending on the level, the computer decides which dice to keep and which category to fill. Online games are synchronized through the Firebase Realtime Database.
