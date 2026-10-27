---
id: memo-quiz
title_de: Memo-Quiz
title_en: Memo quiz
title_hr: Memo kviz
route: /gimmicks/games/memo-quiz
category: game
summary: Memory game with 12, 20 or 24 cards against the computer or online with two players.

aliases: [memory, memo, concentration, find the pairs, card game, Memo-Quiz, Gedächtnisspiel, memo kviz]
tech: [Angular, SVG, Firebase Realtime Database, computer opponent]
tools: []
related: [trivia-quiz, yahtzee, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/memo-quiz
---

# Memo quiz (Game)

## What is the Memo quiz on Benjamin's website?
The Memo quiz is a memory game: players take turns turning over two cards and try to find pairs with the same motif. Whoever has the most pairs at the end wins.

## How can you play the Memo quiz?
- **Against the computer:** with the levels easy, medium and hard
- **Online with two players:** via a four-digit game code that you tell the other person
You choose between 12, 20 or 24 cards, enter your name and pick an animal as your avatar.

## How is the Memo quiz built?
The card motifs are drawn as SVG. The game logic and the computer opponent, which remembers more or fewer cards depending on the level, are programmed in TypeScript by Benjamin himself. Online games are synchronized through the Firebase Realtime Database.
