---
id: ships
title_de: Schiffe versenken
title_en: Battleship
title_hr: Potapanje brodova
route: /gimmicks/games/ships
category: game
summary: Battleship against the computer with three difficulty levels or online with two players.

aliases: [Battleship, battleships, sea battle, Schiffe versenken, potapanje brodova]
tech: [Angular, Firebase Realtime Database, computer opponent]
tools: []
related: [connect-four, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/ships
---

# Battleship (Game)

## What is the Battleship game on Benjamin's website?
In Battleship each player secretly places a fleet of a battleship, cruisers and boats on the sea. Then players take turns shooting at the opponent's sea. Whoever sinks all of the opponent's ships first wins.

## How can you play Battleship?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person
You place the ships horizontally or vertically by tapping, or let them be placed randomly. Before the game you choose your name and an animal as your avatar. The game is designed to be child-friendly, with emojis and simple texts.

## How is the Battleship game built?
The rules and the computer opponent are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
