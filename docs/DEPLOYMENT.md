# Deployment order

Do these in order. Each step lists what you must create yourself. Nothing here can be done for you, and no key is included.

1. **Database.** Create a PostgreSQL 13+ database. Run `server/node/migrations/001_phonepe.sql`, `002_core.sql`, `003_nightly.sql` in that order.
2. **API server.** Copy `server/node/.env.example` to `.env` on the server and fill it in (see `docs/CREDENTIALS.md`). `npm install`, then `npm start`. Put it behind HTTPS (Nginx or Cloudflare). Check `GET /health`.
3. **Website.** Upload `web/site/` to a static host. Or use `web/single-file/kiro.html` anywhere.
4. **AI relay (optional, website only).** In `ai-relay/`: `npm install`, `npx wrangler login`, set `ALLOWED_ORIGINS` and `AI_MODEL` in `wrangler.toml`, `npx wrangler secret put AI_API_KEY`, `npx wrangler deploy`. Put the printed address in `AI_RELAY_URL` inside `web/site/script.js`.
5. **Admin app.** In `admin-app/`: set `EXPO_PUBLIC_API_URL` to your API address. Run it with Expo Go, build it as a website with `npm run build:web`, or build store apps with EAS. Add the web address to `CORS_ORIGINS` on the API.
6. **Store links.** After Google Play and the App Store approve the app, paste the two addresses into `APP_LINKS` (`play`, `ios`) in `web/site/script.js`. Until then the badges show "Coming soon".
7. **Nightly 10 PM report (optional).** Set up WhatsApp Business Cloud API and an approved template, put the three `WA_*` values in the server `.env`, then the owner calls `PUT /api/business/report` with `{"ownerWa":"9876543210","on":true}`.

## Hosting notes
- The API must run all the time. Free hosts that sleep will miss the 10 PM report.
- Serve everything over HTTPS only.
- Back up PostgreSQL daily.
