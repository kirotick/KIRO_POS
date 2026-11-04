# KIRO AI relay (Cloudflare Worker, free plan)

Lets the KIRO **website** use a free AI provider for "KIRO AI" answers without putting the AI key in the page.

```
Ask KIRO (website) ── question + anonymised totals ──▶ this relay (holds the key) ──▶ free AI provider
        ▲                                                                                  │
        └── browser checks every figure in the reply against its own data ◀── wording ◀────┘
            (any invented number: reply discarded, calculated answer shown)
```

Numbers are always calculated by KIRO's analytics (forecast, unusual bills, ABC items, bought-together, customer segments, reorder). The AI only puts those numbers into words. If the relay is off, busy or wrong, the calculated answer is shown. Invoice lookups, staff and customer questions never go to the relay at all.

## What is sent to the AI provider
Totals and labels only: sales for today, yesterday and the week; the forecast; counts of unusual bills; item class shares and top item **names**; bought-together item names; customer segment counts; reorder item names; staff as "Staff A, Staff B". **Never**: customer names or phones, invoice numbers, staff names, raw bills. Product names do go out, so do not name products after secrets.

## Choose a provider (check their current terms yourself)
| | Facts I could verify (Oct 2026) |
|---|---|
| **Groq** (default in `wrangler.toml`) | Its rate-limit page lists `openai/gpt-oss-120b` at 1,000 requests/day and 8,000 tokens/minute, shown as base limits for the free/developer plan. I did **not** verify its data-retention terms: read them before sending business data. |
| **Google Gemini** | Google's pricing page says the **free tier's content is used to improve Google's products** and the paid tier's is not. For business data, prefer the paid tier or another provider. |
| OpenRouter free models | Not checked. Limits and which models support the needed format change often. |
Any provider that speaks the OpenAI chat format works: set `AI_BASE_URL` and `AI_MODEL`. Model names change; copy the current one from the provider's console.

## Deploy (about 10 minutes, free)
1. Create a free Cloudflare account and a free API key at your chosen provider.
2. `npm install`, then `npx wrangler login`.
3. In `wrangler.toml` set `ALLOWED_ORIGINS` (your website's exact address, e.g. `https://www.yourshop.com`; use `http://localhost:PORT` only while testing), `AI_MODEL`, and `AI_BASE_URL` if not Groq.
4. `npx wrangler secret put AI_API_KEY` and paste the key (it is stored by Cloudflare, not in any file).
5. `npx wrangler deploy`. Copy the address it prints (`https://kiro-ai-relay.<you>.workers.dev`).
6. In `kiro.html`, set `const AI_RELAY_URL='https://kiro-ai-relay.<you>.workers.dev'` and republish the website. Leave it empty to turn AI wording off.

## What protects it
Only your listed website addresses are accepted; the model, the rules and the endpoint are fixed here and the caller cannot change them; request and data sizes are capped; per-address (20/hour) and daily (500) caps; provider errors become generic messages and the key never appears in any response. `npm test` runs 9 tests covering all of this.

## Limits to know
- **The origin check stops other websites, not a script that fakes the header.** The caps (kept per Worker instance, so approximate) protect your free quota. For stronger protection add a Cloudflare Rate Limiting rule or Turnstile.
- The rules text (`SYSTEM`) is duplicated from `server/node/src/ai.js`; a test fails if they drift apart.
- **Not deployed and not tried against a real provider** (no key or network here). Tested with a fake provider, and the website side tested in a browser against a fake relay. Do one real question after deploying.
- The relay is stateless and keeps no logs of your data; Cloudflare and the provider have their own logs and policies.
