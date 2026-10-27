---
id: trivia-quiz
title_de: Schon gewusst?
title_en: Did You Know?
title_hr: Jesi li znao?
route: /gimmicks/games/trivia-quiz
category: game
summary: Quiz with 15 curious questions per round, each with an explanation, an illustration and a read-aloud function.

aliases: [trivia, trivia quiz, curious questions, fun facts, did you know, quiz, Schon gewusst, jesi li znao]
tech: [Angular, NestJS, text-to-speech, SVG illustrations]
tools: []
related: [flag-quiz, memo-quiz, games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/games/trivia-quiz
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/trivia
---

# Did You Know? (Game)

## What is the "Did You Know?" quiz on Benjamin's website?
"Did You Know?" asks 15 curious questions per round with the answers A, B or C. After each answer the quiz explains why the correct answer is right. Many explanations come with an illustration, and you can have the explanation read aloud. Afterwards you can start a new round with new questions.

## How is the "Did You Know?" quiz built?
The questions are provided by Benjamin's NestJS backend, a random selection each time. If you switch the language during a round, the quiz loads the same questions in the new language, keeping the score and the current question. The read-aloud function plays an audio file for the explanation.
