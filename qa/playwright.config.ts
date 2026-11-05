import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Screenshot baselines are per operating system (fonts render differently). If none exist yet for this
// system, the visual suite is left out instead of failing; create them with `npm run qa:visual:update`.
const hasBaselines = fs.existsSync(path.join(__dirname, 'tests/visual/baselines', `chromium-${process.platform}`));

// Tests run against a local copy of web/site (the exact files Netlify publishes) unless QA_BASE_URL
// points somewhere else, e.g. QA_BASE_URL=https://kiro-pos.netlify.app for read-only checks of the live site.
const PORT = Number(process.env.QA_PORT || 5190);
const baseURL = process.env.QA_BASE_URL || `http://localhost:${PORT}`;
const local = !process.env.QA_BASE_URL;

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/test-results',
  snapshotPathTemplate: './tests/visual/baselines/{projectName}-{platform}/{arg}{ext}',
  testIgnore: hasBaselines || process.argv.includes('--update-snapshots') ? [] : ['**/visual/**'],
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.QA_JSON || './artifacts/playwright-results.json' }],
    ['html', { outputFolder: './reports/playwright', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1366, height: 768 } } },
    // The real installed Google Chrome (not Playwright's bundled Chromium).
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 768 } } },
  ],
  webServer: local ? { command: 'node scripts/serve.mjs', url: `http://localhost:${PORT}/`, reuseExistingServer: !process.env.CI, timeout: 20_000 } : undefined,
});
