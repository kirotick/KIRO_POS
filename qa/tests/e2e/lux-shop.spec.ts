import { test, expect } from '@playwright/test';
import { open, watchPage } from '../helpers';

// KIRO LUX shop (web/site/lux). Orders go out through WhatsApp; window.open is stubbed so no
// message is ever sent during tests.
// The shop is built phone-first (its bottom tab bar only exists on small screens), so test it at phone size.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__opened = []; window.open = ((u: string) => { (window as any).__opened.push(u); return null; }) as any; });
});

test('categories filter the catalogue', async ({ page }) => {
  const w = watchPage(page);
  await open(page, '/lux/');
  await page.locator('[data-cat-open="tableware"]').first().click();
  await expect(page.locator('#v-shop')).toBeVisible();
  const n = await page.locator('#grid .p').count();
  expect(n).toBeGreaterThan(0);
  await page.locator('[data-cat-open="all"]').first().click();
  expect(await page.locator('#grid .p').count()).toBeGreaterThan(n);
  w.expectClean();
});

test('search narrows products', async ({ page }) => {
  await open(page, '/lux/');
  await page.fill('#q', 'whisk');
  await page.keyboard.press('Enter');
  await expect(page.locator('#grid .p')).toHaveCount(1);
});

test('wishlist and bag: add, count badges, quantity, remove, checkout validation', async ({ page }) => {
  await open(page, '/lux/');
  await page.locator('[data-cat-open="cutlery"]').first().click();
  await page.locator('#grid .p .heart').first().click();
  await expect(page.locator('#tabWish')).toHaveText('1');
  await page.locator('#grid .p').first().click();
  await expect(page.locator('#v-pdp')).toBeVisible();
  await page.locator('#v-pdp [data-add]').click();
  await expect(page.locator('#tabBag')).toHaveText('1');
  await page.locator('.tab[data-go="bag"]').click();
  await page.locator('#v-bag [data-qty="1"]').click(); // +
  await expect(page.locator('.qty span').first()).toHaveText('2');
  await page.locator('#v-bag [data-qty="-1"]').click(); // −
  await expect(page.locator('.qty span').first()).toHaveText('1');
  await page.locator('#v-bag [data-go="checkout"]').click();
  await page.locator('#placeBtn').click();
  await expect(page.locator('#cerr')).not.toBeEmpty(); // empty form is rejected
  await page.fill('#cname', 'QA Tester');
  await page.fill('#cphone', '9876543210');
  await page.fill('#caddr', 'Test street 1, Test town');
  await page.fill('#cpin', '507001');
  await page.locator('#placeBtn').click();
  const opened = await page.evaluate(() => (window as any).__opened as string[]);
  expect(opened.length, 'order opens WhatsApp once').toBe(1);
  expect(decodeURIComponent(opened[0])).toContain('KIRO LUX order');
});
