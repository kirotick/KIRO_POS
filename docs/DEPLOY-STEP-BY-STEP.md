# Deploy the server, database and admin app, step by step

Do the parts in this order. Everything marked **you** needs your own account or value; none is included.

## 0. Make sure GitHub looks right
At the top of your repository you should see `server`, `admin-app`, `web`, `docs` and `render.yaml`. If you see folders named `1-docs-and-web` or `2-api-server`, fix the layout first (see `UPLOAD-TO-GITHUB.md`).

## 1. API server and database on Render
1. **You:** create a Render account and connect your GitHub account.
2. Click **New**, then **Blueprint**, pick this repository. Render reads `render.yaml` and proposes a database `kiro-db` and a service `kiro-api`.
3. It asks for the values marked `sync: false`. Fill:
   - `PHONEPE_KEK`: run `openssl rand -base64 32` on your computer and paste the result. Keep a private copy; if you lose it, saved PhonePe keys cannot be decrypted.
   - `PUBLIC_BASE_URL`: the address Render will give the service, like `https://kiro-api.onrender.com`. If you don't know it yet, put a guess, deploy, then correct it in **Environment** and redeploy.
   - `PHONEPE_BASE_URL`: from PhonePe's documentation. If you are not using PhonePe yet, put any https address as a placeholder; the server needs the setting present.
   - `CORS_ORIGINS`: leave empty until you have the admin website address.
   - Leave `AI_*` and `WA_*` empty for now.
4. Click **Apply**. On every start the server runs the database setup (`npm run migrate`) and then starts.
5. Open `https://<your-service>.onrender.com/health`. It should show `{"ok":true}`.
6. Create the first owner login: send `POST /api/auth/signup` with `{"businessName":"Your Shop","ownerName":"Your Name","login":"9876543210","password":"a long password with letters and digits","bizType":"pharmacy"}`. (Any tool that can send a POST, such as a REST client, works.)

Other hosts (Railway, Fly.io, a rented server) work too: build command `npm install`, start command `npm run migrate && npm start`, folder `server/node`, and the same environment values.

## 2. Admin app as a website on Netlify
1. In Netlify click **Add new site**, **Import from Git**, pick this repository.
2. **Base directory:** `admin-app`. Netlify reads `admin-app/netlify.toml` for the rest.
3. Under **Environment variables** add `EXPO_PUBLIC_API_URL` = your API address from step 1.
4. Deploy. Then go back to Render, set `CORS_ORIGINS` to the new Netlify address (exactly, with https, no slash) and redeploy.
5. Log in with the owner login from step 1.6.

This site is separate from the KIRO website site. The website site uses the repository's top-level `netlify.toml` (publish folder `web/site`).

## 3. AI relay on Cloudflare (optional)
Follow `ai-relay/README.md`. Then put the address it prints into `AI_RELAY_URL` in `web/site/script.js` and commit.

## 4. Nightly 10 PM WhatsApp report (optional)
1. **You:** set up WhatsApp Business Cloud API in Meta Business and get a template approved (Utility, one variable, for example `Your KIRO daily report: {{1}}`).
2. In Render **Environment** set `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TEMPLATE`, redeploy.
3. Switch it on for the owner: `PUT /api/business/report` with `{"ownerWa":"9876543210","on":true}` and the owner's login token.
4. Use a paid always-on plan, or the report will be missed whenever the server is asleep at 10 PM.

## 5. Phone apps (optional, later)
See `admin-app/README.md`, section "Publishing to Google Play and the App Store". It needs paid developer accounts, and Google and Apple must approve the app before you can put links on the website.

## What I could and could not test
- Tested: the migration script (runs all three files twice on a real PostgreSQL 16, same result, fails cleanly without a database), the server tests, the website.
- Not tested: Render itself, the Netlify admin build, PhonePe, WhatsApp, the AI provider, store builds. Those need your accounts, so expect to fix small things the first time, and tell me the exact message you see.
