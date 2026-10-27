---
id: todo-app
title_de: ToDo-App
title_en: To-do app
title_hr: ToDo aplikacija
route: /#portfolio
category: project
summary: Benjamin's own multi-user to-do app with real-time sync on all devices – as an installable PWA and an Android app, with NestJS and MySQL.

aliases: [to-do app, todo app, ToDo, task list, tasks, PWA, ToDo-App, Aufgabenliste, Aufgaben, popis zadataka]
tech: [Angular, Ionic, Capacitor, NestJS, TypeORM, Socket.IO, MySQL, PWA, Google OAuth]
tools: []
related: [portfolio, vocabulary-trainer, game-collection]
subroutes: []
source:
  - https://github.com/benjaminmilcic/to-do-app
---

# To-do app (Portfolio project)

## What is the To-do app?
The To-do app is Benjamin's own multi-user task list that keeps every device in sync in real time – as an installable Progressive Web App (PWA) in the browser and as a native Android app. It runs at todo-app.benjamin-milcic.dev, the Android app can be downloaded as an APK, and the source code is public on GitHub in the repository to-do-app.

## What can you do in the To-do app?
- Register with email and password or sign in with Google; you stay signed in on each device
- Create, complete, edit, reorder (drag and drop) and delete to-dos, with due dates, optional time and notes, and undo for deletions
- Every change appears on all your other devices within milliseconds; after being offline, a device catches up automatically
- Install it as a PWA on the desktop; it works offline with the last known list
- Dark mode and the languages German, English and Croatian
- The app points out new versions (PWA reload, new APK for Android)
- According to Benjamin's portfolio it also has AI speech input

## How is the To-do app built?
- Frontend: Angular, Ionic and Capacitor (Android), Angular service worker for the PWA
- Backend: NestJS with TypeORM, Socket.IO for the real-time sync and Passport for Google login
- Database: MySQL
- Login: short-lived JWT access tokens plus a refresh token per device that is rotated on every use
- Hosting on Benjamin's server with Apache as reverse proxy, systemd and deployment with GitHub Actions
