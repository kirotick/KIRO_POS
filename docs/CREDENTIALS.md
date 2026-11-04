# Credentials you must create yourself

Never put these in the app, in the website files or in GitHub. Server values go in the server's `.env` (ignored by git). The relay key goes in Cloudflare's secret store.

| Value | Where it goes | Where you get it |
|---|---|---|
| `DATABASE_URL` | server `.env` | your PostgreSQL host |
| `JWT_SECRET` (32+ characters) | server `.env` | you generate: `openssl rand -base64 48` |
| `PHONEPE_KEK` | server `.env` | you generate: `openssl rand -base64 32` |
| `PHONEPE_BASE_URL`, `PHONEPE_QR_PATH` | server `.env` | PhonePe merchant documentation for your account (UAT first) |
| PhonePe merchant ID and salt key | saved per business through the API (stored encrypted with `PHONEPE_KEK`) | PhonePe merchant dashboard |
| `PUBLIC_BASE_URL` | server `.env` | your API's https address |
| `CORS_ORIGINS` | server `.env` | exact web address(es) of the admin website |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | server `.env` (KIRO AI) and Cloudflare secret/vars (relay) | your AI provider's console (check their data terms first) |
| `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TEMPLATE` | server `.env` | Meta Business account, WhatsApp Business Cloud API. The template must be approved first |
| `EXPO_PUBLIC_API_URL` | admin-app `.env` (public by design, no secret) | your API address |
| Android package name, iOS bundle id | `admin-app/app.json` | you choose |
| Google Play developer account, Apple Developer account | store consoles | you register (paid) |
| `APP_LINKS.play`, `APP_LINKS.ios` | `web/site/script.js` | the store listing addresses after approval |

If any of these was ever pasted into a chat, a file in git or a screenshot, treat it as leaked and create a new one.
