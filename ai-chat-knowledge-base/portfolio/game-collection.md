---
id: game-collection
title_de: Spielesammlung
title_en: Game collection
title_hr: Zbirka igara
route: /?project=game-collection#portfolio
category: project
summary: Benjamin's own collection of well-known multiplayer games with a shared drawing board and the kids AI chat "Sovica" – built with Angular and Firebase.

aliases: [game collection, games, multiplayer games, whiteboard, drawing board, Sovica, kids chat, Spielesammlung, Spiele, Malen, Kinder-Chat, zbirka igara, igre]
tech: [Angular, Firebase Firestore, Firebase Realtime Database, NestJS, Groq]
tools: []
related: [portfolio, games, vocabulary-trainer, todo-app]
subroutes: []
source:
  - https://github.com/benjaminmilcic/whiteboard
---

# Game collection (Portfolio project)

## What is the Game collection?
The Game collection is Benjamin's own web app with well-known multiplayer games. It started as a real-time drawing board (whiteboard) for Benjamin and his daughter and grew into a collection of games. It is available in several languages and has a live demo; the source code is public on GitHub in the repository whiteboard.

## Which games are in the Game collection?
The start page asks "What do you want to play?" and offers: Drawing board, Battleship, Memory, Connect Four, Backgammon, Checkers, Chess, Jigsaw, Guess the word (hangman), Yahtzee, UNO, Ludo, Nine Men's Morris and Wild Chickens (a Moorhuhn-style shooting game). In addition there is "Sovica", an AI chat for kids: an owl that children can ask anything.

## How is the Game collection built?
The Game collection is an Angular app. Games and the drawing board are synchronized in real time through Firebase (Firestore and Realtime Database). The drawing board supports touch and pen input on tablets, 10 colors and an adjustable line width. The kids chat "Sovica" has its own NestJS backend that uses language models on Groq, including speech recognition and a safety check of the answers. The portfolio on Benjamin's website links the live demo and the source code.
