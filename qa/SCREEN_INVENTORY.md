# KIRO screen inventory

Every screen that exists in the repository, where it lives, and how it is covered. "Covered" means an
automated test in `qa/tests` exercises it; "load only" means it is opened and checked for errors and layout
but its actions are not driven; "not covered" is stated plainly.

## Website (`web/site`, live)

| Screen | Route | Main elements | Interactive parts | Coverage |
|---|---|---|---|---|
| Home | `/` | Header nav (Features, Pricing, Blog, Downloads, KIRO LUX, Contact), Log in, Start free trial, hero with 4 floating photo cards, stats bar, theme switcher (tabs), FAQ (7), feature sections, marquee, footer | FAQ accordion, theme tabs (auto-rotate 8 s), photo cross-fade (3.6 s), rotating words, splash (hidden) | screens, motion, responsive, a11y, visual, perf |
| Features | `/features.html` | Nav, feature sections | Scroll reveal | screens, responsive, a11y, visual, perf |
| Pricing | `/pricing.html` | Nav, plans | Scroll reveal | screens (Log in link), responsive, a11y, visual, perf |
| Marketplace | `/marketplace.html` | Nav, KIRO LUX section, "Open KIRO LUX" | Scroll reveal | screens, responsive, a11y, visual, perf |
| Blog | `/blog.html` | Category buttons (6), 7 posts | Filter by category, empty state | screens (filter), responsive, a11y, visual, perf |
| Downloads | `/downloads.html` | App links (open `/app/`) | — | screens, responsive, a11y, visual, perf |
| Contact | `/contact.html` | Form: name, phone, shop, type (select), state (select), plan (select) | Validation, thank-you panel, "again" | screens (all errors, invalid phone, success) |
| Log in (old) | `/login.html` | Mobile/email tabs, intro | Tab switch, skip intro | screens; **no page links to it any more** |

Contact form: **does not send anywhere** (no backend, same as the design). Reported as a gap, not a bug in the tests.

## KIRO POS app (`/app/`, live)

Layouts: phone (bottom tab bar with round New bill button) and laptop (top menu bar with Home, Tables, Kitchen, Bills, Reports, More, search, New bill, notifications, profile).

| Screen id | What it is | Permission | Coverage |
|---|---|---|---|
| setup | First-run business setup (name required, UPI optional, sample menu) | — | e2e (validation, sample menu) |
| home | Today's sales, collected, expenses, unpaid, UPI/cash/card, channels, shortcuts, recent bills | home | e2e, responsive, a11y |
| order | New bill: order type, menu categories, search, item tiles, bill bar, KOT | sell | e2e (add items, rapid taps), responsive |
| collect | Collect payment: cash (quick amounts, change), card, split, credit, UPI QR | collect | e2e (cash, card, triple-click) |
| paid | Receipt: items, taxable value, CGST, SGST, round off, total, WhatsApp, print | collect | e2e (receipt arithmetic) |
| tables, tablesSetup | Table plan and setup | tables | load only |
| kitchen | Kitchen display of KOTs | kitchen | load only |
| bills, chanbills | Bill list, per channel | bills | load only |
| reports, closeday, money | Reports, day close, money summary | reports | load only |
| expenses | Expenses list and add | expenses | not covered |
| credit, reminders | Credit book, payment reminders (messages prepared, never sent automatically) | credit | not covered |
| menu, shop, counter, upi, language, colours, shortcuts | Settings | settings | not covered |
| staff, pinSetup, signin | Staff and PIN sign-in | staff | not covered (role tests needed) |
| online, channels, partnerOrder, google | Online orders and partner channels | online | not covered (needs accounts) |
| activity, errors, restore | Activity log, error log, backup restore | reports/backup | not covered |
| cloudSignin, cloudShop, locked, plan | Cloud sign-in and plan | — | not reachable (cloud switched off) |
| more, moreGroup, loading | Menus and loading | — | load only |

Sheets (pop-ups, 30): `alerts, bill, billChannel, billDetail, channel, confirm, creditStatement, customer, discount, expense, expPay, itemEdit, kitchenMenu, lineNote, nameEdit, options, pickTable, pin, profileMenu, reason, repay, reset, search, showQr, soon, staffEdit, staffPin, tableCards, tableLabel, weight`. Covered: `profileMenu` (opening while animating, links to website and shop). Others not driven yet.

## KIRO LUX shop (`/lux/`, live)

| View | id | Coverage |
|---|---|---|
| Home (offers carousel, categories, sellers, under ₹999, best sellers) | `v-home` | e2e, motion (carousel, dots), responsive, a11y, visual |
| Catalogue (category chips, seller filter, sort) | `v-shop` | e2e (category filter, search) |
| Product (sizes, wishlist, add to bag) | `v-pdp` | e2e |
| Wishlist | `v-wish` | e2e (badge count) |
| Bag (quantity −/+, remove) | `v-bag` | e2e (quantity) |
| Checkout (name, phone, address, pincode, payment choice) | `v-checkout` | e2e (validation, WhatsApp order once, XSS) |
| Orders | `v-orders` | not covered |
| Account | `v-acct` | not covered |

## Not published

| Screen | Where | Notes |
|---|---|---|
| Admin app: Ask, Home, Invoice, Login, Sales, Staff, Stock | `admin-app/src/screens` | Needs the API server; logic modules unit-tested; screens not tested (no emulator) |
| Saree desktop app | `desktop-saree` | No tests at all |
| Old website | `web/site-v1`, `web/single-file` | Not deployed, not tested |

## Broken or unfinished found during discovery

- Contact form shows "thank you" but sends nothing.
- `login.html` is orphaned (all Log in buttons now open the POS app).
- POS "Online orders", PhonePe and cloud sign-in need accounts that do not exist yet.
- Home page design contains an unused monthly/yearly toggle and a card carousel script whose markup is not on the page (motion test reports it as skipped).
