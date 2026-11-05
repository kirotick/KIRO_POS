# KIRO QA report

Run: 5/11/2026, 9:52:28 am · Machine: win32 · Browsers: chromium, webkit, edge, chrome

## Summary

| Area | Total | Passed | Failed | Flaky | Skipped |
|---|---|---|---|---|---|
| Unit suites (Node) | 109 | 109 | 0 | 0 | 0 |
| Browser · other (Chromium) | 283 | 281 | 0 | 0 | 2 |
| Cross-browser · webkit | 33 | 33 | 0 | 0 | 0 |
| Cross-browser · edge | 33 | 33 | 0 | 0 | 0 |
| Cross-browser · chrome | 33 | 33 | 0 | 0 | 0 |
| Security scan | 1 findings | — | P0 0 · P1 0 | P2 0 | P3 1 |

**Browser tests: 380/382 passed (99%), 0 failed, 2 skipped. Unit: 109/109 passed.** Skipped and not-run items are never counted as passed.

Steps: PASS Unit tests of every sub-project (68s) · PASS Security scan (18s) · PASS Browser tests in Chromium: screens, POS, shop, motion, responsive, accessibility, visual, XSS (266s) · PASS Performance in Chromium (measured alone) (69s) · PASS Cross-browser: chrome, webkit, edge (162s)

## Bugs and findings

| Severity | Where | What | Detail |
|---|---|---|---|
| P3 | security · headers | missing content-security-policy | https://kiro-pos.netlify.app/ → Add it under [[headers]] in netlify.toml. |
| P3 | accessibility · Features | color-contrast: Elements must meet minimum color contrast ratio thresholds | 4 element(s), e.g. div:nth-child(1) > span:nth-child(2) |
| P3 | accessibility · Home | color-contrast: Elements must meet minimum color contrast ratio thresholds | 14 element(s), e.g. section:nth-child(7) > .reveal.in:nth-child(1) > span |
| P3 | accessibility · KIRO LUX shop | color-contrast: Elements must meet minimum color contrast ratio thresholds | 11 element(s), e.g. button[data-cat-open="all"] |
| P3 | accessibility · Marketplace | color-contrast: Elements must meet minimum color contrast ratio thresholds | 4 element(s), e.g. span:nth-child(2) |
| P3 | accessibility · POS app (after setup) | color-contrast: Elements must meet minimum color contrast ratio thresholds | 1 element(s), e.g. .chan-word-swiggy |
| P3 | accessibility · Pricing | color-contrast: Elements must meet minimum color contrast ratio thresholds | 4 element(s), e.g. span:nth-child(2) |

Severity: P0 critical · P1 high · P2 medium · P3 low.

## Screens covered

Home, Features, Pricing, Marketplace, Blog, Downloads, Contact, Log in, POS app, KIRO LUX

## Performance (local server, Chromium)

| Page | LCP ms | DOMContentLoaded ms | Load ms | Weight KB | Requests | DOM nodes |
|---|---|---|---|---|---|---|
| Blog | 760 | 563 | 1057 | 106 | 5 | 150 |
| Contact | 592 | 507 | 990 | 110 | 5 | 168 |
| Downloads | 644 | 545 | 1647 | 104 | 5 | 125 |
| Features | 1220 | 641 | 1144 | 247 | 2 | 243 |
| Home | 632 | 671 | 1607 | 547 | 7 | 1181 |
| KIRO LUX shop | 304 | 269 | 270 | 802 | 1 | 365 |
| Log in (old page) | 620 | 482 | 960 | 135 | 5 | 89 |
| Marketplace | 1272 | 583 | 1154 | 53 | 2 | 233 |
| POS app | 604 | 588 | 589 | 589 | 4 | 52 |
| Pricing | 1344 | 679 | 1242 | 234 | 2 | 248 |

POS app, 60 bills in a row: average 458 ms per whole bill, median 453, p95 513, max 583.

## Load test (k6, API server on the Neon "qa" test branch)

| Run | Users | Requests | Req/s | Errors | All p95 ms | Reads p95 ms | Sales p95 ms | Thresholds |
|---|---|---|---|---|---|---|---|---|
| load-pool10 | 1→100 | 4506 | 27.1 | 0.00% | 2879 | 3031 | 1551 | NOT met |
| load-pool20 | 1→100 | 7041 | 42.8 | 0.00% | 1219 | 1325 | 685 | met |

Environment: local API server on this PC + Neon free tier (Singapore), PostgreSQL 18, pool max 10 connections. Run it with `npm run qa:load` (needs k6 and qa/.env).

## Accessibility (axe, WCAG 2.1 A/AA)

| Page | Critical | Serious | Moderate/minor |
|---|---|---|---|
| Blog | 0 | 0 | 0 |
| Contact | 0 | 0 | 0 |
| Downloads | 0 | 0 | 0 |
| Features | 0 | color-contrast (4) | 0 |
| Home | 0 | color-contrast (14) | 0 |
| KIRO LUX shop | 0 | color-contrast (11) | 0 |
| Log in (old page) | 0 | 0 | 0 |
| Marketplace | 0 | color-contrast (4) | 0 |
| POS app | 0 | 0 | 0 |
| POS app (after setup) | 0 | color-contrast (1) | 0 |
| Pricing | 0 | color-contrast (4) | 0 |

## Not tested (blocked or out of reach)

- Firefox: could not start on this machine (for Firefox on Windows usually the missing Microsoft Visual C++ runtime); runs in the weekly GitHub Actions job.
- Load above 100 simultaneous users (250, 500): not attempted on the Neon free tier; the static site on Netlify’s CDN is never load-tested in production.
- The deployed API server: not deployed yet, so its HTTP tests run against a local server on the Neon “qa” branch, not against Render.
- Admin app (Expo / React Native) screens on Android and iOS: needs emulators or devices (Appium not set up). Its logic modules are unit-tested.
- Saree desktop app (Electron): its billing and stock logic has 7 tests on SQLite; the Electron windows themselves are not driven.
- Physical hardware: thermal/A4 printers, barcode scanners, cash drawers, Bluetooth/USB devices. Print and WhatsApp buttons are only checked to exist.
- Real devices and real Safari on iPhone/Mac: WebKit on Windows is the Safari engine, not Safari itself. Emulated phones are not equal to physical phones.
- Cloud sign-in, plan checks, online orders, PhonePe payments and nightly WhatsApp report: need accounts and sandbox credentials.
- Manual screen-reader pass (NVDA/TalkBack/VoiceOver): automated axe checks cannot prove a page is fully accessible.

## All browser tests

| | Suite | Browser | Test | Error |
|---|---|---|---|---|
| ✅ | other | chromium | axe: Home |  |
| ✅ | other | chromium | axe: Features |  |
| ✅ | other | chromium | axe: Pricing |  |
| ✅ | other | chromium | axe: Marketplace |  |
| ✅ | other | chromium | axe: Blog |  |
| ✅ | other | chromium | axe: Downloads |  |
| ✅ | other | chromium | axe: Contact |  |
| ✅ | other | chromium | axe: Log in (old page) |  |
| ✅ | other | chromium | axe: POS app |  |
| ✅ | other | chromium | axe: KIRO LUX shop |  |
| ✅ | other | chromium | axe: POS app home after setup |  |
| ✅ | other | chromium | keyboard: Tab moves through the Home page with a visible focus ring |  |
| ✅ | other | chromium | categories filter the catalogue |  |
| ✅ | other | chromium | search narrows products |  |
| ✅ | other | chromium | wishlist and bag: add, count badges, quantity, remove, checkout validation |  |
| ✅ | other | chromium | setup: business name is required, sample menu loads |  |
| ✅ | other | chromium | bill: totals, GST split and round-off are consistent |  |
| ✅ | other | chromium | rapid clicks on "Cash received" create exactly one bill |  |
| ✅ | other | chromium | rapid clicks on an item tile add one item per click, no more |  |
| ✅ | other | chromium | paid bill survives a page refresh (saved on the device) |  |
| ✅ | other | chromium | More menu links to the website and the KIRO LUX shop |  |
| ✅ | other | chromium | main navigation reaches every website page, back and forward work |  |
| ✅ | other | chromium | Log in and Start free trial open the POS app |  |
| ✅ | other | chromium | old /kkc/ address redirects to the KIRO LUX shop |  |
| ✅ | other | chromium | website forms and filters: contact validation, blog filter, FAQ, login tabs |  |
| ✅ | other | chromium | Home (/) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Home (/) › internal links all resolve |  |
| ✅ | other | chromium | Features (/features.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Features (/features.html) › internal links all resolve |  |
| ✅ | other | chromium | Pricing (/pricing.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Pricing (/pricing.html) › internal links all resolve |  |
| ✅ | other | chromium | Marketplace (/marketplace.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Marketplace (/marketplace.html) › internal links all resolve |  |
| ✅ | other | chromium | Blog (/blog.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Blog (/blog.html) › internal links all resolve |  |
| ✅ | other | chromium | Downloads (/downloads.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Downloads (/downloads.html) › internal links all resolve |  |
| ✅ | other | chromium | Contact (/contact.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Contact (/contact.html) › internal links all resolve |  |
| ✅ | other | chromium | Log in (old page) (/login.html) › loads with content, a title and no errors |  |
| ✅ | other | chromium | Log in (old page) (/login.html) › internal links all resolve |  |
| ✅ | other | chromium | POS app (/app/) › loads with content, a title and no errors |  |
| ✅ | other | chromium | POS app (/app/) › internal links all resolve |  |
| ✅ | other | chromium | KIRO LUX shop (/lux/) › loads with content, a title and no errors |  |
| ✅ | other | chromium | KIRO LUX shop (/lux/) › internal links all resolve |  |
| ✅ | other | chromium | zoom 125%: hero cards scale with the heading |  |
| ✅ | other | chromium | zoom 100%: hero cards scale with the heading |  |
| ✅ | other | chromium | zoom 80%: hero cards scale with the heading |  |
| ✅ | other | chromium | zoom 67%: hero cards scale with the heading |  |
| ✅ | other | chromium | normal motion › hero cards: same size, bob up and down together, never touch text or each other |  |
| ✅ | other | chromium | normal motion › hero photos cross-fade to new pictures while moving |  |
| ✅ | other | chromium | normal motion › frame rate and layout shift on the Home page |  |
| ⏭️ | other | chromium | normal motion › Home card carousel advances by itself and pauses on hover |  |
| ✅ | other | chromium | normal motion › KIRO LUX offer carousel slides and its dots follow |  |
| ✅ | other | chromium | normal motion › no full-screen intro blocks the page after loading |  |
| ✅ | other | chromium | normal motion › POS app: sheets open usable mid-animation, toasts appear and go away |  |
| ✅ | other | chromium | normal motion › only intended animations run forever |  |
| ✅ | other | chromium | reduced motion (visitor turned animations off) › hero cards still move together and swap photos, same size |  |
| ✅ | other | chromium | reduced motion (visitor turned animations off) › every page: nothing runs forever, content still reachable |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Home |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Features |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Blog |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Contact |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 320x568 mobile @mobile › POS app |  |
| ✅ | other | chromium | 320x568 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 320x568 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 320x568 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Home |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Features |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Blog |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Contact |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 360x800 mobile @mobile › POS app |  |
| ✅ | other | chromium | 360x800 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 360x800 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 360x800 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Home |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Features |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Blog |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Contact |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 375x812 mobile @mobile › POS app |  |
| ✅ | other | chromium | 375x812 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 375x812 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 375x812 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Home |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Features |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Blog |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Contact |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 390x844 mobile @mobile › POS app |  |
| ✅ | other | chromium | 390x844 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 390x844 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 390x844 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Home |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Features |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Blog |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Contact |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 414x896 mobile @mobile › POS app |  |
| ✅ | other | chromium | 414x896 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 414x896 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 414x896 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Home |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Features |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Pricing |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Marketplace |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Blog |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Downloads |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Contact |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Log in (old page) |  |
| ✅ | other | chromium | 480x900 mobile @mobile › POS app |  |
| ✅ | other | chromium | 480x900 mobile @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 480x900 mobile @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 480x900 mobile @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Home |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Features |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Pricing |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Marketplace |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Blog |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Downloads |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Contact |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Log in (old page) |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › POS app |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 844x390 mobile-landscape @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Home |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Features |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Pricing |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Marketplace |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Blog |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Downloads |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Contact |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Log in (old page) |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › POS app |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 768x1024 tablet @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Home |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Features |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Pricing |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Marketplace |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Blog |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Downloads |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Contact |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Log in (old page) |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › POS app |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 820x1180 tablet @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Home |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Features |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Pricing |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Marketplace |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Blog |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Downloads |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Contact |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Log in (old page) |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › POS app |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › KIRO LUX shop |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1180x820 tablet-landscape @mobile › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1024x768 laptop › Home |  |
| ✅ | other | chromium | 1024x768 laptop › Features |  |
| ✅ | other | chromium | 1024x768 laptop › Pricing |  |
| ✅ | other | chromium | 1024x768 laptop › Marketplace |  |
| ✅ | other | chromium | 1024x768 laptop › Blog |  |
| ✅ | other | chromium | 1024x768 laptop › Downloads |  |
| ✅ | other | chromium | 1024x768 laptop › Contact |  |
| ✅ | other | chromium | 1024x768 laptop › Log in (old page) |  |
| ✅ | other | chromium | 1024x768 laptop › POS app |  |
| ✅ | other | chromium | 1024x768 laptop › KIRO LUX shop |  |
| ✅ | other | chromium | 1024x768 laptop › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1024x768 laptop › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1280x800 laptop › Home |  |
| ✅ | other | chromium | 1280x800 laptop › Features |  |
| ✅ | other | chromium | 1280x800 laptop › Pricing |  |
| ✅ | other | chromium | 1280x800 laptop › Marketplace |  |
| ✅ | other | chromium | 1280x800 laptop › Blog |  |
| ✅ | other | chromium | 1280x800 laptop › Downloads |  |
| ✅ | other | chromium | 1280x800 laptop › Contact |  |
| ✅ | other | chromium | 1280x800 laptop › Log in (old page) |  |
| ✅ | other | chromium | 1280x800 laptop › POS app |  |
| ✅ | other | chromium | 1280x800 laptop › KIRO LUX shop |  |
| ✅ | other | chromium | 1280x800 laptop › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1280x800 laptop › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1366x768 laptop › Home |  |
| ✅ | other | chromium | 1366x768 laptop › Features |  |
| ✅ | other | chromium | 1366x768 laptop › Pricing |  |
| ✅ | other | chromium | 1366x768 laptop › Marketplace |  |
| ✅ | other | chromium | 1366x768 laptop › Blog |  |
| ✅ | other | chromium | 1366x768 laptop › Downloads |  |
| ✅ | other | chromium | 1366x768 laptop › Contact |  |
| ✅ | other | chromium | 1366x768 laptop › Log in (old page) |  |
| ✅ | other | chromium | 1366x768 laptop › POS app |  |
| ✅ | other | chromium | 1366x768 laptop › KIRO LUX shop |  |
| ✅ | other | chromium | 1366x768 laptop › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1366x768 laptop › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1440x900 desktop › Home |  |
| ✅ | other | chromium | 1440x900 desktop › Features |  |
| ✅ | other | chromium | 1440x900 desktop › Pricing |  |
| ✅ | other | chromium | 1440x900 desktop › Marketplace |  |
| ✅ | other | chromium | 1440x900 desktop › Blog |  |
| ✅ | other | chromium | 1440x900 desktop › Downloads |  |
| ✅ | other | chromium | 1440x900 desktop › Contact |  |
| ✅ | other | chromium | 1440x900 desktop › Log in (old page) |  |
| ✅ | other | chromium | 1440x900 desktop › POS app |  |
| ✅ | other | chromium | 1440x900 desktop › KIRO LUX shop |  |
| ✅ | other | chromium | 1440x900 desktop › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1440x900 desktop › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | 1920x1080 desktop › Home |  |
| ✅ | other | chromium | 1920x1080 desktop › Features |  |
| ✅ | other | chromium | 1920x1080 desktop › Pricing |  |
| ✅ | other | chromium | 1920x1080 desktop › Marketplace |  |
| ✅ | other | chromium | 1920x1080 desktop › Blog |  |
| ✅ | other | chromium | 1920x1080 desktop › Downloads |  |
| ✅ | other | chromium | 1920x1080 desktop › Contact |  |
| ✅ | other | chromium | 1920x1080 desktop › Log in (old page) |  |
| ✅ | other | chromium | 1920x1080 desktop › POS app |  |
| ✅ | other | chromium | 1920x1080 desktop › KIRO LUX shop |  |
| ✅ | other | chromium | 1920x1080 desktop › POS app after setup (billing screen) |  |
| ✅ | other | chromium | 1920x1080 desktop › Home hero cards: same size, inside the screen |  |
| ✅ | other | chromium | POS app: script in business name, item search and expense notes does not run |  |
| ✅ | other | chromium | KIRO LUX: script in search and checkout fields does not run |  |
| ⏭️ | other | chromium | live site security headers |  |
| ✅ | other | chromium | 375x812 › Home |  |
| ✅ | other | chromium | 375x812 › Features |  |
| ✅ | other | chromium | 375x812 › Pricing |  |
| ✅ | other | chromium | 375x812 › Marketplace |  |
| ✅ | other | chromium | 375x812 › Blog |  |
| ✅ | other | chromium | 375x812 › Downloads |  |
| ✅ | other | chromium | 375x812 › Contact |  |
| ✅ | other | chromium | 375x812 › Log in (old page) |  |
| ✅ | other | chromium | 375x812 › POS app |  |
| ✅ | other | chromium | 375x812 › KIRO LUX shop |  |
| ✅ | other | chromium | 768x1024 › Home |  |
| ✅ | other | chromium | 768x1024 › Features |  |
| ✅ | other | chromium | 768x1024 › Pricing |  |
| ✅ | other | chromium | 768x1024 › Marketplace |  |
| ✅ | other | chromium | 768x1024 › Blog |  |
| ✅ | other | chromium | 768x1024 › Downloads |  |
| ✅ | other | chromium | 768x1024 › Contact |  |
| ✅ | other | chromium | 768x1024 › Log in (old page) |  |
| ✅ | other | chromium | 768x1024 › POS app |  |
| ✅ | other | chromium | 768x1024 › KIRO LUX shop |  |
| ✅ | other | chromium | 1366x768 › Home |  |
| ✅ | other | chromium | 1366x768 › Features |  |
| ✅ | other | chromium | 1366x768 › Pricing |  |
| ✅ | other | chromium | 1366x768 › Marketplace |  |
| ✅ | other | chromium | 1366x768 › Blog |  |
| ✅ | other | chromium | 1366x768 › Downloads |  |
| ✅ | other | chromium | 1366x768 › Contact |  |
| ✅ | other | chromium | 1366x768 › Log in (old page) |  |
| ✅ | other | chromium | 1366x768 › POS app |  |
| ✅ | other | chromium | 1366x768 › KIRO LUX shop |  |
| ✅ | other | chromium | load performance: Home |  |
| ✅ | other | chromium | load performance: Features |  |
| ✅ | other | chromium | load performance: Pricing |  |
| ✅ | other | chromium | load performance: Marketplace |  |
| ✅ | other | chromium | load performance: Blog |  |
| ✅ | other | chromium | load performance: Downloads |  |
| ✅ | other | chromium | load performance: Contact |  |
| ✅ | other | chromium | load performance: Log in (old page) |  |
| ✅ | other | chromium | load performance: POS app |  |
| ✅ | other | chromium | load performance: KIRO LUX shop |  |
| ✅ | other | chromium | POS app stays fast with 60 bills in a day |  |
| ✅ | other | webkit | categories filter the catalogue |  |
| ✅ | other | webkit | search narrows products |  |
| ✅ | other | webkit | wishlist and bag: add, count badges, quantity, remove, checkout validation |  |
| ✅ | other | edge | categories filter the catalogue |  |
| ✅ | other | edge | search narrows products |  |
| ✅ | other | edge | wishlist and bag: add, count badges, quantity, remove, checkout validation |  |
| ✅ | other | chrome | categories filter the catalogue |  |
| ✅ | other | chrome | search narrows products |  |
| ✅ | other | chrome | wishlist and bag: add, count badges, quantity, remove, checkout validation |  |
| ✅ | other | webkit | setup: business name is required, sample menu loads |  |
| ✅ | other | webkit | bill: totals, GST split and round-off are consistent |  |
| ✅ | other | webkit | rapid clicks on "Cash received" create exactly one bill |  |
| ✅ | other | webkit | rapid clicks on an item tile add one item per click, no more |  |
| ✅ | other | webkit | paid bill survives a page refresh (saved on the device) |  |
| ✅ | other | webkit | More menu links to the website and the KIRO LUX shop |  |
| ✅ | other | edge | setup: business name is required, sample menu loads |  |
| ✅ | other | edge | bill: totals, GST split and round-off are consistent |  |
| ✅ | other | edge | rapid clicks on "Cash received" create exactly one bill |  |
| ✅ | other | edge | rapid clicks on an item tile add one item per click, no more |  |
| ✅ | other | edge | paid bill survives a page refresh (saved on the device) |  |
| ✅ | other | edge | More menu links to the website and the KIRO LUX shop |  |
| ✅ | other | chrome | setup: business name is required, sample menu loads |  |
| ✅ | other | chrome | bill: totals, GST split and round-off are consistent |  |
| ✅ | other | chrome | rapid clicks on "Cash received" create exactly one bill |  |
| ✅ | other | chrome | rapid clicks on an item tile add one item per click, no more |  |
| ✅ | other | chrome | paid bill survives a page refresh (saved on the device) |  |
| ✅ | other | chrome | More menu links to the website and the KIRO LUX shop |  |
| ✅ | other | webkit | main navigation reaches every website page, back and forward work |  |
| ✅ | other | webkit | Log in and Start free trial open the POS app |  |
| ✅ | other | webkit | old /kkc/ address redirects to the KIRO LUX shop |  |
| ✅ | other | webkit | website forms and filters: contact validation, blog filter, FAQ, login tabs |  |
| ✅ | other | edge | main navigation reaches every website page, back and forward work |  |
| ✅ | other | edge | Log in and Start free trial open the POS app |  |
| ✅ | other | edge | old /kkc/ address redirects to the KIRO LUX shop |  |
| ✅ | other | edge | website forms and filters: contact validation, blog filter, FAQ, login tabs |  |
| ✅ | other | chrome | main navigation reaches every website page, back and forward work |  |
| ✅ | other | chrome | Log in and Start free trial open the POS app |  |
| ✅ | other | chrome | old /kkc/ address redirects to the KIRO LUX shop |  |
| ✅ | other | chrome | website forms and filters: contact validation, blog filter, FAQ, login tabs |  |
| ✅ | other | webkit | Home (/) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Home (/) › internal links all resolve |  |
| ✅ | other | edge | Home (/) › loads with content, a title and no errors |  |
| ✅ | other | edge | Home (/) › internal links all resolve |  |
| ✅ | other | chrome | Home (/) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Home (/) › internal links all resolve |  |
| ✅ | other | webkit | Features (/features.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Features (/features.html) › internal links all resolve |  |
| ✅ | other | edge | Features (/features.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Features (/features.html) › internal links all resolve |  |
| ✅ | other | chrome | Features (/features.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Features (/features.html) › internal links all resolve |  |
| ✅ | other | webkit | Pricing (/pricing.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Pricing (/pricing.html) › internal links all resolve |  |
| ✅ | other | edge | Pricing (/pricing.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Pricing (/pricing.html) › internal links all resolve |  |
| ✅ | other | chrome | Pricing (/pricing.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Pricing (/pricing.html) › internal links all resolve |  |
| ✅ | other | webkit | Marketplace (/marketplace.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Marketplace (/marketplace.html) › internal links all resolve |  |
| ✅ | other | edge | Marketplace (/marketplace.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Marketplace (/marketplace.html) › internal links all resolve |  |
| ✅ | other | chrome | Marketplace (/marketplace.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Marketplace (/marketplace.html) › internal links all resolve |  |
| ✅ | other | webkit | Blog (/blog.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Blog (/blog.html) › internal links all resolve |  |
| ✅ | other | edge | Blog (/blog.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Blog (/blog.html) › internal links all resolve |  |
| ✅ | other | chrome | Blog (/blog.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Blog (/blog.html) › internal links all resolve |  |
| ✅ | other | webkit | Downloads (/downloads.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Downloads (/downloads.html) › internal links all resolve |  |
| ✅ | other | edge | Downloads (/downloads.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Downloads (/downloads.html) › internal links all resolve |  |
| ✅ | other | chrome | Downloads (/downloads.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Downloads (/downloads.html) › internal links all resolve |  |
| ✅ | other | webkit | Contact (/contact.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Contact (/contact.html) › internal links all resolve |  |
| ✅ | other | edge | Contact (/contact.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Contact (/contact.html) › internal links all resolve |  |
| ✅ | other | chrome | Contact (/contact.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Contact (/contact.html) › internal links all resolve |  |
| ✅ | other | webkit | Log in (old page) (/login.html) › loads with content, a title and no errors |  |
| ✅ | other | webkit | Log in (old page) (/login.html) › internal links all resolve |  |
| ✅ | other | edge | Log in (old page) (/login.html) › loads with content, a title and no errors |  |
| ✅ | other | edge | Log in (old page) (/login.html) › internal links all resolve |  |
| ✅ | other | chrome | Log in (old page) (/login.html) › loads with content, a title and no errors |  |
| ✅ | other | chrome | Log in (old page) (/login.html) › internal links all resolve |  |
| ✅ | other | webkit | POS app (/app/) › loads with content, a title and no errors |  |
| ✅ | other | webkit | POS app (/app/) › internal links all resolve |  |
| ✅ | other | edge | POS app (/app/) › loads with content, a title and no errors |  |
| ✅ | other | edge | POS app (/app/) › internal links all resolve |  |
| ✅ | other | chrome | POS app (/app/) › loads with content, a title and no errors |  |
| ✅ | other | chrome | POS app (/app/) › internal links all resolve |  |
| ✅ | other | webkit | KIRO LUX shop (/lux/) › loads with content, a title and no errors |  |
| ✅ | other | webkit | KIRO LUX shop (/lux/) › internal links all resolve |  |
| ✅ | other | edge | KIRO LUX shop (/lux/) › loads with content, a title and no errors |  |
| ✅ | other | edge | KIRO LUX shop (/lux/) › internal links all resolve |  |
| ✅ | other | chrome | KIRO LUX shop (/lux/) › loads with content, a title and no errors |  |
| ✅ | other | chrome | KIRO LUX shop (/lux/) › internal links all resolve |  |

Screenshots, videos and traces of failures: `qa/artifacts/test-results/` (open a trace with `npx playwright show-trace <trace.zip>`). Full interactive report: `qa/reports/playwright/index.html`.