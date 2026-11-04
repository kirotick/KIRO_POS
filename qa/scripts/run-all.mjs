// npm run qa: the safe automated suite in a sensible order. Nothing here touches the live site except
// read-only GETs, sends messages or payments, or uses real shop data. Keeps going when a step fails so the
// report shows everything, then exits non-zero if any required step failed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick'); // CI on every push: skip other browsers
const run = (label, cmd, args, env = {}) => {
  console.log(`\n=== ${label} ===`);
  const t = Date.now();
  const r = spawnSync(cmd, args, { cwd: qa, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  return { label, ok: r.status === 0, seconds: Math.round((Date.now() - t) / 1000) };
};
fs.rmSync(path.join(qa, 'artifacts'), { recursive: true, force: true });
const steps = [
  run('Unit tests of every sub-project', 'node', ['scripts/run-unit.mjs']),
  run('Security scan', 'node', ['scripts/security.mjs']),
  run('Browser tests in Chromium: screens, POS, shop, motion, responsive, accessibility, visual, performance, XSS', 'npx', ['playwright', 'test', '--project=chromium']),
];
if (!quick) {
  // Only browsers that can actually start here; the rest are reported as "not tested", never as failures.
  const probe = (name) => spawnSync('node', ['-e', `require('@playwright/test').${name === 'edge' ? 'chromium' : name}.launch(${name === 'edge' ? "{channel:'msedge'}" : ''}).then(b=>b.close()).then(()=>process.exit(0),()=>process.exit(1))`], { cwd: qa, shell: false, timeout: 60_000 }).status === 0;
  const browsers = ['firefox', 'webkit', 'edge'].filter((b) => { const ok = probe(b); if (!ok) console.log(`(${b} cannot start on this machine: not tested)`); return ok; });
  fs.writeFileSync(path.join(qa, 'artifacts/browsers-unavailable.json'), JSON.stringify(['firefox', 'webkit', 'edge'].filter((b) => !browsers.includes(b))));
  if (browsers.length) steps.push(run(`Cross-browser: ${browsers.join(', ')}`, 'npx',
    ['playwright', 'test', ...browsers.map((b) => `--project=${b}`), 'tests/e2e/screens.spec.ts', 'tests/e2e/pos-app.spec.ts', 'tests/e2e/lux-shop.spec.ts'],
    { QA_JSON: './artifacts/browsers-results.json' }));
}
fs.writeFileSync(path.join(qa, 'artifacts/steps.json'), JSON.stringify(steps, null, 1));
run('Reports', 'node', ['scripts/report.mjs']);
console.log('\n' + steps.map((s) => `${s.ok ? 'PASS' : 'FAIL'}  ${s.label} (${s.seconds}s)`).join('\n'));
console.log('\nReport: qa/reports/index.html  ·  summary: qa/reports/summary.md');
process.exit(steps.every((s) => s.ok) ? 0 : 1);
