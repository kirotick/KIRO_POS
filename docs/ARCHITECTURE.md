# Architecture

```
                      ┌────────────────────────────┐
 Owner phone ───────▶ │ admin-app (Expo / web)     │──┐
                      └────────────────────────────┘  │  HTTPS + JWT
 Shop browser ──────▶ web/ (kiro.html)                 ▼
   │  data in browser (localStorage)        ┌──────────────────────┐        ┌─────────────┐
   │  bill photos in browser (IndexedDB)    │ server/node (Express)│──────▶ │ PostgreSQL  │
   │                                        │ auth, roles, sales,  │        └─────────────┘
   │  question + anonymised totals          │ GST, reports, AI     │──▶ PhonePe (QR, webhook)
   ▼                                        │ nightly 10 PM report │──▶ WhatsApp Cloud API (Meta)
 ai-relay (Cloudflare Worker, holds AI key) │                      │──▶ AI provider (optional wording)
   │                                        └──────────────────────┘
   ▼
 AI provider (free tier)

 erp-validator: separate library. Typed text -> fields -> plain-code checks -> strict JSON for an ERP, or a question back to the user.
```

## Two ways to run
1. **Browser only** (`web/`): everything is in the browser. Fast to try, but data lives on one device, and a closed page cannot send anything on a schedule.
2. **With the server** (`server/node` + `admin-app`): shared data, staff logins by role, reports on the phone, the nightly WhatsApp report. The web app is not yet wired to the server for billing; the admin app and API are.

## Roles (server)
owner, manager, accounts, pos. Defined in `server/node/src/perms.js`. Cashiers see only their own sales. Staff logins are owner-only.

## KIRO AI
`analytics.js` and `ai-facts.js` calculate forecasts, unusual bills, ABC classes, bought-together items, customer segments and reorder points. Only anonymised totals go to the AI provider (never customer names or phones, invoice numbers, staff names or raw bills). If the AI is off or wrong, the calculated text is shown.

## Where data lives
| Data | Browser app | With server |
|---|---|---|
| Sales, stock, customers | localStorage (`kate_db_v1`) | PostgreSQL |
| Supplier bill photos | IndexedDB on that device only, not in backups | not stored on the server yet |
| Login | local only | JWT, scrypt password hashes |
