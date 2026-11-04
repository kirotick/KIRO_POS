# KIRO testing guide

All commands run from the `qa` folder:

```bash
cd qa
npm install
npx playwright install chromium firefox webkit
```

## Commands

| Command | What it runs | Time |
|---|---|---|
| `npm run qa` | Everything safe, in order: unit suites → security scan → all Chromium browser suites → Firefox, WebKit (Safari engine), Edge → reports | ~10 min |
| `npm run qa:unit` | The Node test suites of server, admin app, AI relay, ERP validator, saree desktop | <1 min |
| `npm run qa:e2e` | Screens, links, navigation, forms, POS billing, KIRO LUX shop | ~1 min |
| `npm run qa:pos` | Only the POS app workflows | <1 min |
| `npm run qa:shop` | Only the KIRO LUX shop | <1 min |
| `npm run qa:motion` | Motion: normal motion and reduced motion | ~1 min |
| `npm run qa:responsive` | Every page at 15 screen sizes, 320 px phone to 1920 px monitor | ~2 min |
| `npm run qa:mobile` | Only phone and tablet sizes (portrait and landscape) | ~1 min |
| `npm run qa:a11y` | axe WCAG 2.1 A/AA scan of every page + keyboard focus | <1 min |
| `npm run qa:visual` | Screenshot comparison with approved baselines | <1 min |
| `npm run qa:visual:update` | Approve new screenshots after an intended design change (then commit them) | <1 min |
| `npm run qa:perf` | Page-load metrics of every page + 60 bills in a row in the POS app | ~1 min |
| `npm run qa:security` | Secrets in git, vulnerable packages, unpinned CDN scripts, live security headers | <1 min |
| `npm run qa:browsers` | Screens and POS tests in Firefox, WebKit and Edge | ~3 min |
| `npm run qa:live` | Read-only screen checks and security headers against https://kiro-pos.netlify.app | ~1 min |
| `npm run qa:report` | Rebuild the reports from the last run | seconds |

Browser tests start their own local copy of `web/site` (port 5190), so they test exactly the files Netlify will publish and never touch real shop data.

## Reading the reports

- `qa/reports/index.html`: open in a browser. Cards at the top (passed/failed/skipped, security), then **Bugs and findings** by severity, performance, the **Not tested** list, and every test with links to screenshots, videos and traces. Type in the filter box (e.g. `failed`, `motion`, `320x568`).
- `qa/reports/summary.md`: the same as text, for pull requests and chat.
- `qa/motion/MOTION_TEST_REPORT.md`: card sizes, sync, frame rate, layout shift, endless animations per page.
- `qa/reports/playwright/index.html`: Playwright's own report. For a failure, open the trace: `npx playwright show-trace qa/artifacts/test-results/<test>/trace.zip` shows every step with before/after screenshots.

Severity: **P0** critical (data loss, secrets, money wrong) · **P1** high (a main workflow broken) · **P2** medium · **P3** low. Skipped or not-run tests are never counted as passed.

## Adding a new screen

1. Add it to `PAGES` in `qa/tests/helpers.ts`. It is then automatically loaded, link-checked, checked at 15 sizes, scanned for accessibility, measured and screenshotted.
2. Run `npm run qa:visual:update` once and commit the new baseline images.
3. If the screen has actions (forms, buttons that change data), add a workflow test in `tests/e2e/`.
4. Add it to `SCREEN_INVENTORY.md`.

## Rules the tests follow

- No real customer data, no real payments, WhatsApp messages or emails (WhatsApp links are intercepted).
- Live-site checks are read-only GET requests. No load testing against Netlify.
- Financial, tax, authentication and payment logic is never changed by a test fix without the owner's approval.

## Continuous integration

`.github/workflows/qa.yml` runs unit + security + the Chromium suite on every push and pull request, and the full cross-browser run weekly or on demand (Actions tab → QA → Run workflow). To block merges when it fails: GitHub → Settings → Branches → add a rule for `main` → require the "QA / required" check. Screenshot baselines are per operating system; until Linux baselines are committed (run `npm run qa:visual:update` in a Linux/CI environment), CI skips the visual suite.
