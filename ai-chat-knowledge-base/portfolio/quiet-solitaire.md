---
id: quiet-solitaire
title_de: Quiet Solitaire
title_en: Quiet Solitaire
title_hr: Quiet Solitaire
route: /?project=quiet-solitaire#portfolio
category: project
summary: Benjamin's own website with five classic solitaire card games – Spider, Klondike, FreeCell, Pyramid and TriPeaks – where a solver guarantees that every deal can be won and the five difficulty levels reflect how hard a deal really is to solve.

aliases: [Quiet Solitaire, quietsolitaire, solitaire, patience, card games, Spider Solitaire, Klondike, FreeCell, Pyramid Solitaire, TriPeaks, solvable solitaire, Solitär, Patience, Kartenspiele, Spider Solitär, Pyramide, Solitär-Spiele, pasijans, kartaške igre, Piramida]
tech: [Angular, TypeScript, Angular SSR (prerendering), Transloco, Web Workers, Canvas, Web Audio API, Cloudflare Pages, GitHub Actions]
tools: []
related: [portfolio, game-collection, games, language-trainer]
subroutes: []
source: []
---

# Quiet Solitaire (Portfolio project)

## What is Quiet Solitaire?
Quiet Solitaire is Benjamin's own website with classic solitaire card games that run directly in the browser, without download or sign-up. It contains five games: Spider, Klondike, FreeCell, Pyramid and TriPeaks. The design is deliberately calm, and the games are available in English, German, French, Spanish and Italian. Benjamin built Quiet Solitaire as a modern alternative to the familiar solitaire collections, which are often full of advertising. The live website is linked in the portfolio; the source code is private.

## What makes Quiet Solitaire different from other solitaire games?
In Quiet Solitaire every deal is guaranteed to be solvable: a computer solver checks each deal in advance, and deals it cannot solve are never used. The five difficulty levels Easy, Medium, Hard, Expert and Master are not just labels but are measured for every deal – for example by how much search effort the solver needs, how many free cells a FreeCell deal requires, or how often a casual player who makes random sensible moves would win. The solvable deals are spread evenly across the five levels. In Spider the player also chooses 1, 2 or 4 suits, and in Klondike whether one or three cards are drawn.

## What can you do in Quiet Solitaire?
- Play Spider, Klondike, FreeCell, Pyramid and TriPeaks with drag and drop or by clicking a card
- Undo and redo without limit, get hints, or restart the same deal
- Track statistics per game, variant and difficulty level
- Choose between six card backs and six table backgrounds, with sound effects that can be switched off
- Continue a game later, because the current game is saved automatically in the browser
- Watch the cards flutter away after a win; the animation can be skipped or switched off
- Read the rules and tips for each game below the game

## How is Quiet Solitaire built?
Quiet Solitaire is an Angular app with standalone components, signals and zoneless change detection, written in TypeScript. Every page – each language combined with the main menu and each game – is prerendered at build time into static HTML with its own title, description, canonical and hreflang links, so search engines can read every language version. The site is hosted on Cloudflare Pages and deployed automatically with GitHub Actions; a sitemap is generated on each build. Translations use Transloco. The solvers and the difficulty ratings run in Web Workers, so new deals can be prepared in the background without slowing down the game. The playing cards are public-domain vector graphics, the card sounds are free recordings played with the Web Audio API, and the win animation is drawn on a canvas.
