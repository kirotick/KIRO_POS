# What has and has not been tested

Tested:
- Server logic against a real PostgreSQL 16 (58 tests: logins, roles, sales and invoices, reports, Ask KIRO, KIRO AI endpoints, nightly report claim-once logic).
- Nightly report sender with a fake WhatsApp and fake AI (10 PM rule, once a day, retry on failure, template text, invented-number guard).
- Web app in headless Chromium (billing, pharmacy, insights, Ask KIRO, bill photos, relay wiring with a fake relay).
- Admin app screens in Chromium against the real API handlers.
- AI relay (9 tests) and ERP validator (20 tests) with fakes.

Not tested, because it needs your accounts:
- A real WhatsApp message, a real PhonePe QR payment, a real AI provider, a real Cloudflare deploy, real Play Store or App Store builds.
- Sharing from the browser to WhatsApp on a real phone.

Known limits:
- Bill photos are saved in the browser only. They are not uploaded, not in backups, and lost if browser data is cleared. Reading a bill photo into stock lines with AI is not built.
- The web app's data is still per-device; billing in the web app is not yet connected to the server.
- The relay's origin check stops other websites, not a script that fakes the header. Add a Cloudflare rate-limit rule for stronger protection.
- Free AI tiers differ in data use. Check the provider's terms before sending business data.
- `desktop-saree/` is an unfinished prototype with no tests.
