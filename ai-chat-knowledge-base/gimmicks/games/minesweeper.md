---
id: minesweeper
title_de: Minesweeper
title_en: Minesweeper
title_hr: Minesweeper
route: /gimmicks/games/minesweeper
category: game
summary: The classic Minesweeper with three difficulty levels and a saved best time.

aliases: [Minesweeper, mines, Windows game, classic, Minensucher]
tech: [Angular, Signals, localStorage]
tools: []
related: [moorhuhn, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/minesweeper
---

# Minesweeper (Game)

## What is Minesweeper on Benjamin's website?
Minesweeper is the Windows classic: you uncover cells without hitting a mine. Numbers show how many mines are in the neighboring cells. You win when all cells without a mine are uncovered.

## How can you play Minesweeper?
There are three difficulty levels:
- Beginner: 9×9 cells with 10 mines
- Intermediate: 16×16 cells with 40 mines
- Expert: 30×16 cells with 99 mines
The game remembers your best time for each level. Minesweeper is best played with a mouse on a PC; it is less suitable for touch-only devices such as smartphones.

## How is Minesweeper built?
Minesweeper is an Angular component using Signals. The best times are stored in the browser's localStorage.
