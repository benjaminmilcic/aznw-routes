---
id: charts
title_de: Diagramme
title_en: Charts
title_hr: Grafikoni
route: /gimmicks/charts
category: gimmick
summary: Consumption charts for electricity, water and gas of fictional users, with user management and image cropping.

aliases: [charts, graphs, consumption, electricity, water, gas, bar chart, pie chart, line chart, crop image, Diagramme, Verbrauch, grafikoni]
tech: [Angular, Angular Material, Chart.js, ng2-charts, chartjs-plugin-datalabels, angular-cropperjs]
tools: []
related: [weather]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/charts
---

# Charts (Gimmick)

## What is the Charts gimmick?
The Charts gimmick shows the consumption of electricity, water and gas for several fictional users, for example Dagobert. The values can be compared as monthly, yearly and percentage consumption.

## What can you do in the Charts gimmick?
- View consumption as a bar, double bar, line or pie chart
- Switch between electricity, water and gas, single months and the whole year
- Add, edit and delete users
- Upload an image for each user and crop it directly in the browser

## How is the Charts gimmick built?
The charts are built with Chart.js via ng2-charts; the plugin chartjs-plugin-datalabels puts the values directly on the bars. Image cropping uses angular-cropperjs. The users and consumption values are demo data that are edited in the browser. User management sits in a collapsible Angular Material side drawer.
