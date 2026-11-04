# kiro-erp-validator

A validation layer between shop-floor input and an ERP that only accepts strict JSON. No dependencies (Node 20+).

```
typed text / form fields ──▶ extract fields ──▶ validate (plain code) ──▶ { status:"valid", record }            -> ERP
                             (Claude, optional)                      └─▶ { status:"needs_clarification", message } -> back to the user
```

**Claude reads, code decides.** Claude (optional) only copies what the person wrote into fields. `src/validate.js` is ordinary code, so the same input always gets the same verdict, a wrong or manipulated extraction can at worst cause a question, and the ERP can only ever receive a record that passed `assertStrict` (exact keys, no null, no empty text, numbers as numbers).

## How your four points map to the code
| Your brief | Where |
|---|---|
| 1. Context: Purchase Orders and Inventory logs | `config/rules.example.json` → `modules.purchase_order`, `modules.inventory_log` |
| 2. Wrong UOM | `src/uom.js` (aliases, same-kind conversion), `validate.js` steps 4: unknown unit, wrong kind of unit (KG for a NOS item), conflicting unit, auto-convert to the item's base unit, quantity far outside the usual range with "did you mean 250 KG?" |
| 2. Similar vendor names | `src/match.js` (spelling distance + how words sound + partial names). **A vendor is never picked silently**: anything but an exact name/alias/ID asks, listing the candidates. |
| 2. Skipped mandatory fields | all gaps listed in one message |
| 3. Strict JSON, no nulls | schema = the `required`/`optional` key lists; optional keys are left out, never `null` |
| 4. Role: analyse, cross-check, warn politely, else emit JSON | `createValidator().process(module, text)` |

## Use it
```js
const { createValidator, createClaudeExtractor } = require('./src');
const v = createValidator({ masters: './my-masters.json', rules: './my-rules.json',
  extractor: process.env.ANTHROPIC_API_KEY && createClaudeExtractor({ apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.CLAUDE_MODEL }) });
const r = await v.process('purchase_order', '8 ton MS rod 12mm from sharma steal');
// r.status === 'needs_clarification'; show r.message to the user
// r.status === 'valid'; send r.record to the ERP, e.g. {"vendor_id":"V001","item_code":"RM-MS-12","quantity":250,"uom":"KG"}
```
For a form (no free text) call `v.validate('purchase_order', { vendor, item, quantity, uom })` directly.
When the user answers a question, send the corrected fields again, or pass `confirm: ['quantity_range']` (also `vendor_item_mismatch`, `date_past`, `possible_duplicate`) when they say "yes, it is correct". Pass `recent: [{at, record}]` to enable double-entry detection.

## What you must replace (nothing here is your real data)
| File | What to put there |
|---|---|
| `config/masters.example.json` | An export of **your** vendors (id, name, aliases, items they supply), items (code, name, aliases, base unit, usual min/max in that unit, whether decimals are allowed) and locations. The sample rows only make the tests run. |
| `config/rules.example.json` | Your exact JSON key names per module, movement types, duplicate window. The key names here are the ones from your brief (`vendor_id, item_code, quantity, uom`); the inventory keys are a guess. |
| `src/uom.js` | Any units you use that are missing. |
| `.env` | `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` if you want Claude to read free text. Optional; without them a simple offline parser handles `qty: 5 kg` lines and "5 kg item from vendor". |

## Tests (20, all passing)
`npm test`. They cover each error profile (unit mistakes, similar vendors, skipped fields), strictness (no null / empty / extra keys), conversion without float noise, double entry, inventory fields, the offline parser, and the Claude adapter with a fake network (request shape, forced tool call, ignoring unknown keys, errors, fallback, and an extraction that tries to talk its way past the rules).

## Honest limits
- **The Claude extractor has not been run against the real API** (no key or network in my sandbox); only its request/response handling is tested with a fake. Try it once with your key.
- The "usual range" check only works if you fill in `typical` for items. Items without it skip that check.
- Matching is tuned for English-spelled names. Hindi/regional-script input would need transliteration first (Claude can do that in the extraction step if you tell it to).
- Fuzzy matching can propose a wrong candidate, which is why it only ever asks.
- Not built: saving to your ERP, a screen for it, or an endpoint in the KIRO server. Say the word and I will wire it to `/api/...` and the app.
