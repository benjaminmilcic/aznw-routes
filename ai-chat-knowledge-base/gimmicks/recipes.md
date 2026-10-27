---
id: recipes
title_de: Rezepte
title_en: Recipes
title_hr: Recepti
route: /gimmicks/recipes
category: gimmick
summary: Recipe manager with recipe of the day, search, your own recipes with images, translation and a print view.

aliases: [recipes, recipe manager, cooking, food, ingredients, recipe of the day, recipe search, Rezepte, Kochen, Zutaten, recepti, kuhanje]
tech: [Angular, NgRx, NestJS, MyMemory API, franc-min, file upload, image editing, printing]
tools: [search_recipes]
related: [guestbook, movies]
subroutes:
  - { path: /gimmicks/recipes/list, title_en: Recipe list }
  - { path: /gimmicks/recipes/recipe/:id, title_en: Single recipe }
  - { path: /gimmicks/recipes/add, title_en: Add recipe }
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/recipes
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/recipes
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/files
---

# Recipes (Gimmick)

## What is the Recipes gimmick?
The Recipes gimmick is a recipe manager. Visitors can browse and search recipes and add their own. Every day a recipe of the day is featured.

## What can you do in the Recipes gimmick?
- Search the recipe list and view the recipe of the day
- Create, edit and delete your own recipes with name, image, ingredients and preparation
- Upload a recipe image by drag and drop (JPG, PNG or GIF up to 5 MB)
- Translate a recipe between German, English and Croatian and switch back to the original
- Print a recipe in a dedicated print view

## How is the Recipes gimmick built?
The state of the recipes is managed with NgRx store and effects. The recipes and images are stored by Benjamin's NestJS backend. For translation, the library franc-min first detects the language of the recipe, then the MyMemory API translates the text. Translations are cached to stay within the API's limit.
