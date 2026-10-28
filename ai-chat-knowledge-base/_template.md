---
# ─── Required fields ─────────────────────────────────────────────────────────
id: example-id               # unique, lowercase, hyphenated; becomes [Name](gimmick:<id>) in the chat
title_de: German name        # as in the website menu
title_en: English name
title_hr: Croatian name
route: /gimmicks/example     # internal Angular route; the only source for the link
category: gimmick            # gimmick | game | page | person | project
summary: One sentence describing the page. Used in the gimmick list of the system prompt.

# ─── Optional fields ─────────────────────────────────────────────────────────
aliases: []                  # synonyms in English, German and Croatian, typos – improves search
tech: []                     # frameworks, libraries, external APIs
tools: []                    # tools for live data on this page (see tools.md)
related: []                  # ids of related pages, for "you might also like"
subroutes: []                # sub-pages with their own route, each { path, title_en }
source: []                   # GitHub links to the code (frontend component, backend module) – the chat shows them
---

# English name (Gimmick)

<!--
Writing rules:
- Write everything in English. The chat answers in the visitor's language anyway.
- Each ##-section is retrieved on its own and must make sense without the rest.
  So always write "The <Name> gimmick …" instead of "It …" or "Here …".
- Phrase headings as questions, the way a visitor would ask.
- 80–300 words per section, the whole file ideally under ~2000 characters.
- Only facts that rarely change. Live data belongs in a tool.
- No URLs or routes in the text – they live in the frontmatter only.
- No code, no file paths.
- Simply leave out sections that don't apply.
- Only include pages that are reachable through the website navigation. Pages whose menu entry
  is commented out (even if the route still exists) get no file and are not mentioned anywhere.
-->

## What is the <Name> gimmick?
One to three sentences: what the page is and what it is used for.

## What can you do in the <Name> gimmick?
Features from the visitor's point of view, preferably as a list.

## How is the <Name> gimmick built?
Frameworks, data sources, notable implementation details. Where does the data come from, what runs in the backend?

## Why did Benjamin build the <Name> gimmick?
Background, motivation, what he tried out or learned.
