---
id: privacy
title_de: Datenschutz
title_en: Privacy
title_hr: Privatnost
route: none
category: page
summary: Which data the website and the AI chat store or pass on – no analytics, no tracking; data is only stored where a visitor enters it on purpose.

aliases: [privacy, data protection, data storage, personal data, cookies, tracking, GDPR, Datenschutz, Daten gespeichert, DSGVO, privatnost, zaštita podataka, osobni podaci]
tech: []
tools: []
related: [contact, ai-chat, architecture]
subroutes: []
source: []
---

# Privacy

## Does the website store my data?
The website does not track visitors: there is no analytics and no tracking cookie. Data is only stored where a visitor enters it on purpose:
- Guestbook: the name, text and images of an entry are stored and shown publicly.
- Moorhuhn high score: the entered name and the score.
- Login (for the Jokes gimmick): the email address and the password, which is stored only as a secure hash. After failed login attempts the IP address is stored for a while to block password guessing.
- Contact form: the message is sent to Benjamin by email and is not stored on the website.

## Does the AI chat store my conversation?
No, conversations are not saved. To answer, the question is sent via Benjamin's server to the language model of OpenAI. So that the chat can refer to earlier questions, the conversation is kept only in the server's memory – it is deleted when "New chat" is clicked, after two hours without activity or when the server restarts. Voice input is turned into text by Groq, reading answers aloud uses Microsoft's speech service, and the search in the knowledge base uses Cloudflare Workers AI.

## Which external services does the website use?
The website runs on a server at Strato; the domain and the protection of the server run through Cloudflare, which processes technical data such as the IP address to deliver the pages. Some gimmicks use further services: Google for the optional Google login, Stripe for payments in the Jokes gimmick, Firebase for the online games and map and weather services for the maps and the weather. For questions about privacy, visitors can contact Benjamin by email or the contact form.
