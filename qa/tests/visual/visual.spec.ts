import { test, expect } from '@playwright/test';
import { PAGES, open } from '../helpers';

// Screenshot regression: each screen at phone, tablet and laptop size is compared with an approved
// baseline in tests/visual/baselines. After an intended design change, approve new baselines with
// `npm run qa:visual:update` and commit them. Motion is reduced so screenshots are stable;
// moving parts that change on their own (photo swap, rotating words, carousels) are masked.
const SIZES = [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1366, h: 768 }];

for (const s of SIZES) {
  test.describe(`${s.w}x${s.h}`, () => {
    test.use({ viewport: { width: s.w, height: s.h } });
    for (const p of PAGES) {
      test(p.name, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, p.path);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(700);
        await expect(page).toHaveScreenshot(`${p.name.replace(/[^\w]+/g, '-')}-${s.w}.png`, {
          fullPage: false,
          mask: [page.locator('#kiro-hero-cards img'), page.locator('#slides'), page.locator('.word, .grad, [aria-live]'), page.locator('.kiro-marquee')],
        });
      });
    }
  });
}
