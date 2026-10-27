---
id: games
title_de: Spiele
title_en: Games
title_hr: Igre
route: /gimmicks/games
category: gimmick
summary: Collection of 14 browser games – board games, card games, dice games, quizzes and classics, many of them also playable online with two players.

aliases: [games, board games, card games, online games, multiplayer, quiz, Spiele, Brettspiele, igre]
tech: [Angular, Firebase Realtime Database, NestJS, computer opponents]
tools: []
related: [chess, uno, ludo, yahtzee, trivia-quiz]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/shared
---

# Games (Gimmick)

## Which games are there on Benjamin's website?
The Games gimmick has 14 games that you choose from a menu:
- Board games: Chess, Checkers, Nine Men's Morris, Backgammon, Connect 4, Ludo, Battleship
- Card and dice games: UNO, Yahtzee, Memo quiz
- Quizzes: Flag Quiz, Did You Know?
- Classics: Minesweeper, Moorhuhn

## Can you play the games online against other people?
Yes. Chess, Checkers, Nine Men's Morris, Backgammon, Connect 4, Battleship, Memo quiz, Ludo, UNO and Yahtzee have an online mode. One player starts a game and gets a four-digit game code to tell the other person, who joins with that code. If the connection drops, the game shows it and reconnects.

## Can you also play the games against the computer?
Yes. In all board, card and dice games you can play against a computer opponent with the levels easy, medium and hard. Ludo, UNO and Yahtzee can also be played with several players on the same device.

## How are the games built?
All games are Angular components with their own game logic and computer opponent. The online games synchronize their game state through the Firebase Realtime Database. High scores and quiz questions partly come from Benjamin's NestJS backend.
