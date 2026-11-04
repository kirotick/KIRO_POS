import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PAGES, open, setupPos } from '../helpers';

// Automated WCAG 2.1 A/AA checks with axe. Every finding is saved to artifacts/a11y.json for the report.
// Gate: no "critical" findings. "serious" and lower are reported with counts so they can be worked down;
// automated checks cannot prove a page is accessible, a manual screen-reader pass is still needed.
const OUT_DIR = path.join(__dirname, '../../artifacts/a11y');
function save(name: string, violations: any[]) {
  const list = violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, example: v.nodes[0]?.target?.join(' '),
    detail: v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} :: ${(n.failureSummary || '').split('\n').slice(1, 2).join('').trim()}`) }));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name.replace(/[^\w]+/g, '_') + '.json'), JSON.stringify({ page: name, violations: list }, null, 1));
}
const axe = (page: any) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);


for (const p of PAGES) {
  test(`axe: ${p.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // stable page for scanning
    await open(page, p.path);
    await page.waitForTimeout(800);
    const r = await axe(page).analyze();
    save(p.name, r.violations.map((v: any) => ({ ...v, detail: v.nodes.slice(0, 3).map((n: any) => n.target.join(' ') + ' :: ' + n.failureSummary?.split('\n')[1]) })));
    expect(r.violations.filter((v) => v.impact === 'critical').map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

test('axe: POS app home after setup', async ({ page }) => {
  await setupPos(page);
  const r = await axe(page).analyze();
  save('POS app (after setup)', r.violations);
  expect(r.violations.filter((v) => v.impact === 'critical').map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});

test('keyboard: Tab moves through the Home page with a visible focus ring', async ({ page }) => {
  await open(page, '/');
  const seen: string[] = [];
  const invisible: string[] = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
      return { label: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), ring };
    });
    if (!f) continue;
    seen.push(f.label);
    if (!f.ring) invisible.push(f.label);
  }
  expect(seen.length, 'Tab reaches links and buttons').toBeGreaterThan(8);
  expect(invisible, 'focused elements without a visible focus ring').toEqual([]);
});
