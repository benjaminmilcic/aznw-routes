---
id: flag-quiz
title_de: Flaggen-Quiz
title_en: Flag Quiz
title_hr: Kviz o zastavama
route: /gimmicks/games/flag-quiz
category: game
summary: Quiz where you type the country name for European flags.

aliases: [flag quiz, flags, country flags, Europe, quiz, Flaggen-Quiz, Flaggen, kviz o zastavama, zastave]
tech: [Angular, Signals, MyMemory API]
tools: []
related: [countries, trivia-quiz, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/flag-quiz
---

# Flag Quiz (Game)

## What is the Flag Quiz on Benjamin's website?
In the Flag Quiz the game shows the flag of a European country, and you type in the name of the country. The quiz counts your points and shows your accuracy in percent. "Restart" begins a new round.

## How is the Flag Quiz built?
The country data comes from a local copy of the former restcountries API, which has been shut down. The game filters the European countries from it. So that you can also answer in German or Croatian, the country names are translated with the MyMemory API.
