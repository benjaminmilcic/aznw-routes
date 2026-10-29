# Knowledge base for the AI chat

Everything the AI chat on benjamin-milcic.dev knows about Benjamin and the website (RAG) comes from here.
The chat itself runs in [python-aznw-api](https://github.com/benjaminmilcic/python-aznw-api).

| Source | Content |
|---|---|
| `person/*.md` | Benjamin himself: about him, CV (career and education), courses |
| `pages/*.md` | The home page and its sections, the AI chat, the architecture of the website |
| `gimmicks/**/*.md` | One file per visible gimmick or game |
| `src/app/pages/home/components/portfolio/portfolio.json` | The portfolio projects – the same file the website renders the portfolio from |
| `src/assets/i18n/en.json` | The English texts for the translation keys used in `portfolio.json` |
| `src/assets/cv/benjamin_milcic_cv_en*.pdf` | The English CV (the newest one, if there are several) |

Not part of the knowledge: `README.md`, `_template.md`, `tools.md` (the list of chat tools) and `test-questions.md`
(50 likely questions for testing the chat).
Live data – recipes, guestbook, jokes, Moorhuhn high scores, availability, weather – is not written down here: the chat
fetches it with tools, so it is always up to date.

## Was tun, wenn ich die Markdown-Dateien ändere?

1. **Datei bearbeiten oder neu anlegen.** Für eine neue Seite `_template.md` kopieren. Die Regeln stehen als
   Kommentar in der Vorlage, die wichtigsten:
   - alles auf Englisch (der Chat antwortet trotzdem in der Sprache der Frage)
   - jeder `## `-Abschnitt muss für sich allein verständlich sein, Überschriften als Fragen
   - `id` eindeutig, `route` genau wie in `app.routes.ts`, `source` mit den GitHub-Links zum Code
   - nur Seiten, die über die Navigation erreichbar sind
2. **Prüfen** (im Ordner `python-aznw-api`):
   ```powershell
   uv run python -m app.rag.check ../aznw-routes
   ```
   Das meldet fehlende Pflichtfelder, doppelte IDs, unbekannte IDs unter `related` und Routen, die es nicht gibt.
3. **Lokal ausprobieren** (optional): Die lokale Python-API liest die Dateien direkt aus `../aznw-routes`
   (`KNOWLEDGE_SOURCE=../aznw-routes` in ihrer `.env`). Nach einem Neustart oder spätestens nach 15 Minuten kennt der
   Chat die Änderung – es werden nur die geänderten Abschnitte neu eingebettet.
4. **Committen und auf den Branch `new` pushen.** Mehr ist nicht nötig: Der Workflow `refresh-chat-knowledge.yml`
   startet die Python-API auf dem Server neu, sie lädt die Wissensbasis sofort von GitHub (nur geänderte Abschnitte
   werden neu eingebettet). Kein Frontend-Deploy. Ohne den Workflow prüft die API ohnehin alle 15 Minuten auf
   Änderungen.
5. **Kontrollieren:** `curl http://127.0.0.1:8000/health` auf dem Server zeigt `knowledgePages`, `knowledgeChunks`
   und `knowledgeError` (null, wenn alles geklappt hat).

Das Gleiche gilt für `portfolio.json`, die Portfolio-Texte in `en.json` und einen neuen Lebenslauf
(`cv/benjamin_milcic_cv_en.pdf` – bei mehreren Dateien wird die neueste genommen, z.B. `…_en_2027.pdf`). Portfolio-Projekte mit `"hidden": true`
kennt der Chat nicht.

**Eine Seite fällt weg oder wird im Menü auskommentiert:** die `.md`-Datei löschen und ihre `id` aus allen
`related`-Listen entfernen (der Check meldet übrig gebliebene Verweise).

**Neues Tool für Live-Daten:** Das ist kein Markdown, sondern Code in `python-aznw-api/app/tools/` (siehe README dort).
Den Tool-Namen dann unter `tools` im Frontmatter der passenden Seite und in `tools.md` eintragen.
