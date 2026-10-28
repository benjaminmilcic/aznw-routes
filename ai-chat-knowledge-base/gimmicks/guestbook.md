---
id: guestbook
title_de: Gästebuch
title_en: Guestbook
title_hr: Knjiga gostiju
route: /gimmicks/guestbook
category: gimmick
summary: Guestbook where visitors can leave formatted comments with files, with an embedded YouTube player.

aliases: [guestbook, comments, leave a message, entries, posts, Gästebuch, Kommentare, knjiga gostiju, komentari]
tech: [Angular, TinyMCE, YouTube player, DOMPurify, NestJS, file storage]
tools: [find_guestbook_entries, get_guestbook_entry]
related: [recipes]
subroutes: []
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/guestbook
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/guestbook
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/files
---

# Guestbook (Gimmick)

## What is the Guestbook gimmick?
In the guestbook on Benjamin's website visitors can leave a message and read the posts of other visitors. While reading, music can play through an embedded YouTube player.

## What can you do in the Guestbook?
- Read all previous entries
- Write your own comment in a popup, with formatting such as bold text, lists or links
- Attach files such as images to the comment
- Listen to music through the YouTube player while reading

## How is the Guestbook built?
The rich text editor TinyMCE is embedded for writing comments. The entries and uploaded files are stored by Benjamin's own NestJS backend. The guestbook used to run on a Spring Boot API. Before being displayed, the HTML of the comments is sanitized with DOMPurify so that no malicious code can run.
