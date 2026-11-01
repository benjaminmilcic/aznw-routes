---
id: privacy
title_de: Datenschutz
title_en: Privacy
title_hr: Privatnost
route: /privacy
category: page
summary: The privacy policy – which data the website and the AI chat store or pass on; no analytics, no tracking; data is only stored where a visitor enters it on purpose.

aliases: [privacy, privacy policy, data protection, data storage, personal data, cookies, tracking, GDPR, Datenschutz, Datenschutzerklärung, Daten gespeichert, DSGVO, privatnost, zaštita podataka, osobni podaci]
tech: []
tools: []
related: [contact, ai-chat, architecture]
subroutes: []
source: []
---

# Privacy

The full privacy policy is on its own page, linked in the footer of the home page. It is available in German, English and Croatian; the controller is Benjamin Milčić, reachable by email.

## Does the website store my data?
The website does not track visitors: there is no analytics, no tracking cookie and no advertising. Data is only stored where a visitor enters it on purpose:
- Guestbook: the name, text and images of an entry are stored and shown publicly.
- Recipes: recipes a visitor creates are stored and shown publicly.
- Moorhuhn high score: the entered name and the score.
- Login (for the Jokes gimmick): the email address and the password, which is stored only as a secure hash. After failed login attempts the IP address is stored for at most 24 hours to block password guessing.
- Contact form: the message is sent to Benjamin by email (together with the sender's IP address) and is not stored on the website.

In the browser's local storage the website only keeps what features need, for example the login status, the name and avatar in the online games and best times in Minesweeper.

## Does the AI chat store my conversation?
No, conversations are not saved. To answer, the question is sent via Benjamin's server to the language model of OpenAI. So that the chat can refer to earlier questions, the conversation is kept only in the server's memory – it is deleted when "New chat" is clicked, after two hours without activity or when the server restarts. Voice input is turned into text by Groq, reading answers aloud uses Microsoft's speech service, and the search in the knowledge base uses Cloudflare Workers AI. These services get the question, but not the visitor's IP address.

## Which external services does the website use?
The website runs on a server at Strato; the domain and the protection of the server run through Cloudflare, which processes technical data such as the IP address to deliver the pages. Fonts and icons are self-hosted, so there is no request to Google Fonts. The Google Maps library is loaded when the website starts, so that the maps are ready. Some gimmicks use further services only when they are used: Google for the optional Google login, Stripe for payments in the Jokes gimmick, Firebase for the online games, map and weather services for maps and weather, TMDB for movies, TinyMCE for the guestbook editor and MyMemory for recipe translations. For questions about privacy, visitors can contact Benjamin by email or the contact form.
