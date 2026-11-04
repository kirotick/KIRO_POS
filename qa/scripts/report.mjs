// Builds qa/reports/summary.md, qa/reports/index.html and qa/motion/MOTION_TEST_REPORT.md from the
// artifacts of the last run. Only reports what actually ran: missing results are shown as "not run".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = (f) => path.join(qa, 'artifacts', f);
const read = (f) => { try { return JSON.parse(fs.readFileSync(A(f), 'utf8')); } catch { return null; } };
const readDir = (d) => { try { return fs.readdirSync(A(d)).filter((f) => f.endsWith('.json')).map((f) => read(path.join(d, f))); } catch { return []; } };
const now = new Date();

// Playwright results → flat list.
function flatten(json, browserFallback) {
  const out = [];
  const walk = (s, trail) => {
    for (const sp of s.specs || []) for (const t of sp.tests) {
      const r = t.results[t.results.length - 1] || {};
      const status = t.status === 'skipped' ? 'skipped' : t.status === 'flaky' ? 'flaky' : r.status === 'passed' ? 'passed' : (r.status || 'not run');
      out.push({ file: (s.file || '').replace(/\\/g, '/'), title: [...trail, sp.title].filter(Boolean).join(' › '), project: t.projectName || browserFallback, status,
        error: r.error ? (r.error.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(Boolean).slice(0, 3).join(' / ') : '',
        attachments: (r.attachments || []).filter((a) => a.path).map((a) => ({ name: a.name, path: path.relative(path.join(qa, 'reports'), a.path).replace(/\\/g, '/') })) });
    }
    for (const c of s.suites || []) walk(c, [...trail, c.title.endsWith('.ts') ? '' : c.title]);
  };
  for (const s of json?.suites || []) walk(s, []);
  return out;
}
const pw = flatten(read('playwright-results.json'), 'chromium');
const br = flatten(read('browsers-results.json'));
const tests = [...pw, ...br];
const unit = read('unit.json');
const sec = read('security.json');
const motion = read('motion-metrics.json') || {};
const a11y = readDir('a11y');
const perf = readDir('perf');
const steps = read('steps.json') || [];

const suiteOf = (t) => (t.file.match(/tests\/([^/]+)/) || [, 'other'])[1];
const by = (list, key) => list.reduce((m, t) => ((m[key(t)] ||= []).push(t), m), {});
const count = (list) => ({ total: list.length, passed: list.filter((t) => t.status === 'passed').length, failed: list.filter((t) => ['failed', 'timedOut', 'interrupted'].includes(t.status)).length,
  flaky: list.filter((t) => t.status === 'flaky').length, skipped: list.filter((t) => t.status === 'skipped').length });
const unitList = unit?.results || [];
const unitC = { total: unitList.reduce((s, r) => s + (r.tests || 0), 0), passed: unitList.reduce((s, r) => s + (r.pass || 0), 0), failed: unitList.reduce((s, r) => s + (r.fail || 0), 0), skipped: unitList.reduce((s, r) => s + (r.skipped || 0), 0) };
const all = count(tests);
const sevCount = (s) => (sec?.findings || []).filter((f) => f.severity === s).length;
const a11yAll = a11y.flatMap((p) => p.violations.map((v) => ({ ...v, page: p.page })));

// Bug list: failed tests (P1 for business flows, P2 otherwise) + security + a11y serious.
const bugs = [
  ...tests.filter((t) => ['failed', 'timedOut'].includes(t.status)).map((t) => ({ sev: /pos-app|lux-shop|security/.test(t.file) ? 'P1' : 'P2', where: `${suiteOf(t)} · ${t.project}`, what: t.title, detail: t.error })),
  ...unitList.flatMap((r) => (r.failures || []).map((f) => ({ sev: 'P1', where: `unit · ${r.dir}`, what: f, detail: '' }))),
  ...(sec?.findings || []).map((f) => ({ sev: f.severity, where: `security · ${f.area}`, what: f.title, detail: `${f.detail} → ${f.fix}` })),
  ...a11yAll.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => ({ sev: v.impact === 'critical' ? 'P1' : 'P3', where: `accessibility · ${v.page}`, what: `${v.id}: ${v.help}`, detail: `${v.nodes} element(s), e.g. ${v.example}` })),
].sort((a, b) => a.sev.localeCompare(b.sev));

const unavailable = read('browsers-unavailable.json') || [];
const NOT_TESTED = [
  ...unavailable.map((b) => `${b === 'webkit' ? 'WebKit (Safari engine)' : b[0].toUpperCase() + b.slice(1)}: could not start on this machine (for Firefox on Windows usually the missing Microsoft Visual C++ runtime); runs in the weekly GitHub Actions job.`),
  ...(process.env.TEST_DATABASE_URL || fs.existsSync(path.join(qa, '.env')) ? [] : ['Server database and HTTP API tests: TEST_DATABASE_URL not set, so they were skipped.']),
  'Load tests at 10–500 concurrent users with k6 (k6 not installed, and the API server is not deployed; the static site is served by Netlify’s CDN and must not be load-tested in production).',
  'The deployed API server: not deployed yet, so its HTTP tests run against a local server on the Neon “qa” branch, not against Render.',
  'Admin app (Expo / React Native) screens on Android and iOS: needs emulators or devices (Appium not set up). Its logic modules are unit-tested.',
  'Saree desktop app (Electron): has no tests at all.',
  'Physical hardware: thermal/A4 printers, barcode scanners, cash drawers, Bluetooth/USB devices. Print and WhatsApp buttons are only checked to exist.',
  'Real devices and real Safari on iPhone/Mac: WebKit on Windows is the Safari engine, not Safari itself. Emulated phones are not equal to physical phones.',
  'Cloud sign-in, plan checks, online orders, PhonePe payments and nightly WhatsApp report: need accounts and sandbox credentials.',
  'Manual screen-reader pass (NVDA/TalkBack/VoiceOver): automated axe checks cannot prove a page is fully accessible.',
];

const pct = (c) => (c.total ? Math.round((c.passed / c.total) * 100) : 0);
const statusIcon = { passed: '✅', failed: '❌', timedOut: '❌', flaky: '⚠️', skipped: '⏭️', 'not run': '—' };
const suites = by(pw, suiteOf);
const md = [];
md.push(`# KIRO QA report`, '', `Run: ${now.toLocaleString('en-IN')} · Machine: ${process.platform} · Browsers: ${[...new Set(tests.map((t) => t.project))].join(', ') || 'none'}`, '');
md.push('## Summary', '', '| Area | Total | Passed | Failed | Flaky | Skipped |', '|---|---|---|---|---|---|');
md.push(`| Unit suites (Node) | ${unitC.total} | ${unitC.passed} | ${unitC.failed} | 0 | ${unitC.skipped} |`);
for (const [s, list] of Object.entries(suites)) { const c = count(list); md.push(`| Browser · ${s} (Chromium) | ${c.total} | ${c.passed} | ${c.failed} | ${c.flaky} | ${c.skipped} |`); }
for (const [p, list] of Object.entries(by(br, (t) => t.project))) { const c = count(list); md.push(`| Cross-browser · ${p} | ${c.total} | ${c.passed} | ${c.failed} | ${c.flaky} | ${c.skipped} |`); }
md.push(`| Security scan | ${(sec?.findings || []).length} findings | — | P0 ${sevCount('P0')} · P1 ${sevCount('P1')} | P2 ${sevCount('P2')} | P3 ${sevCount('P3')} |`);
md.push('', `**Browser tests: ${all.passed}/${all.total} passed (${pct(all)}%), ${all.failed} failed, ${all.skipped} skipped. Unit: ${unitC.passed}/${unitC.total} passed.** Skipped and not-run items are never counted as passed.`, '');
if (steps.length) md.push('Steps: ' + steps.map((s) => `${s.ok ? 'PASS' : 'FAIL'} ${s.label} (${s.seconds}s)`).join(' · '), '');
md.push('## Bugs and findings', '', bugs.length ? '| Severity | Where | What | Detail |\n|---|---|---|---|\n' + bugs.map((b) => `| ${b.sev} | ${b.where} | ${b.what.replace(/\|/g, '/')} | ${String(b.detail).replace(/\|/g, '/').slice(0, 220)} |`).join('\n') : 'None.', '');
md.push('Severity: P0 critical · P1 high · P2 medium · P3 low.', '');
md.push('## Screens covered', '', [...new Set(tests.map((t) => (t.title.match(/^[^›]*?(Home|Features|Pricing|Marketplace|Blog|Downloads|Contact|Log in|POS app|KIRO LUX)/) || [])[1]).filter(Boolean))].join(', ') || 'none', '');
md.push('## Performance (local server, Chromium)', '', '| Page | LCP ms | DOMContentLoaded ms | Load ms | Weight KB | Requests | DOM nodes |', '|---|---|---|---|---|---|---|');
for (const p of perf.filter((p) => p.page)) md.push(`| ${p.page} | ${p.lcpMs} | ${p.domContentLoadedMs} | ${p.loadMs} | ${p.pageWeightKB} | ${p.requests} | ${p.domNodes} |`);
const bills = perf.find((p) => p.bills); if (bills) md.push('', `POS app, ${bills.bills} bills in a row: average ${bills.avgMs} ms per whole bill, median ${bills.medianMs}, p95 ${bills.p95Ms}, max ${bills.maxMs}.`);
md.push('', '## Accessibility (axe, WCAG 2.1 A/AA)', '', '| Page | Critical | Serious | Moderate/minor |', '|---|---|---|---|');
for (const p of a11y) md.push(`| ${p.page} | ${p.violations.filter((v) => v.impact === 'critical').length} | ${p.violations.filter((v) => v.impact === 'serious').map((v) => `${v.id} (${v.nodes})`).join(', ') || 0} | ${p.violations.filter((v) => !['critical', 'serious'].includes(v.impact)).length} |`);
md.push('', '## Not tested (blocked or out of reach)', '', ...NOT_TESTED.map((n) => `- ${n}`), '');
md.push('## All browser tests', '', '| | Suite | Browser | Test | Error |', '|---|---|---|---|---|');
for (const t of tests) md.push(`| ${statusIcon[t.status] || t.status} | ${suiteOf(t)} | ${t.project} | ${t.title.replace(/\|/g, '/')} | ${t.error.replace(/\|/g, '/').slice(0, 160)} |`);
md.push('', 'Screenshots, videos and traces of failures: `qa/artifacts/test-results/` (open a trace with `npx playwright show-trace <trace.zip>`). Full interactive report: `qa/reports/playwright/index.html`.');
fs.mkdirSync(path.join(qa, 'reports'), { recursive: true });
fs.writeFileSync(path.join(qa, 'reports/summary.md'), md.join('\n'));

// Motion report.
const m = [];
m.push('# KIRO motion test report', '', `Run: ${now.toLocaleString('en-IN')} · Chromium (headless, no GPU). Normal motion and reduced motion are tested separately.`, '');
const mt = suites.motion || [];
m.push('| | Test | Error |', '|---|---|---|', ...mt.map((t) => `| ${statusIcon[t.status]} | ${t.title} | ${t.error.slice(0, 160)} |`), '');
if (motion['hero-cards']) m.push(`**Home hero cards:** size ${motion['hero-cards'].cardSize}px each, cycle ${motion['hero-cards'].durationMs} ms, travel ${motion['hero-cards'].travelPx}px, sync spread ${motion['hero-cards'].syncSpreadMs} ms between the four cards.`, '');
if (motion['home-frames']) m.push(`**Frames on Home while animating (3 s):** ${motion['home-frames'].fps} fps, worst frame ${motion['home-frames'].worstFrameMs} ms, ${motion['home-frames'].slowFrames} frames slower than 34 ms. Cumulative Layout Shift ${motion['home-frames'].cumulativeLayoutShift} (good is under 0.1). Measured in headless Chromium without a graphics card; real browsers with a GPU are expected to be smoother, and real low-end phones may be slower.`, '');
if (motion['pos-toast']) m.push(`**POS toast:** visible for about ${motion['pos-toast'].visibleForMs} ms, then removed.`, '');
if (motion['infinite-animations']) m.push('**Endless animations per page (normal motion):**', '', ...Object.entries(motion['infinite-animations']).filter(([k]) => k !== 'at').map(([k, v]) => `- ${k}: ${v.length ? v.join(', ') : 'none'}`), '');
if (motion['reduced-motion-running']) m.push(`**With reduced motion:** endless animations still running: ${motion['reduced-motion-running'].running.length ? motion['reduced-motion-running'].running.join(', ') : 'none'}.`, '');
m.push('Not covered: gestures beyond tap (the product has no swipe, long-press, drag or pull-to-refresh features), CPU and memory profiling on real devices, and video baselines (screenshot baselines are in tests/visual).');
fs.mkdirSync(path.join(qa, 'motion'), { recursive: true });
fs.writeFileSync(path.join(qa, 'motion/MOTION_TEST_REPORT.md'), m.join('\n'));

// HTML report (self-contained).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = (label, value, tone) => `<div class="card ${tone}"><div class="v">${value}</div><div class="l">${esc(label)}</div></div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KIRO QA report</title>
<style>:root{--bg:#fbf8f3;--fg:#1d1d1f;--mut:#5b6266;--line:#e3e0da;--ok:#1e7a44;--bad:#b3261e;--warn:#8a5300}@media (prefers-color-scheme:dark){:root{--bg:#121416;--fg:#ececec;--mut:#a3a8ab;--line:#2c3033;--ok:#5fcf8c;--bad:#ff8a80;--warn:#f2b45a}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:0 auto;padding:24px 16px}h1{margin:0 0 4px}h2{margin:32px 0 10px;font-size:19px}.mut{color:var(--mut)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}.card{border:1px solid var(--line);border-radius:12px;padding:14px}.card .v{font-size:26px;font-weight:700}.card .l{color:var(--mut);font-size:13px}
.ok .v{color:var(--ok)}.bad .v{color:var(--bad)}.warn .v{color:var(--warn)}table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.wrap{overflow-x:auto}.s-passed{color:var(--ok)}.s-failed,.s-timedOut{color:var(--bad);font-weight:700}.s-skipped{color:var(--mut)}input{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:transparent;color:inherit;width:min(100%,360px)}</style></head><body><main>
<h1>KIRO QA report</h1><div class="mut">${esc(now.toLocaleString('en-IN'))} · skipped and untested items are never counted as passed</div>
<div class="cards">${card('browser tests passed', `${all.passed}/${all.total}`, all.failed ? 'bad' : 'ok')}${card('failed', all.failed, all.failed ? 'bad' : 'ok')}${card('skipped', all.skipped, 'warn')}
${card('unit tests passed', `${unitC.passed}/${unitC.total}`, unitC.failed ? 'bad' : 'ok')}${card('security P0/P1', sevCount('P0') + sevCount('P1'), sevCount('P0') + sevCount('P1') ? 'bad' : 'ok')}${card('security P2/P3', sevCount('P2') + sevCount('P3'), 'warn')}</div>
<h2>Bugs and findings</h2><div class="wrap"><table><tr><th>Severity</th><th>Where</th><th>What</th><th>Detail</th></tr>${bugs.map((b) => `<tr><td>${b.sev}</td><td>${esc(b.where)}</td><td>${esc(b.what)}</td><td>${esc(String(b.detail).slice(0, 300))}</td></tr>`).join('') || '<tr><td colspan=4>None</td></tr>'}</table></div>
<h2>Performance</h2><div class="wrap"><table><tr><th>Page</th><th>LCP ms</th><th>DCL ms</th><th>Load ms</th><th>KB</th><th>Requests</th></tr>${perf.filter((p) => p.page).map((p) => `<tr><td>${esc(p.page)}</td><td>${p.lcpMs}</td><td>${p.domContentLoadedMs}</td><td>${p.loadMs}</td><td>${p.pageWeightKB}</td><td>${p.requests}</td></tr>`).join('')}</table></div>
${bills ? `<p>POS app, ${bills.bills} bills: average ${bills.avgMs} ms, p95 ${bills.p95Ms} ms per whole bill.</p>` : ''}
<h2>Not tested</h2><ul>${NOT_TESTED.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
<h2>All browser tests</h2><input id="f" placeholder="Filter, e.g. failed, motion, 320x568" aria-label="Filter tests"><div class="wrap"><table id="t"><tr><th>Status</th><th>Suite</th><th>Browser</th><th>Test</th><th>Evidence</th></tr>
${tests.map((t) => `<tr><td class="s-${t.status}">${t.status}</td><td>${suiteOf(t)}</td><td>${esc(t.project)}</td><td>${esc(t.title)}${t.error ? `<div class="mut">${esc(t.error.slice(0, 240))}</div>` : ''}</td><td>${t.attachments.map((a) => `<a href="${esc(a.path)}">${esc(a.name)}</a>`).join(' ')}</td></tr>`).join('')}</table></div>
<p class="mut">Interactive Playwright report with traces: <a href="playwright/index.html">playwright/index.html</a> · Motion: ../motion/MOTION_TEST_REPORT.md</p></main>
<script>document.getElementById('f').addEventListener('input',e=>{const q=e.target.value.toLowerCase();for(const r of document.querySelectorAll('#t tr:not(:first-child)'))r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'})</script></body></html>`;
fs.writeFileSync(path.join(qa, 'reports/index.html'), html);
console.log(`report: ${all.passed}/${all.total} browser tests passed, ${all.failed} failed, ${all.skipped} skipped; unit ${unitC.passed}/${unitC.total}; security P0 ${sevCount('P0')} P1 ${sevCount('P1')} P2 ${sevCount('P2')} P3 ${sevCount('P3')}`);
