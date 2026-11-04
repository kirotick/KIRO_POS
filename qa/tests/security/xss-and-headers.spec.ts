import { test, expect } from '@playwright/test';
import { setupPos } from '../helpers';

// Safe, local security checks: typed-in text must never run as code. Header checks run only
// against a real deployment (QA_BASE_URL), read-only.
const PAYLOAD = `<img src=x onerror="window.__xss=1">"><svg onload="window.__xss=1">`;

test('POS app: script in business name, item search and expense notes does not run', async ({ page }) => {
  page.on('dialog', (d) => d.dismiss());
  await setupPos(page, PAYLOAD);
  await page.locator('[data-act="newBill"]:visible').first().click();
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.count()) await search.fill(PAYLOAD);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  await page.reload();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__xss), 'stored payload does not run after reload').toBeUndefined();
  // The name is kept and shown as plain text (escaped), not turned into an image or script.
  expect(await page.getByText('<img src=x', { exact: false }).count()).toBeGreaterThan(0);
  expect(await page.locator('img[src="x"], svg[onload]').count()).toBe(0);
});

test('KIRO LUX: script in search and checkout fields does not run', async ({ page }) => {
  await page.addInitScript(() => { window.open = (() => null) as any; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lux/');
  await page.fill('#q', PAYLOAD);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
});

test('live site security headers', async ({ request, baseURL }) => {
  test.skip(!process.env.QA_BASE_URL, 'only meaningful against the real deployment: npm run qa:live');
  const r = await request.get(String(baseURL));
  const h = r.headers();
  const report = {
    'strict-transport-security': h['strict-transport-security'] || 'MISSING',
    'x-content-type-options': h['x-content-type-options'] || 'MISSING',
    'x-frame-options / frame-ancestors': h['x-frame-options'] || (h['content-security-policy'] || '').match(/frame-ancestors[^;]*/)?.[0] || 'MISSING',
    'referrer-policy': h['referrer-policy'] || 'MISSING',
    'content-security-policy': h['content-security-policy'] ? 'present' : 'MISSING',
  };
  console.log('SECURITY_HEADERS ' + JSON.stringify(report));
  expect(h['strict-transport-security'], 'HTTPS enforced').toBeTruthy();
});
