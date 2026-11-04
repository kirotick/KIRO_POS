# KIRO project audit

Audited 2026-11-05 from the repository itself (`kirotick/KIRO_POS`), not from assumptions.

## What is live and what is not

| Part | Folder | Technology | Live? |
|---|---|---|---|
| Marketing website (8 pages) | `web/site/*.html` | Static HTML built from the Claude Design canvas by `tools/build-design-site.mjs`; templates drawn by `web/site/dc-lite.js` with React 18 UMD from cdnjs | **Yes**: https://kiro-pos.netlify.app |
| KIRO POS app | `web/site/app/` | One-file vanilla JavaScript app (≈630 KB), IndexedDB storage, service worker `sw.js` for offline | **Yes**: `/app/` |
| KIRO LUX shop | `web/site/lux/` | One-file vanilla JavaScript shop, localStorage, orders via WhatsApp links | **Yes**: `/lux/` (old `/kkc/` redirects) |
| API server | `server/node/` | Node 20+, Express 5, `pg` (PostgreSQL), express-rate-limit | No (Render blueprint in `render.yaml`, not deployed) |
| Admin app | `admin-app/` | Expo 53 / React Native 0.79 / React 19, talks to the API server | No |
| AI relay | `ai-relay/` | Cloudflare Worker | No |
| ERP validator | `erp-validator/` | Plain Node library | Library only |
| Saree desktop app | `desktop-saree/` | Electron 33 + Vite + React 19 + better-sqlite3 | No |
| Old website | `web/site-v1/`, `web/single-file/` | Static HTML | Not published |

Package manager: **npm** (lockfiles in `server/node` and `qa`). Languages: JavaScript (CommonJS and ES modules), TypeScript only in the QA tests, SQL, a little Python under `server/sqlite-reference` and `server/phonepe`.

## Hosting and deployment

- Netlify site `kiro-pos` (team kiro-tick), linked to GitHub `kirotick/KIRO_POS` branch `main`, publishes `web/site` with no build step. Every push to `main` deploys.
- `netlify.toml`: publish folder, HTML post-processing off (it corrupted `index.html`), security headers, `/kkc/* → /lux/:splat` redirect.
- `render.yaml`: blueprint for the API server and a PostgreSQL database on Render (not deployed).

## POS app (`/app/`) — the product shops use

- State in `S` (settings, menu, staff, orders…) persisted to IndexedDB database `kiro-pos` (stores `kv`, `orders`, `audit`). Works offline; a BroadcastChannel warns when the app is open in two tabs.
- Roles and permissions (`PERMS` in the app): **owner, manager** (everything), **cashier** (sell, KOT, collect, discount, bills, tables, kitchen, expenses, credit, home, online), **waiter** (sell, KOT, tables), **kitchen** (kitchen screen). Staff sign in with a PIN on a shared device.
- Payments recorded: cash (with change), UPI (QR from the shop's UPI ID), card, split, credit ("udhar" credit book). No payment is processed by the app itself.
- GST: CGST + SGST at the item's rate, each rounded to paise, then the bill is rounded to the rupee with a visible "Round off" line.
- 40 screens, 30 sheets (pop-ups), 168 actions: see `SCREEN_INVENTORY.md`.
- Cloud sign-in (Supabase) is built in but switched off: `window.KIRO_CLOUD` is not configured, so no data leaves the device.

## API server (`server/node`)

- Routes (`src/app.js`): `GET /health`, `POST /phonepe-webhook`, `POST /api/auth/login`, `POST /api/auth/signup`, then under `/api` with a Bearer token: `GET /me`, `POST /auth/password`, `PATCH /business`, `GET|PUT /business/report`, `GET|POST /staff`, `PATCH /staff/:id`, `GET|POST /items`, `PATCH /items/:id`, `POST /items/:id/stock`, `GET|POST /sales`, `GET /sales/lookup`, `GET /sales/:id`, `GET /reports/summary`, `GET /reports/insights`, `POST /ask`, `POST /ai/ask`, `GET /ai/status`, `GET /ai/insights`, `PUT /gateway`, `POST /bills`, `POST /bills/:id/phonepe-qr`, `GET /bills/:id/status` (27 endpoints).
- Auth: HS256 JWT `{ businessId, role, sub, exp }` checked with `timingSafeEqual` and expiry (`src/auth.js`, marked "PLACEHOLDER AUTH" in the code); passwords hashed in `src/password.js`; login and signup rate-limited.
- Roles (`src/perms.js`): owner, manager, accounts, pos. The server is the real gate.
- Database (`migrations/*.sql`): `businesses, users, items, stock_lots, sales, sale_lines, sale_line_lots, merchant_payment_gateways, bills, phonepe_webhook_events`. Tenant separation is done in queries with `business_id` (25 references); there is **no PostgreSQL row-level security**.
- PhonePe merchant keys are stored encrypted with `PHONEPE_KEK`.

## Testing before this work

| Suite | Tests | Result before |
|---|---|---|
| `server/node/test` (handlers, analytics, AI, nightly, unit, real-Postgres) | 44 | 42 pass, 2 skipped (no Postgres) |
| `admin-app/test` | 5 | **Could not run anywhere but one computer**: required esbuild from `/opt/npm-tools/...` (fixed) |
| `ai-relay/test` | 9 | pass |
| `erp-validator/test` | 20 | pass |
| `desktop-saree/test` | 0 | empty folder |
| Website, POS app, shop | 0 | **No browser tests existed** |

No CI, no accessibility, responsive, motion, visual, performance or security checks existed.

## Gaps that remain (see qa/reports/summary.md "Not tested")

PostgreSQL-backed API tests over HTTP, load tests (k6), Android/iOS admin app (Appium), Electron app tests, physical printers and scanners, real Safari, manual screen-reader review, PhonePe/WhatsApp/Supabase sandboxes.
