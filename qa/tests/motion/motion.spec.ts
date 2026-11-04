import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { open, PAGES } from '../helpers';

// Motion tests run the real animations (normal motion) and, separately, with the visitor's
// "reduce motion" setting on. Measurements are saved to artifacts/motion-metrics.json for the report.
const METRICS = path.join(__dirname, '../../artifacts/motion-metrics.json');
function record(name: string, data: Record<string, unknown>) {
  let all: Record<string, unknown> = {};
  try { all = JSON.parse(fs.readFileSync(METRICS, 'utf8')); } catch {}
  all[name] = { ...data, at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(METRICS), { recursive: true });
  fs.writeFileSync(METRICS, JSON.stringify(all, null, 2));
}

const cardState = (page: Page) => page.$$eval('#kiro-hero-cards .kh-card', (cards) => cards.map((c) => {
  const r = c.getBoundingClientRect();
  const a = c.getAnimations()[0] as CSSAnimation | undefined;
  return { w: Math.round(r.width), h: Math.round(r.height), top: r.top, transform: getComputedStyle(c).transform,
    anim: a ? { name: a.animationName, state: a.playState, time: Number(a.currentTime), dur: (a.effect!.getTiming().duration as number), iter: a.effect!.getTiming().iterations } : null };
}));

test.describe('normal motion', () => {
  // reducedMotion is not a test option in this Playwright version, so emulate the media feature per page.
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'no-preference' }); });

  test('hero cards: same size, bob up and down together, never touch text or each other', async ({ page }) => {
    await open(page, '/');
    await page.waitForTimeout(500);
    const s0 = await cardState(page);
    expect(s0).toHaveLength(4);
    for (const c of s0) {
      expect(c.anim?.name).toBe('khBob');
      expect(c.anim?.state).toBe('running');
      expect(c.anim?.iter).toBe(Infinity); // intended: gentle, endless background motion
    }
    expect(new Set(s0.map((c) => `${c.w}x${c.h}`)).size, 'all cards the same size').toBe(1);
    const times = s0.map((c) => c.anim!.time);
    expect(Math.max(...times) - Math.min(...times), 'cards move in sync (ms apart)').toBeLessThan(50);

    // Sample 12 frames over one 6 s cycle: the cards really move, stay in step, and never overlap anything.
    const tops: number[][] = []; const overlaps: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(500);
      tops.push((await cardState(page)).map((c) => c.top));
      overlaps.push(...await page.evaluate(() => {
        const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const sec = document.querySelector('section[aria-labelledby="cover-title"]')!;
        const cards = [...sec.querySelectorAll('.kh-card')].map((c) => c.getBoundingClientRect());
        const content = [...sec.querySelectorAll('h1,p,a,.cv-bar')].filter((e) => !e.closest('#kiro-hero-cards')).map((e) => [e, e.getBoundingClientRect()] as const);
        const out: string[] = [];
        cards.forEach((c, i) => { content.forEach(([e, r]) => { if (r.width && hit(c, r)) out.push(`card ${i} over ${e.tagName}`); });
          cards.forEach((d, j) => { if (j > i && hit(c, d)) out.push(`card ${i} touches card ${j}`); }); });
        return out;
      }));
    }
    const travel = Math.max(...tops.map((t) => t[0])) - Math.min(...tops.map((t) => t[0]));
    expect(travel, 'cards travel about 10px').toBeGreaterThan(6);
    expect(travel).toBeLessThan(14);
    const outOfStep = tops.map((t) => Math.max(...t.map((v, i) => v - tops[0][i])) - Math.min(...t.map((v, i) => v - tops[0][i])));
    expect(Math.max(...outOfStep), 'all four move together').toBeLessThan(2);
    expect([...new Set(overlaps)]).toEqual([]);
    record('hero-cards', { cardSize: `${s0[0].w}x${s0[0].h}`, durationMs: s0[0].anim!.dur, travelPx: Math.round(travel * 10) / 10, syncSpreadMs: Math.round(Math.max(...times) - Math.min(...times)) });
  });

  test('hero photos cross-fade to new pictures while moving', async ({ page }) => {
    await open(page, '/');
    const before = await page.$$eval('#kiro-hero-cards img', (i) => i.map((x) => (x as HTMLImageElement).src.slice(-40)));
    await page.waitForTimeout(4500);
    const after = await page.$$eval('#kiro-hero-cards img', (i) => i.map((x) => (x as HTMLImageElement).src.slice(-40)));
    expect(after).not.toEqual(before);
  });

  test('frame rate and layout shift on the Home page', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await open(page, '/');
    const fps = await page.evaluate(() => new Promise<{ fps: number; worstFrameMs: number; slowFrames: number }>((res) => {
      const t: number[] = []; const start = performance.now();
      const step = (now: number) => { t.push(now); if (now - start < 3000) requestAnimationFrame(step); else {
        const gaps = t.slice(1).map((v, i) => v - t[i]);
        res({ fps: Math.round((t.length - 1) / ((t[t.length - 1] - t[0]) / 1000)), worstFrameMs: Math.round(Math.max(...gaps)), slowFrames: gaps.filter((g) => g > 34).length });
      } };
      requestAnimationFrame(step);
    }));
    const cls = await page.evaluate(() => (window as any).__cls as number);
    record('home-frames', { ...fps, cumulativeLayoutShift: Math.round(cls * 1000) / 1000, note: 'headless Chromium on this PC; real devices differ' });
    // Headless Chromium here has no GPU; the number is recorded for trend-watching, the gate is lenient.
    expect(fps.fps, 'animations keep the page responsive').toBeGreaterThanOrEqual(20);
    expect(cls, 'Cumulative Layout Shift (good < 0.1)').toBeLessThan(0.1);
  });

  test('Home card carousel advances by itself and pauses on hover', async ({ page }) => {
    await open(page, '/');
    const track = page.locator('.kc-track');
    test.skip(!(await track.count()), 'no carousel on this build');
    const t0 = await track.evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(4200);
    const t1 = await track.evaluate((e) => getComputedStyle(e).transform);
    expect(t1).not.toBe(t0);
    await page.locator('.kc').hover();
    await page.waitForTimeout(900);
    const t2 = await track.evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(4200);
    expect(await track.evaluate((e) => getComputedStyle(e).transform), 'paused while hovered').toBe(t2);
  });

  test('KIRO LUX offer carousel slides and its dots follow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/lux/');
    const slides = page.locator('#slides');
    const t0 = await slides.evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(5500);
    expect(await slides.evaluate((e) => getComputedStyle(e).transform)).not.toBe(t0);
    await page.locator('#dots button').first().click();
    await expect(page.locator('#dots button').first()).toHaveAttribute('aria-current', 'true');
  });

  test('no full-screen intro blocks the page after loading', async ({ page }) => {
    await open(page, '/');
    await page.waitForTimeout(1200);
    const cover = await page.evaluate(() => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2) as HTMLElement;
      const fixed = el.closest('[style*="position:fixed"],[style*="position: fixed"]');
      return fixed ? fixed.id || fixed.className : '';
    });
    expect(cover, 'nothing fixed covers the middle of the page').toBe('');
    await page.getByRole('link', { name: 'Start free for 14 days' }).click(); // usable while cards animate
    await expect(page).toHaveURL(/\/app\/$/);
  });

  test('POS app: sheets open usable mid-animation, toasts appear and go away', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app/');
    await page.getByLabel('Business name').fill('QA Motion Cafe');
    await page.getByRole('button', { name: 'Start billing' }).click();
    await page.locator('[data-act="profileSheet"]:visible').first().click();
    const sheet = page.locator('.sheet');
    await expect(sheet).toBeVisible();
    await page.getByText('About KIRO').click({ timeout: 2000 }); // clicked immediately, while the sheet animates in
    const toast = page.locator('.toast, [role="status"]').filter({ hasText: 'KIRO' }).first();
    await expect(toast).toBeVisible();
    const t0 = Date.now();
    await expect(toast).toBeHidden({ timeout: 10_000 });
    record('pos-toast', { visibleForMs: Date.now() - t0 });
  });

  test('only intended animations run forever', async ({ page }) => {
    const report: Record<string, string[]> = {};
    for (const p of PAGES) {
      await open(page, p.path);
      await page.waitForTimeout(2500);
      report[p.name] = await page.evaluate(() => document.getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
        .map((a) => `${(a as CSSAnimation).animationName || 'transition'} on ${(a.effect as KeyframeEffect).target?.className || (a.effect as KeyframeEffect).target?.tagName}`));
    }
    record('infinite-animations', report);
    // Gentle decorative loops from the design: hero cards, floating badges, tilted cards, logo marquee.
    const ALLOWED = [/^khBob on kh-card/, /^kiroFloat on (deco )?float/, /^kiroBob on tilt/, /^kiroMarquee on kiro-marquee/, /^pdot/, /^pslide/];
    const unexpected = Object.entries(report).flatMap(([pg, list]) => list.filter((a) => !ALLOWED.some((r) => r.test(a))).map((a) => `${pg}: ${a}`));
    expect(unexpected, 'endless animations that are not on the allow-list').toEqual([]);
  });
});

test.describe('reduced motion (visitor turned animations off)', () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('hero cards stand still, stay the same size and visible', async ({ page }) => {
    await open(page, '/');
    const s = await cardState(page);
    expect(s).toHaveLength(4);
    expect(s.filter((c) => c.anim && c.anim.state === 'running'), 'no running card animations').toEqual([]);
    expect(new Set(s.map((c) => `${c.w}x${c.h}`)).size).toBe(1);
    const before = await page.$$eval('#kiro-hero-cards img', (i) => i.map((x) => (x as HTMLImageElement).src.slice(-40)));
    await page.waitForTimeout(4500);
    expect(await page.$$eval('#kiro-hero-cards img', (i) => i.map((x) => (x as HTMLImageElement).src.slice(-40))), 'photos do not swap').toEqual(before);
  });

  test('every page: nothing runs forever, content still reachable', async ({ page }) => {
    const running: string[] = [];
    for (const p of PAGES) {
      await open(page, p.path);
      await page.waitForTimeout(1500);
      running.push(...(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
        .map((a) => (a as CSSAnimation).animationName))).map((n) => `${p.name}: ${n}`));
      await expect(page.locator('body')).not.toBeEmpty();
    }
    record('reduced-motion-running', { running });
    expect(running).toEqual([]);
  });
});
