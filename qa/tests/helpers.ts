import { Page, expect, ConsoleMessage, Request } from '@playwright/test';

// Every screen that is published. Add new pages here and every suite (screens, responsive, a11y,
// visual, performance) picks them up.
export const PAGES = [
  { name: 'Home', path: '/', title: /KIRO/ },
  { name: 'Features', path: '/features.html', title: /features/i },
  { name: 'Pricing', path: '/pricing.html', title: /pricing/i },
  { name: 'Marketplace', path: '/marketplace.html', title: /marketplace/i },
  { name: 'Blog', path: '/blog.html', title: /blog/i },
  { name: 'Downloads', path: '/downloads.html', title: /device|download/i },
  { name: 'Contact', path: '/contact.html', title: /contact/i },
  { name: 'Log in (old page)', path: '/login.html', title: /sign in/i },
  { name: 'POS app', path: '/app/', title: /KIRO POS/ },
  { name: 'KIRO LUX shop', path: '/lux/', title: /KIRO LUX/ },
] as const;

export const VIEWPORTS = [
  { w: 320, h: 568, kind: 'mobile' }, { w: 360, h: 800, kind: 'mobile' }, { w: 375, h: 812, kind: 'mobile' },
  { w: 390, h: 844, kind: 'mobile' }, { w: 414, h: 896, kind: 'mobile' }, { w: 480, h: 900, kind: 'mobile' },
  { w: 844, h: 390, kind: 'mobile-landscape' }, { w: 768, h: 1024, kind: 'tablet' }, { w: 820, h: 1180, kind: 'tablet' },
  { w: 1180, h: 820, kind: 'tablet-landscape' }, { w: 1024, h: 768, kind: 'laptop' }, { w: 1280, h: 800, kind: 'laptop' },
  { w: 1366, h: 768, kind: 'laptop' }, { w: 1440, h: 900, kind: 'desktop' }, { w: 1920, h: 1080, kind: 'desktop' },
] as const;

// Console errors we know are not bugs (none today). Keep this list short and explained.
const IGNORED_CONSOLE = [/Download the React DevTools/];

/** Collects console errors, page crashes and failed requests while a test runs. */
export function watchPage(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error' && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('Uncaught: ' + e.message));
  page.on('requestfailed', (r: Request) => {
    const u = r.url();
    // Third-party font/CDN hiccups are reported separately; our own files must never fail.
    failed.push(`${r.failure()?.errorText} ${u}`);
  });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  return {
    errors, failed,
    expectClean() {
      expect(errors, 'console errors / uncaught exceptions').toEqual([]);
      expect(failed, 'failed or 4xx/5xx requests').toEqual([]);
    },
  };
}

/** Opens a page and waits until the canvas pages have been drawn by dc-lite (or plain pages loaded). */
export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const root = document.getElementById('dc-root');
    return !root || root.childElementCount > 0;
  });
}

/** Fresh POS app with an owner set up and the sample menu. Data lives in this browser context only. */
export async function setupPos(page: Page, name = 'QA Test Cafe') {
  await page.goto('/app/');
  await page.getByLabel('Business name').fill(name);
  const sample = page.getByLabel(/sample menu/i);
  if (!(await sample.isChecked())) await sample.check();
  await page.getByRole('button', { name: 'Start billing' }).click();
  await expect(page.getByText('Today’s sales')).toBeVisible();
}

export const rupees = (s: string) => Number(s.replace(/[^\d.]/g, ''));
