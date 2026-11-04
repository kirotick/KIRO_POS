import { test, expect } from '@playwright/test';
import { PAGES, open, watchPage } from '../helpers';

// Every published screen: loads, is not blank, has no console errors or failed requests,
// and every link on it that stays on this site points to something that exists.
for (const p of PAGES) {
  test.describe(`${p.name} (${p.path})`, () => {
    test('loads with content, a title and no errors', async ({ page }) => {
      const w = watchPage(page);
      await open(page, p.path);
      await expect(page).toHaveTitle(p.title);
      const text = (await page.locator('body').innerText()).trim();
      expect(text.length, 'page is not blank').toBeGreaterThan(80);
      expect(text, 'no unfilled {{placeholders}}').not.toMatch(/\{\{.*?\}\}/);
      await page.waitForTimeout(1500); // let timers, carousels and splash screens run
      w.expectClean();
    });

    test('internal links all resolve', async ({ page, request, baseURL }) => {
      await open(page, p.path);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
      const own = [...new Set(hrefs.filter((h) => h.startsWith(String(baseURL))).map((h) => h.split('#')[0]))];
      const broken: string[] = [];
      for (const h of own) {
        const r = await request.get(h, { maxRedirects: 3 });
        if (r.status() >= 400) broken.push(`${r.status()} ${h}`);
      }
      expect(broken).toEqual([]);
      // External links: no claude.ai links (private artifacts visitors cannot open) and no javascript: links.
      expect(hrefs.filter((h) => /claude\.ai\/artifact/.test(h))).toEqual([]);
      expect(hrefs.filter((h) => /^javascript:/i.test(h))).toEqual([]);
    });
  });
}

test('main navigation reaches every website page, back and forward work', async ({ page }) => {
  await open(page, '/');
  const link = (label: string) => page.locator('header a:visible').filter({ hasText: new RegExp('^' + label + '$') }).first();
  for (const [label, re] of [['Features', /features/], ['Pricing', /pricing/], ['Blog', /blog/], ['Downloads', /downloads/], ['Contact', /contact/]] as const) {
    await open(page, '/');
    await link(label).click();
    await expect(page).toHaveURL(re);
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/contact/);
  // KIRO LUX opens in a new tab (target=_blank in the design).
  await open(page, '/');
  const [tab] = await Promise.all([page.context().waitForEvent('page'), link('KIRO LUX').click()]);
  await expect(tab).toHaveURL(/\/lux\/$/);
});

test('Log in and Start free trial open the POS app', async ({ page }) => {
  await open(page, '/');
  await page.locator('header').getByRole('link', { name: 'Start free trial' }).first().click();
  await expect(page).toHaveURL(/\/app\/$/);
  await open(page, '/pricing.html');
  await page.getByRole('link', { name: 'Log in', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/$/);
});

test('old /kkc/ address redirects to the KIRO LUX shop', async ({ page }) => {
  await page.goto('/kkc/');
  await expect(page).toHaveURL(/\/lux\/$/);
  await expect(page).toHaveTitle(/KIRO LUX/);
});

test('website forms and filters: contact validation, blog filter, FAQ, login tabs', async ({ page }) => {
  // Contact: empty submit shows every error; valid data shows the thank-you panel.
  await open(page, '/contact.html');
  await page.locator('form').getByRole('button').last().click();
  for (const msg of ['Please type your name', '10 digit mobile', 'shop’s name', 'type of business', 'Choose your state'])
    await expect(page.getByText(msg, { exact: false }).last()).toBeVisible();
  await page.fill('#f-name', 'QA Tester');
  await page.fill('#f-phone', '12345');
  await page.fill('#f-shop', 'QA Shop');
  await page.selectOption('#f-type', { index: 1 });
  await page.selectOption('#f-state', { index: 1 });
  await page.locator('form').getByRole('button').last().click();
  await expect(page.getByText('10 digit mobile')).toBeVisible(); // invalid phone still rejected
  await page.fill('#f-phone', '9876543210');
  await page.locator('form').getByRole('button').last().click();
  await expect(page.getByText(/Thank/)).toBeVisible();
  await expect(page.getByText('QA Shop')).toBeVisible();

  // Blog: category filter changes the list and marks the pressed button.
  await open(page, '/blog.html');
  const all = await page.locator('article').count();
  const cat = page.getByRole('button', { name: 'GST and bills' });
  await cat.click();
  await expect(cat).toHaveAttribute('aria-pressed', 'true');
  const filtered = await page.locator('article').count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(all);

  // Home FAQ: one open at a time, toggles open/closed.
  await open(page, '/');
  const faq = page.locator('button[aria-expanded]');
  await faq.nth(2).click();
  await expect(faq.nth(2)).toHaveAttribute('aria-expanded', 'true');
  await faq.nth(2).click();
  await expect(faq.nth(2)).toHaveAttribute('aria-expanded', 'false');

  // Old login page: mobile/email tabs swap the input.
  await open(page, '/login.html');
  await page.getByRole('tab', { name: /Email/ }).click().catch(async () => page.getByText('Email address', { exact: true }).click());
  await expect(page.locator('input[type=email]')).toBeVisible();
});
