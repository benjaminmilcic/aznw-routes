---
id: calendar
title_de: Kalender
title_en: Calendar
title_hr: Kalendar
route: /gimmicks/calendar
category: gimmick
summary: Yearly calendar with German public holidays, working days, a holiday scratch-card quiz, "on this day in history" and a print function.

aliases: [calendar, public holidays, working days, scratch card, on this day, history, clock, Kalender, Feiertage, Arbeitstage, Rubbelkarte, kalendar, praznici]
tech: [Angular, Angular Material, feiertagejs, Wikimedia API, MyMemory API, SVG, bottom sheet, popup modal]
tools: []
related: [games]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/calendar
---

# Calendar (Gimmick)

## What is the Calendar gimmick?
The Calendar gimmick is a yearly calendar with the public holidays in Germany and the number of working days per month. It also has an analog clock drawn as SVG.

## What can you do in the Calendar gimmick?
- Browse through the years and see public holidays and working days
- Click a day: a popup shows what happened on this day in history
- Open the holiday quiz: it asks which holiday falls on a given date, and the answer is revealed by scratching it free like a scratch card
- Print the calendar

## How is the Calendar gimmick built?
The public holidays are calculated by the library feiertagejs, including movable holidays such as Easter or Pentecost. The historical events come from the Wikimedia "On this day" API. There is no Croatian data there, so the English texts are translated with the MyMemory API. The quiz opens as an Angular Material bottom sheet.
