---
id: countries
title_de: Länder
title_en: Countries
title_hr: Zemlje
route: /gimmicks/countries
category: gimmick
summary: Interactive world map with a detail page for every country – basic facts, World Bank economic data, a Wikipedia text and the current weather.

aliases: [countries, world map, states, country info, capital, population, GDP, World Bank, flags, coat of arms, neighboring countries, Länder, Weltkarte, zemlje, države]
tech: [Angular, Leaflet, World Bank API, Wikipedia API, Open-Meteo API]
tools: []
related: [weather, flag-quiz, map]
subroutes:
  - { path: /gimmicks/countries/country/:code, title_en: Country details }
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/countries
---

# Countries (Gimmick)

## What is the Countries gimmick?
The Countries gimmick shows an interactive world map. Clicking a country opens a detail page with a lot of information about that country.

## What is on the detail page of a country in the Countries gimmick?
- Flag and coat of arms
- Basic information: capital, region, continent, population, area, independence, UN membership, landlocked
- Currency, languages, dialing code and internet domain
- Time zones, driving side, start of the week, FIFA code, coordinates and country codes
- Economy and society: GDP per capita and total, life expectancy, unemployment rate, population growth, infant mortality, literacy rate, internet users, CO₂ per capita, access to electricity, health expenditure and Gini index
- Neighboring countries, a Wikipedia text about the country and the current weather

## How is the Countries gimmick built?
The world map is built with Leaflet. The economic figures come live from the World Bank API, always the latest available value per indicator. The text about the country comes from the Wikipedia API in the language of the website, the weather from the Open-Meteo API.
