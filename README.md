# KIRO platform

POS, ERP and pharmacy software for Indian small businesses. This repository holds every part of KIRO in one place.

| Folder | What it is | Runs on | Docs |
|---|---|---|---|
| `web/single-file/kiro.html` | The whole KIRO web app in one file (billing, pharmacy, stock, insights, Ask KIRO, bill photos). Data stays in the browser. | Any browser, any static host | `docs/ARCHITECTURE.md` |
| `web/site/` | The same app split into `index.html`, `style.css`, `script.js` for a website | Any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) | `docs/DEPLOYMENT.md` |
| `server/node/` | KIRO API: logins and roles, items, stock lots, sales, GST invoices, reports, Ask KIRO, KIRO AI, PhonePe QR, nightly 10 PM owner report | Node 20+, PostgreSQL 13+ | `server/node/README.md` |
| `server/phonepe/`, `server/sqlite-reference/` | PhonePe Python reference client and SQLite reference queries | Reference only | their READMEs |
| `admin-app/` | Owner/manager phone app (React Native + Expo), also builds as a website | Expo, EAS, any static host | `admin-app/README.md` |
| `ai-relay/` | Cloudflare Worker that holds the AI key for the website's KIRO AI | Cloudflare Workers (free plan) | `ai-relay/README.md` |
| `erp-validator/` | Checks purchase orders and inventory logs before they reach an ERP (strict JSON, no nulls) | Node 20+, no dependencies | `erp-validator/README.md` |
| `desktop-saree/` | Early Electron desktop prototype for a saree shop | Node 22.5+ | not finished |

Start with `docs/DEPLOYMENT.md` (order of steps) and `docs/CREDENTIALS.md` (every key you must create yourself, and where it goes).

## Rules this repo follows
- No secrets are committed. `.env` files are ignored; only `.env.example` files are tracked.
- Money is stored as integer paise on the server.
- Numbers shown by KIRO AI are calculated by code. The AI only rewords them, and any invented number is thrown away.

## Tests
Run `npm test` inside `server/node`, `ai-relay`, `erp-validator` and `admin-app`. Server tests that need PostgreSQL run only when `TEST_PG_HOST`, `TEST_PG_PORT` and `TEST_PG_DB` are set (see `server/node/test/pgpool.js`). See `docs/KNOWN-LIMITS.md` for what has and has not been tested.

## Licence
None chosen yet. Add a `LICENSE` file before making the repository public.
