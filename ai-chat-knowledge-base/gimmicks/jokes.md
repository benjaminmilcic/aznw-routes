---
id: jokes
title_de: Witze
title_en: Jokes
title_hr: Šale
route: /gimmicks/auth/main
category: gimmick
summary: Benjamin's joke book in German and Croatian – readable after login, with a demo order via Stripe and PayPal.

aliases: [jokes, joke book, book, login, sign in, sign up, registration, authentication, authorization, Stripe, PayPal, payment, Witze, Witzebuch, šale, vicevi]
tech: [Angular, Angular guards, HTTP interceptor, NestJS, Google login, Stripe, PayPal, text-to-speech]
tools: [get_random_joke]
related: [guestbook]
subroutes:
  - { path: /gimmicks/auth/login, title_en: Login }
source:
  - https://github.com/benjaminmilcic/aznw-routes/tree/new/src/app/pages/gimmicks/auth
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/auth
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/jokes
  - https://github.com/benjaminmilcic/nest-aznw-api/tree/master/src/stripe
---

# Jokes (Gimmick)

## What is the Jokes gimmick?
Benjamin has written a book of jokes, each one in pairs in German and Croatian. In the Jokes gimmick you can read some of these jokes after logging in. The gimmick demonstrates authentication, authorization and a payment system.

## How can you read the jokes in the Jokes gimmick?
You log in with your own account, which you can register right away, or with Google. If you don't want to create an account, the login page offers demo credentials to copy. After logging in you can read the jokes and have them read aloud.

## Can you order Benjamin's joke book?
The Jokes gimmick has an order form using Stripe. Since it is a demo, the book is not really ordered there. With Stripe test cards you can simulate a successful payment, a declined payment or a payment that requires additional authentication. Alternatively you can go through a PayPal payment on a demo checkout page. Anyone who really wants to read the book can buy it on Amazon.

## How is the Jokes gimmick built?
Login, registration, Google login, the jokes and the speech output are provided by Benjamin's NestJS backend. The page with the jokes is protected by Angular guards, and an HTTP interceptor attaches the token to every request. Originally the login ran on Firebase. The backend creates the payment through Stripe.
