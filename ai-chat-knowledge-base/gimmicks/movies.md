---
id: movies
title_de: Filme
title_en: Movies
title_hr: Filmovi
route: /gimmicks/movies
category: gimmick
summary: Movie portal with popular, top-rated and now-playing movies, search, trailers, actor pages and streaming providers.

aliases: [movies, films, movie portal, cinema, trailer, actors, cast, streaming, Netflix, TMDB, Filme, Kino, Schauspieler, filmovi, kino]
tech: [Angular, Angular Material, TMDB API, YouTube player, HTTP interceptor]
tools: []
related: [recipes, imagegen]
subroutes:
  - { path: /gimmicks/movies/popular, title_en: Popular }
  - { path: /gimmicks/movies/top-rated, title_en: Top rated }
  - { path: /gimmicks/movies/now-playing, title_en: Now playing }
  - { path: /gimmicks/movies/search, title_en: Movie search }
  - { path: /gimmicks/movies/movie/:id, title_en: Movie details }
  - { path: /gimmicks/movies/actor/:id, title_en: Actor }
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/movies
---

# Movies (Gimmick)

## What is the Movies gimmick?
The Movies gimmick is a movie portal. It shows popular movies, the best-rated movies and the movies currently playing in cinemas. A search finds any movie.

## What can you do in the Movies gimmick?
- Switch between the tabs Popular, Top rated, Now playing and Search
- Sort movie lists by year, rating, title or popularity
- On a movie's detail page see the plot, director, budget, revenue, status, main cast and similar movies
- Play the trailer directly in the embedded YouTube player
- Find out where to stream, rent or buy the movie
- On an actor's page read the biography, birthday, place of birth and filmography

## How is the Movies gimmick built?
All movie data, images and streaming providers come from the TMDB API (The Movie Database), in the language of the website. An HTTP interceptor adds the API key and the language to every request. The lists use Angular Material pagination with translated labels.
