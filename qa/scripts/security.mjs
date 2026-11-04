// Safe security checks (read-only): secrets in git, risky files in git, known-vulnerable packages,
// third-party scripts without integrity pinning, and the live site's security headers.
// Saves artifacts/security.json. Exits 1 only for P0/P1 findings.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(qa, '..');
const findings = [];
const add = (severity, area, title, detail, fix) => findings.push({ severity, area, title, detail, fix });
const git = (...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' }).stdout || '';

// 1. Secrets committed to git (current files and history).
const SECRET = [
  ['private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['OpenAI/Anthropic-style key', /\bsk-(ant-)?[A-Za-z0-9_-]{32,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Supabase service key / JWT', /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/],
  ['Postgres URL with password', /postgres(ql)?:\/\/[^:\s'"]+:(?!PASSWORD|password|pass\b|\$\{)[^@\s'"]{6,}@/],
  ['Netlify token', /nfp_[A-Za-z0-9]{30,}/],
];
const files = git('ls-files').split('\n').filter(Boolean).filter((f) => !/node_modules|\.(png|jpe?g|webp|zip|woff2?)$|baselines\//.test(f));
for (const f of files) {
  let t; try { t = fs.readFileSync(path.join(repo, f), 'utf8'); } catch { continue; }
  t = t.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, ''); // embedded images are not secrets
  for (const [name, re] of SECRET) { const m = t.match(re); if (m && !/test|example|fake|dummy/i.test(f)) add('P0', 'secrets', `${name} committed`, `${f}: ${m[0].slice(0, 12)}…`, 'Revoke the key, remove it from git history, store it in Netlify/Render environment variables.'); }
}
for (const f of files) if (/(^|\/)\.env$|\.pem$|id_rsa/.test(f)) add('P0', 'secrets', 'secret file committed', f, 'Remove from git and add to .gitignore.');
const hist = spawnSync('git', ['log', '-p', '--all', '-G', 'BEGIN (RSA |EC |)PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}', '--format=%h'], { cwd: repo, encoding: 'utf8' }).stdout;
if (hist && hist.trim()) add('P1', 'secrets', 'secret-like text in git history', hist.trim().split('\n').slice(0, 3).join(' '), 'Rotate the secret; rewrite history if it was real.');

// 2. Known vulnerabilities in installed packages.
for (const dir of ['server/node', 'qa']) {
  if (!fs.existsSync(path.join(repo, dir, 'package-lock.json'))) { add('P3', 'dependencies', `no lockfile in ${dir}`, 'npm audit needs package-lock.json', 'Run npm install there and commit package-lock.json.'); continue; }
  const r = spawnSync('npm', ['audit', '--json', dir === 'server/node' ? '--omit=dev' : ''], { cwd: path.join(repo, dir), encoding: 'utf8', shell: true });
  try {
    const a = JSON.parse(r.stdout);
    const v = a.metadata?.vulnerabilities || {};
    const sev = { critical: 'P0', high: 'P1', moderate: 'P2', low: 'P3' };
    for (const [k, n] of Object.entries(v)) if (n && sev[k]) add(sev[k], 'dependencies', `${n} ${k} vulnerabilit${n > 1 ? 'ies' : 'y'} in ${dir}`, Object.keys(a.vulnerabilities || {}).slice(0, 5).join(', '), `cd ${dir} && npm audit fix`);
  } catch { add('P3', 'dependencies', `npm audit could not run in ${dir}`, (r.stderr || '').slice(0, 120), 'Run npm audit manually.'); }
}

// 3. Third-party scripts on the website without Subresource Integrity.
for (const f of files.filter((f) => f.startsWith('web/site/') && f.endsWith('.html'))) {
  const t = fs.readFileSync(path.join(repo, f), 'utf8');
  for (const m of t.matchAll(/<script[^>]+src="(https?:[^"]+)"[^>]*>/g)) {
    if (!/integrity=/.test(m[0])) add('P3', 'website', 'CDN script without integrity hash', `${f}: ${m[1]}`, 'Add integrity="sha384-…" so a tampered CDN file is refused.');
  }
}

// 4. Live site headers (read-only GET of the public home page).
const live = process.env.QA_LIVE_URL || 'https://kiro-pos.netlify.app/';
try {
  const r = await fetch(live, { redirect: 'follow' });
  const h = Object.fromEntries(r.headers);
  const want = { 'strict-transport-security': 'P2', 'x-content-type-options': 'P3', 'referrer-policy': 'P3', 'content-security-policy': 'P3' };
  for (const [k, s] of Object.entries(want)) if (!h[k]) add(s, 'headers', `missing ${k}`, live, 'Add it under [[headers]] in netlify.toml.');
  if (!h['x-frame-options'] && !/frame-ancestors/.test(h['content-security-policy'] || '')) add('P3', 'headers', 'page can be framed by other sites (clickjacking)', live, 'Add X-Frame-Options: DENY or CSP frame-ancestors.');
} catch (e) { add('P3', 'headers', 'live site not reachable for header check', String(e.message), 'Run again when online.'); }

fs.mkdirSync(path.join(qa, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(qa, 'artifacts/security.json'), JSON.stringify({ at: new Date().toISOString(), scannedFiles: files.length, findings }, null, 1));
const count = (s) => findings.filter((f) => f.severity === s).length;
console.log(`security: ${files.length} files scanned; P0 ${count('P0')}, P1 ${count('P1')}, P2 ${count('P2')}, P3 ${count('P3')}`);
for (const f of findings) console.log(`  [${f.severity}] ${f.area}: ${f.title} — ${f.detail}`);
process.exit(count('P0') || count('P1') ? 1 : 0);
