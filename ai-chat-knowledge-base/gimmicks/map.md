---
id: map
title_de: Karte
title_en: Map
title_hr: Karta
route: /gimmicks/map
category: gimmick
summary: Google Maps map of German cities with filters for population and federal state, search and a sortable table.

aliases: [map, Google Maps, cities, Germany, federal states, population, city search, Karte, Landkarte, Städte, Bundesländer, karta, gradovi]
tech: [Angular, Angular Google Maps, Google Maps API, Angular Material Table, drag and drop, angular-resizable-element]
tools: []
related: [countries, weather]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/map
---

# Map (Gimmick)

## What is the Map gimmick?
The Map gimmick shows the cities of Germany on a Google Maps map. For each city there is information such as rank, population and federal state.

## What can you do in the Map gimmick?
- Filter cities by population, for example only cities with 100,000 to 500,000 inhabitants
- Filter by federal state and reset the filter
- Find a city with a typeahead search
- View all cities in a table with sorting, filtering and pagination
- Move elements by drag and drop and resize them on small screens

## How is the Map gimmick built?
The Map gimmick is an Angular component using the official Angular Google Maps module and the Google Maps API. The table is an Angular Material table. Drag and drop and angular-resizable-element make the element movable and resizable. If the map is too small, the gimmick hides its functions and asks the visitor to make the map bigger.
