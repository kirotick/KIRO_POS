import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, open } from '../helpers';

// Page-load performance of every screen, measured in the browser. Results go to artifacts/perf.json.
// Budgets are for the local test server (no network latency); the live site adds Netlify/CDN time.
const OUT = path.join(__dirname, '../../artifacts/perf');
const BUDGET = { pageWeightKB: 1500, lcpMs: 2500, domContentLoadedMs: 2000 };

for (const p of PAGES) {
  test(`load performance: ${p.name}`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await open(page, p.path);
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const bytes = nav.transferSize + res.reduce((s, r) => s + (r.transferSize || 0), 0);
      const heap = (performance as any).memory?.usedJSHeapSize;
      return { ttfbMs: Math.round(nav.responseStart), domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), loadMs: Math.round(nav.loadEventEnd),
        lcpMs: Math.round((window as any).__lcp), requests: res.length + 1, pageWeightKB: Math.round(bytes / 1024), htmlKB: Math.round(nav.encodedBodySize / 1024),
        jsHeapMB: heap ? Math.round(heap / 1048576 * 10) / 10 : null, domNodes: document.getElementsByTagName('*').length };
    });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, p.name.replace(/[^\w]+/g, '_') + '.json'), JSON.stringify({ page: p.name, ...m }, null, 1));
    expect.soft(m.pageWeightKB, 'page weight KB').toBeLessThan(BUDGET.pageWeightKB);
    expect.soft(m.lcpMs, 'Largest Contentful Paint ms').toBeLessThan(BUDGET.lcpMs);
    expect.soft(m.domContentLoadedMs, 'DOMContentLoaded ms').toBeLessThan(BUDGET.domContentLoadedMs);
  });
}

test('POS app stays fast with 60 bills in a day', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/app/');
  await page.getByLabel('Business name').fill('QA Load Cafe');
  await page.getByLabel(/sample menu/i).check();
  await page.getByRole('button', { name: 'Start billing' }).click();
  const times: number[] = [];
  for (let i = 0; i < 60; i++) {
    const t0 = Date.now();
    await page.locator('[data-act="newBill"]:visible').first().click();
    const ids = ['i-idli', 'i-vada', 'i-pongal', 'i-poori', 'i-upma'];
    await page.locator(`[data-act="addItem"][data-arg="${ids[i % ids.length]}"]:visible`).first().click();
    await page.locator('[data-act="toCollect"]').click();
    await page.locator('[data-act="payMethod"][data-arg="cash"]').click();
    await page.locator('[data-act="cashQuick"]').first().click();
    await page.locator('[data-act="payCash"]').click();
    await page.locator('[data-act="nav"][data-arg="home"]:visible').first().click();
    times.push(Date.now() - t0);
  }
  await expect(page.getByText(/^60 bills$/).first()).toBeVisible();
  const sorted = [...times].sort((a, b) => a - b);
  const r = { bills: 60, avgMs: Math.round(times.reduce((a, b) => a + b) / times.length), medianMs: sorted[30], p95Ms: sorted[56], maxMs: sorted[59],
    note: 'full bill cycle through the UI incl. Playwright overhead: new bill, add item, collect, cash, home' };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'pos_60_bills.json'), JSON.stringify(r, null, 1));
  expect(r.p95Ms, 'p95 time for a whole bill').toBeLessThan(3000);
});
