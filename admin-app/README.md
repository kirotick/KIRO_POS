# KIRO Admin app (React Native + Expo)

Phone app for the owner, manager and accountant: today's sales, **invoice numbers and invoice lookup**, **who is using KIRO** (staff, last active, bills today), GST, payment modes, stock insights (dead stock, fast movers, expiry, low stock) and **Ask KIRO**. It talks only to the KIRO API in `../kiro-server/node` (endpoints below). POS cashiers get a minimal Home screen (their own sales only); their billing screen is the web app.

```
src/App.js          login gate, role-based tabs, token handling
src/api.js          API client (timeouts, 401 -> sign out, safe error messages)
src/session.js      token in the phone's secure storage (expo-secure-store)
src/format.js       paise -> ₹ with Indian grouping
src/screens/        Login, Home, Sales, Invoice, Stock, Staff, Ask
e2e/                test harness: real screens in Chromium -> real API handlers -> real PostgreSQL
test/               unit tests for api.js and format.js
```

## Run it
1. Deploy the API (`../server/node/README.md`), or run it locally. Run migrations `001_phonepe.sql`, `002_core.sql` and `003_nightly.sql`.
2. `cp .env.example .env` and set **`EXPO_PUBLIC_API_URL`** to the API address (https in production; for a phone on Wi-Fi use your computer's LAN address). This is the only setting; it is public by design and holds no secret.
3. `npm install` then `npx expo install --fix` (aligns Expo package versions to your Expo SDK), then `npx expo start` and scan the QR code with Expo Go.
4. Before publishing: set `android.package` and `ios.bundleIdentifier` in `app.json` to your own IDs, then build with EAS (`npx eas build`).

## Run it as a website
The same code runs in a browser (Expo web, via `react-native-web`).
1. `npm install` (the web packages are already in `package.json`; run `npx expo install --fix` once).
2. Try it locally: `npx expo start --web`. Your API must allow that address: set `CORS_ORIGINS=http://localhost:8081` in the server `.env`.
3. Publish it: `npm run build:web` creates a static `dist/` folder. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages), with every path falling back to `index.html`. Build with `EXPO_PUBLIC_API_URL` set to your **https** API.
4. Add the website's exact address to `CORS_ORIGINS` on the API (e.g. `https://admin.yourshop.com`). Without it the browser blocks the calls.

On the web the login token is kept in the browser's `localStorage` (no secure store exists in browsers), so sign out on shared computers. Serve the site over https only.

## Publishing to Google Play and the App Store
You do this part (it needs your own developer accounts and their review):
1. Accounts: Google Play Console (one-time fee) and Apple Developer Program (yearly fee).
2. In `app.json` set your own `android.package` and `ios.bundleIdentifier`, plus the app name, icon and splash image.
3. Build: `npx eas build --platform all`. Submit: `npx eas submit` (needs your store credentials; never commit them).
4. Both stores require a privacy policy address and a description of the data the app handles (sales and staff data from your own server, login token on the device).
5. Once approved, copy the public store addresses into **`APP_LINKS` in `kiro.html`** (website) and **`STORE_LINKS` in `demo/page.template.html`**. Until then both show "Coming soon" badges. Only addresses on `play.google.com` or `apps.apple.com` are accepted.

`demo/` holds the sample-data showcase page (the real screens with a fake in-browser API). It is for showing the app, not for production.

## API endpoints the app uses
`POST /api/auth/login` · `GET /api/me` · `GET /api/reports/summary?period=today|yesterday|week|month|year|all[&mine=1]` · `GET /api/sales?period=&q=&limit=` · `GET /api/sales/:id` · `GET /api/sales/lookup?no=` · `GET /api/staff` (owner) · `GET /api/reports/insights` · `POST /api/ask {question}`

## Who sees what (enforced by the server; the app just hides tabs)
| Role | Tabs |
|---|---|
| Owner | Home, Sales, Stock, Ask KIRO, Staff, More |
| Manager, Accounts | Home, Sales, Stock, Ask KIRO, More (no staff logins) |
| POS cashier | Home (own sales only), More |

## Tests
- `npm test`: 5 unit tests (money formatting, request building, 401/timeout/network handling).
- `TEST_PG_HOST=... TEST_PG_PORT=... TEST_PG_DB=... node e2e/run.js`: the real screens run in headless Chromium against a real PostgreSQL through the real API handlers: login errors, home numbers, sales search, invoice detail, stock, staff, Ask KIRO, all four roles, expired token, switched-off login, session restore after reload. 34 checks.

## Honest limits
- **Not run on a phone or emulator** (no Expo or Android tooling in my sandbox, and the npm registry was blocked). The e2e uses a stand-in for `react-native` that draws the same component tree as web elements, so it proves the data flow, permissions and behaviour but not native look, keyboard, or Expo-specific behaviour. Do one pass in Expo Go on a real phone before release.
- Package versions in `package.json` are a starting point; run `npx expo install --fix`.
- Sign-in uses the server's JWT (12 hours). There is no refresh token, "forgot password" or push notification yet.
- Ask KIRO is a keyword assistant over your data, not a language model.
- Read-only app: it does not create bills, edit stock or manage staff.
