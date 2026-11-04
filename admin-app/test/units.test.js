'use strict';
// Plain-Node tests for the app's logic modules (no React Native needed). esbuild turns the ES modules into CommonJS on the fly.
const test = require('node:test'); const assert = require('node:assert/strict');
const path = require('path'); const Module = require('module');
const esbuild = require('/opt/npm-tools/node_modules/esbuild');
const load = (f) => { const code = esbuild.buildSync({ entryPoints: [path.join(__dirname, '../src', f)], bundle: true, format: 'cjs', platform: 'node', write: false }).outputFiles[0].text;
  const m = new Module(f); m._compile(code, f); return m.exports; };
const { inr, ago, when, cap } = load('format.js'); const { createApi, ApiError } = load('api.js');

test('inr formats paise with Indian digit grouping', () => {
  assert.equal(inr(0), '₹0'); assert.equal(inr(100), '₹1'); assert.equal(inr(150), '₹1.50'); assert.equal(inr(5), '₹0.05');
  assert.equal(inr(12345678), '₹1,23,456.78'); assert.equal(inr(10000000), '₹1,00,000'); assert.equal(inr(99900), '₹999'); assert.equal(inr(100000), '₹1,000');
  assert.equal(inr(-250), '-₹2.50'); assert.equal(inr(undefined), '₹0'); assert.equal(inr('7500'), '₹75');
});
test('ago and when', () => {
  const now = Date.parse('2026-10-10T10:00:00Z');
  assert.equal(ago(null, now), 'never'); assert.equal(ago('2026-10-10T09:59:50Z', now), 'just now'); assert.equal(ago('2026-10-10T09:15:00Z', now), '45 min ago');
  assert.equal(ago('2026-10-10T05:00:00Z', now), '5 h ago'); assert.equal(ago('2026-10-08T10:00:00Z', now), '2 d ago'); assert.equal(when('garbage'), '—'); assert.equal(cap('UPI'), 'Upi');
});
const mk = (impl, extra = {}) => { const calls = []; const api = createApi({ baseUrl: 'https://api.test', getToken: async () => 'TOK', onUnauthorized: () => calls.push('401'),
  fetchImpl: async (u, o) => { calls.push([u, o]); return impl(u, o); }, ...extra }); return { api, calls }; };
const ok = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });

test('api: sends bearer token, JSON body, and builds query strings safely', async () => {
  const { api, calls } = mk(() => ok({ success: true, sales: [], summary: { bills: 1 }, sale: { id: '1' } }));
  await api.sales({ period: 'week', q: 'a&b c', limit: 20 }); const [u, o] = calls[0];
  assert.equal(u, 'https://api.test/api/sales?period=week&q=a%26b%20c&limit=20'); assert.equal(o.headers.Authorization, 'Bearer TOK'); assert.equal(o.method, 'GET'); assert.equal(o.body, undefined);
  await api.summary('today', true); assert.match(calls[1][0], /reports\/summary\?period=today&mine=1$/); await api.summary('today', false); assert.match(calls[2][0], /period=today$/);
  await api.lookup('INV/000012'); assert.match(calls[3][0], /sales\/lookup\?no=INV%2F000012$/);
  await api.ask('Invoice 2'); assert.equal(calls[4][1].method, 'POST'); assert.equal(calls[4][1].body, '{"question":"Invoice 2"}'); assert.equal(calls[4][1].headers['Content-Type'], 'application/json');
});
test('api: login sends no token; 401 on login is a normal error, 401 elsewhere signs out', async () => {
  const { api, calls } = mk(() => ok({ success: false, message: 'Wrong login or password' }, 401));
  await assert.rejects(() => api.login('a', 'b'), (e) => e instanceof ApiError && e.status === 401 && e.message === 'Wrong login or password');
  assert.equal(calls[0][1].headers.Authorization, undefined); assert.ok(!calls.includes('401'), 'login failure must not trigger sign-out');
  await assert.rejects(() => api.me()); assert.ok(calls.includes('401'), 'expired session triggers onUnauthorized');
});
test('api: network failure, timeout, non-JSON and server errors give safe messages', async () => {
  await assert.rejects(() => mk(() => { throw new TypeError('fetch failed'); }).api.me(), /Cannot reach the server/);
  await assert.rejects(() => mk((u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' })))), { timeoutMs: 20 }).api.me(), /took too long/);
  await assert.rejects(() => mk(() => ({ ok: false, status: 502, json: async () => { throw new Error('html'); } })).api.me(), /Something went wrong/);
  await assert.rejects(() => mk(() => ok({ success: false, message: 'You do not have permission to do this' }, 403)).api.staff(), /permission/);
  await assert.rejects(() => createApi({ baseUrl: '', getToken: async () => null }).me(), /server address/);
});
