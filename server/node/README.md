# KIRO payments API (Node.js Express + PostgreSQL)

PhonePe dynamic QR + automatic payment confirmation, one set of credentials per business.

```
Cashier screen ──POST /api/bills/:id/phonepe-qr──▶ API ──signed /qr/init──▶ PhonePe
      ▲                                              ▲                          │
      │ poll GET /api/bills/:id/status (2 s)         │ POST /phonepe-webhook    │ customer pays
      └──────────────── Paid ◀── DB update ◀─────────┴──── X-Verify checked ◀──┘
```

## Files
| File | Purpose |
|---|---|
| `migrations/001_phonepe.sql` | `merchant_payment_gateways`, `bills`, `phonepe_webhook_events` |
| `src/crypto.js` | AES-256-GCM encryption of salt keys (bound to the business id) |
| `src/phonepe.js` | X-Verify signing, QR init call, callback decoding |
| `src/store.js` | All SQL (parameterised, tenant-scoped, atomic Paid update) |
| `src/handlers.js` | saveGateway, createBill, createQr, billStatus, webhook |
| `src/auth.js` | **Placeholder** JWT check. Replace with KIRO's real login |
| `src/app.js`, `src/server.js`, `src/config.js` | Express wiring and env validation |
| `client/phonepe-pay.js` | Cashier-screen poller and success animation |
| `test/` | 14 unit tests + 1 real-Postgres test |

## Endpoints
- `PUT /api/gateway` (owner) body `{merchantId, saltKey, saltIndex}`. Salt key is encrypted before storage and never returned.
- `POST /api/bills` body `{invoiceNo, amountPaise}` (integer paise).
- `POST /api/bills/:id/phonepe-qr` returns `{qrString, expiresAt}`; reuses an unexpired QR.
- `GET /api/bills/:id/status` returns `{status: Pending|Paid|Review, expired, paidAt}`.
- `POST /phonepe-webhook` (public). Verifies `X-Verify = sha256(response + salt)###index` with the salt of the merchant named in the payload, then marks the bill Paid exactly once.

## What you must configure (nothing is invented; leave none blank)
| Setting | Where it goes |
|---|---|
| `DATABASE_URL` | server `.env` |
| `PHONEPE_KEK` (`openssl rand -base64 32`) | server `.env` / secret manager. **Losing it makes every stored salt key unreadable. Back it up.** |
| `JWT_SECRET` | server `.env`, only until you swap `src/auth.js` for real login |
| `PUBLIC_BASE_URL` (https) | server `.env`; PhonePe must be able to reach `PUBLIC_BASE_URL/phonepe-webhook` |
| `PHONEPE_BASE_URL`, `PHONEPE_QR_PATH` | server `.env`, copied from PhonePe's docs for your account (UAT first) |
| Per business: PhonePe MID, salt key, salt index | entered by the owner via `PUT /api/gateway`; stored encrypted in the database |
| Callback URL registration | PhonePe merchant dashboard, if PhonePe requires it |

Run: `psql "$DATABASE_URL" -f migrations/001_phonepe.sql && npm install && npm start`

## KIRO core API (login, sales, invoices, staff, stock, Ask KIRO)
Used by the mobile app in `../../admin-app`. Run `migrations/002_core.sql` after `001`. Money is integer paise. Every request is filtered by the caller's business; roles come from the database, not the token.

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /api/auth/signup`, `POST /api/auth/login` | public (rate limited) | create a business + owner / sign in (JWT, 12 h; account locks after 5 wrong passwords) |
| `GET /api/me`, `POST /api/auth/password` | any | profile + permission list, change password |
| `GET/POST /api/staff`, `PATCH /api/staff/:id` | owner | staff logins, role, on/off, **last active**, bills today |
| `GET/POST /api/items`, `PATCH /api/items/:id`, `POST /api/items/:id/stock` | list: any, write: owner/manager | items and stock lots |
| `POST /api/sales` | owner/manager/pos | atomic bill: gapless invoice number, FIFO stock, GST split |
| `GET /api/sales`, `GET /api/sales/:id`, `GET /api/sales/lookup?no=` | owner/manager/accounts see all; cashier only own | invoice list, detail, lookup by number |
| `GET /api/reports/summary?period=` | owner/manager/accounts (`mine=1` for anyone) | sales, invoice range, payment modes, by staff, top items, GST |
| `GET /api/reports/insights` | owner/manager/accounts | dead stock, fast movers, expiry, low stock |
| `POST /api/ask {question}` | owner/manager/accounts | **Ask KIRO**: keyword assistant answering from the above data (`{answer, intent, data}`); staff logins only for the owner; times in the business time zone |

Tests: `TEST_PG_HOST=... TEST_PG_PORT=... TEST_PG_DB=... npm test` runs 28 tests including the core API on a real PostgreSQL. `src/app.js` has no CORS headers because native apps do not need them; add `cors` only if you serve a browser app from another origin.

## Security built in
Salt keys encrypted at rest and tenant-bound; constant-time signature compare; forged, wrong-tenant and altered payloads get 401 and change nothing; unknown merchant and bad signature return the same answer; atomic idempotent `Pending -> Paid` (8 simultaneous callbacks test: one wins); paid amount must equal bill amount or the bill goes to `Review`; a callback can only pay bills of the business whose salt signed it; every endpoint filters by `business_id` (other tenants get 404); request size limits, rate limit on the webhook, generic errors, no secrets in logs.

## Differences from the guide, and why
1. The guide's example URLs are both `https://phonepe.com` (placeholders). The base URL is a required setting with no default.
2. The guide says to sign "the raw body" but its code signs the `response` field. I followed the code. If PhonePe signs the whole body, it is a one-line change in `handlers.js`.
3. Guide stores the salt key in plaintext `VARCHAR(100)`. Stored here as encrypted `TEXT`.
4. Guide uses `int(float(rs)*100)`, which can be off by a paisa. Amounts are integer paise end to end.
5. Guide polls every 10 s. Default here is 2 s (slower when the tab is hidden).
6. Callback fields beyond `code`, `data.merchantId`, `data.merchantTransactionId` are assumed (`data.amount` in paise); the amount check is skipped if absent.

## Test status (honest)
- Passed: 14 unit tests (signatures against independently computed values, forged/tampered/cross-tenant webhooks, replay, mismatch, tenant scoping, validation). Breaking the signature check makes them fail.
- Passed: migration and store SQL on a real PostgreSQL 16, including constraints and the concurrent-callback race.
- Passed: `client/phonepe-pay.js` in headless Chromium with a mocked API (paid, expired, 401, review, recover from network errors).
- **Not run:** `src/app.js` and `src/server.js` (Express and pg could not be installed in my sandbox; syntax-checked only). **No real PhonePe call was made.** Run `npm install && npm test` and one UAT payment before going live.
- Not built: refunds, reconciliation against PhonePe's status API for missed callbacks (recommended: poll PhonePe's status endpoint for bills still Pending after a few minutes), real login, push (SSE/WebSocket) updates.
- If the QR string is longer than 213 bytes, KIRO's built-in `qrSvg` returns nothing; use a QR library for it.

Run tests: `npm test` (add `TEST_PG_HOST`, `TEST_PG_PORT`, `TEST_PG_DB`, optional `TEST_PG_USER` to include the Postgres test; needs `psql` and an empty database).

## Nightly owner report (10 PM, WhatsApp text)

Every evening at 10 PM in the business's own time zone, the server sends the owner that day's summary on WhatsApp: sales, payment modes, top sellers, GST, low stock, expiring batches, money stuck in dead stock. It is text, not a PDF.

- **Numbers come from the database.** If `AI_API_KEY` and `AI_MODEL` are set, the AI only rewords the report in a friendlier tone. If its text contains any number that is not in the report (or the AI is down), the calculated text is sent instead.
- **Once a day.** The database records the last sent date and claims it before sending, so two server copies cannot double-send. If WhatsApp rejects the message, the claim is released and the next check (every 5 minutes) retries.
- **Needs these from you** (put them in the server `.env`, never in the app or GitHub): `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TEMPLATE` (and optionally `WA_TEMPLATE_LANG`, `WA_GRAPH_VERSION`). Create them in your Meta Business account (WhatsApp Business Cloud API).
- **Template.** WhatsApp only lets a business start a chat with a template Meta has approved. Create a Utility template with one body variable, for example `Your KIRO daily report: {{1}}`. Meta does not allow line breaks inside a variable, so the report lines are joined with ` | `.
- **Run the migration** `migrations/003_nightly.sql`, then the owner switches it on: `PUT /api/business/report` with `{"ownerWa":"9876543210","on":true}`. `GET /api/business/report` shows the status (number masked).
- Without the three `WA_*` values the job stays off and nothing is sent.
- The API server must be running at 10 PM (a normal always-on host; free hosts that sleep will miss it).
