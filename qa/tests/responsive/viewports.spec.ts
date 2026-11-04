import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, VIEWPORTS, open, setupPos } from '../helpers';

// Every screen at every size. Phone and tablet sizes carry the @mobile tag (npm run qa:mobile).
const SMALL_TARGETS = path.join(__dirname, '../../artifacts/touch-targets.json');

async function layoutProblems(page: Page, w: number) {
  return page.evaluate((vw) => {
    const out: string[] = [];
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) {
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; })
        .slice(0, 3).map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}`);
      out.push(`page scrolls sideways: ${sw}px wide in a ${vw}px screen (${wide.join(', ')})`);
    }
    // Images squashed or stretched (object-fit: fill with a very different shape than the photo).
    for (const img of document.images) {
      const r = img.getBoundingClientRect();
      if (!r.width || !img.naturalWidth || getComputedStyle(img).objectFit !== 'fill') continue;
      const d = Math.abs((r.width / r.height) / (img.naturalWidth / img.naturalHeight) - 1);
      if (d > 0.08) out.push(`image distorted ${Math.round(d * 100)}%: ${img.alt || img.src.slice(-30)}`);
    }
    // Visible buttons/links on top of each other.
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05; };
    const ctl = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(vis)
      .filter((e) => !e.closest('[aria-hidden="true"], .sheet-bg:not(.open)'));
    const boxes = ctl.map((e) => [e, e.getBoundingClientRect()] as const);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, ra] = boxes[i], [b, rb] = boxes[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 6 && oy > 6) {
        const fixed = (e: Element) => { for (let n: Element | null = e; n; n = n.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(n).position)) return true; return false; };
        if (fixed(a) !== fixed(b)) continue; // a sticky bar over scrolled content is expected
        out.push(`controls overlap: "${(a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 25)}" and "${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 25)}"`);
      }
    }
    return out;
  }, w);
}

async function smallTargets(page: Page) {
  return page.$$eval('a[href], button, input:not([type=hidden]), select', (els) => els.filter((e) => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.width < 24 || r.height < 24) && !e.closest('p, li, td, small, footer');
  }).length);
}

for (const v of VIEWPORTS) {
  const tag = ['mobile', 'mobile-landscape', 'tablet', 'tablet-landscape'].includes(v.kind) ? ' @mobile' : '';
  test.describe(`${v.w}x${v.h} ${v.kind}${tag}`, () => {
    test.use({ viewport: { width: v.w, height: v.h }, hasTouch: v.kind.startsWith('mobile') || v.kind.startsWith('tablet') });
    for (const p of PAGES) {
      test(`${p.name}`, async ({ page }) => {
        await open(page, p.path);
        await page.waitForTimeout(600);
        const problems = await layoutProblems(page, v.w);
        const st = await smallTargets(page);
        let all: Record<string, number> = {};
        try { all = JSON.parse(fs.readFileSync(SMALL_TARGETS, 'utf8')); } catch {}
        all[`${p.name} @ ${v.w}x${v.h}`] = st;
        fs.mkdirSync(path.dirname(SMALL_TARGETS), { recursive: true });
        try { fs.writeFileSync(SMALL_TARGETS, JSON.stringify(all, null, 1)); } catch {}
        expect(problems).toEqual([]);
      });
    }
    test('POS app after setup (billing screen)', async ({ page }) => {
      await setupPos(page);
      expect(await layoutProblems(page, v.w)).toEqual([]);
      await page.locator('[data-act="newBill"]:visible').first().click();
      await page.locator('[data-act="addItem"]').first().click();
      expect(await layoutProblems(page, v.w), 'billing layout with an item').toEqual([]);
    });
    test('Home hero cards: same size, inside the screen', async ({ page }) => {
      await open(page, '/');
      const cards = await page.$$eval('#kiro-hero-cards .kh-card', (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: r.left, r: r.right }; }));
      expect(new Set(cards.map((c) => `${c.w}x${c.h}`)).size).toBe(1);
      for (const c of cards) { expect(c.l).toBeGreaterThanOrEqual(0); expect(c.r).toBeLessThanOrEqual(v.w); }
    });
  });
}
