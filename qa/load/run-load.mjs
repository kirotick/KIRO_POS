// npm run qa:load — starts the real API server (server/node/src/server.js) locally against the Neon "qa"
// TEST database, runs the k6 load test, saves the results to artifacts/load.json and stops the server.
// Refuses to run without TEST_DATABASE_URL or if it equals the production DATABASE_URL.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const qa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(qa, '..');
const readEnv = (f, k) => { try { return (fs.readFileSync(f, 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim(); } catch { return undefined; } };
const testUrl = process.env.TEST_DATABASE_URL || readEnv(path.join(qa, '.env'), 'TEST_DATABASE_URL');
const prodUrl = readEnv(path.join(repo, 'server/node/.env'), 'DATABASE_URL');
if (!testUrl) { console.error('TEST_DATABASE_URL is not set (qa/.env): load test not run'); process.exit(1); }
if (prodUrl && testUrl === prodUrl) { console.error('TEST_DATABASE_URL equals the production DATABASE_URL: refusing'); process.exit(1); }
const k6 = ['k6', 'C:\\Program Files\\k6\\k6.exe'].find((c) => spawnSync(c, ['version']).status === 0);
if (!k6) { console.error('k6 is not installed (winget install GrafanaLabs.k6): load test not run'); process.exit(1); }

const PORT = 3999;
const env = { ...process.env, DATABASE_URL: testUrl, PORT: String(PORT), NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  PHONEPE_KEK: crypto.randomBytes(32).toString('base64'), PHONEPE_BASE_URL: 'https://phonepe.invalid', PUBLIC_BASE_URL: 'https://api.kiro.test' };
for (const k of ['WA_TOKEN', 'WA_PHONE_NUMBER_ID', 'WA_TEMPLATE', 'AI_API_KEY']) delete env[k]; // no messages, no AI calls
const server = spawn(process.execPath, ['src/server.js'], { cwd: path.join(repo, 'server/node'), env, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', (d) => process.stderr.write('[api] ' + d));
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
console.log('API server up on the Neon qa branch; starting k6 (about 3 minutes)…');
fs.mkdirSync(path.join(qa, 'artifacts'), { recursive: true });
const summaryFile = path.join(qa, 'artifacts/k6-summary.json');
const r = spawnSync(k6, ['run', '--quiet', '--summary-export', summaryFile, '-e', `API_URL=http://127.0.0.1:${PORT}`, path.join(qa, 'load/api-load.js')], { stdio: 'inherit' });
stop();
let s = {}; try { s = JSON.parse(fs.readFileSync(summaryFile, 'utf8')); } catch {}
const m = s.metrics || {};
const pick = (k) => m[k] ? { avg: Math.round(m[k].avg), med: Math.round(m[k].med), p95: Math.round(m[k]['p(95)']), p99: Math.round(m[k]['p(99)']), max: Math.round(m[k].max) } : null;
const out = { at: new Date().toISOString(), peakUsers: 100, stages: '1 → 10 → 20 → 50 → 100 users',
  requests: m.http_reqs?.count, requestsPerSecond: m.http_reqs ? Math.round(m.http_reqs.rate * 10) / 10 : null,
  errorRate: m.http_req_failed ? m.http_req_failed.value : null, allRequestsMs: pick('http_req_duration'), readMs: pick('http_req_duration{kind:read}'), saleMs: pick('sale_ms'),
  sales: m['checks'] ? undefined : undefined, passed: r.status === 0,
  environment: 'local API server on this PC + Neon free tier (Singapore), PostgreSQL 18, pool max 10 connections' };
fs.writeFileSync(path.join(qa, 'artifacts/load.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(r.status === 0 ? 0 : 1);
