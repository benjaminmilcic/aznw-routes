---
id: weather
title_de: Wetter
title_en: Weather
title_hr: Vrijeme
route: /gimmicks/weather
category: gimmick
summary: Weather forecast, 30-year climate chart and weather map for any place in the world.

aliases: [weather forecast, forecast, climate chart, climate, rain, precipitation, weather map, temperature, wind, Wetter, Wettervorhersage, Klimadiagramm, vrijeme, prognoza]
tech: [Angular, Angular Material, Ionic, Chart.js, ng2-charts, Open-Meteo API, OpenStreetMap API, Geonames API, Open-Meteo Archive API, MapTiler SDK, MapTiler Weather, NestJS]
tools: [get_weather]
related: [countries, map]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/weather
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/geolocation
---

# Weather (Gimmick)

## What is the Weather gimmick?
The Weather gimmick on Benjamin's website shows the current weather and the forecast for the next days for any place in the world. For the selected place there is also a climate chart with averages over 30 years and an interactive weather map.

## What can you do in the Weather gimmick?
In the Weather gimmick you first choose a place, either via the browser's current location or by searching for a city, optionally limited to one country. Then there are three views:
- **Current weather data:** temperature, weather conditions, humidity and wind, plus a forecast for several days. For each day you can open hourly charts for temperature and precipitation and a wind view with wind direction. Clicking an hour in the temperature chart shows the weather at that time.
- **Climate chart:** average temperature and precipitation per month, calculated from the measurements of the last 30 years.
- **Map:** an animated weather map with switchable layers for temperature, precipitation, wind and air pressure.

## How is the Weather gimmick built?
The Weather gimmick is an Angular component using Angular Material and Ionic. The forecast comes from the free Open-Meteo API. The climate chart is based on the Open-Meteo Archive API, which provides daily measurements for the last 30 years. The values are aggregated into monthly averages in the browser and cached per location. The charts are built with Chart.js via ng2-charts. The weather map uses the MapTiler SDK with the weather layers from MapTiler Weather. City search and converting coordinates into an address run through Benjamin's own NestJS backend, which uses OpenStreetMap and Geonames. The gimmick is available in German, English and Croatian.

