'use strict';
// The real Express app over real HTTP on a real PostgreSQL (TEST_DATABASE_URL, e.g. the Neon "qa" branch):
// status codes, auth, roles, validation, SQL injection, and tenant isolation (Business A vs Business B).
// Drops and recreates the KIRO tables, so it is skipped without a test database (and refuses production).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crypto = require('crypto');
const { enabled, pool, file, exec } = require('./pgpool');

test('HTTP API on real Postgres', { skip: !enabled }, async (t) => {
  await exec('DROP TABLE IF EXISTS sale_line_lots, sale_lines, sales, stock_lots, items, users, businesses, phonepe_webhook_events, bills, merchant_payment_gateways CASCADE');
  for (const f of ['001_phonepe.sql', '002_core.sql', '003_nightly.sql']) await file(path.join(__dirname, '../migrations', f));

  const SECRET = crypto.randomBytes(32).toString('hex');
  const makeStore = require('../src/store'); const makeCoreStore = require('../src/core-store');
  const { createHandlers } = require('../src/handlers'); const { createCoreHandlers } = require('../src/core-handlers');
  const { requireAuth, requireLiveUser } = require('../src/auth'); const { buildApp } = require('../src/app');
  const { kek } = require('./helpers');
  const coreStore = makeCoreStore(pool);
  const app = buildApp({
    handlers: createHandlers({ store: makeStore(pool), kek, cfg: { baseUrl: 'https://pp.test', qrPath: '/v3/qr/init', publicBaseUrl: 'https://api.test', qrExpirySeconds: 600, maxBillPaise: 10 ** 7 }, fetchImpl: async () => { throw new Error('no network in tests'); }, log: { error() {} } }),
    core: createCoreHandlers({ store: coreStore, jwtSecret: SECRET, log: { error() {} } }),
    authMiddleware: requireAuth(SECRET), liveUser: requireLiveUser(coreStore), corsOrigins: 'https://admin.kiro.test',
  });
  const server = app.listen(0); await new Promise((r) => server.once('listening', r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, url, { token, body, raw, headers = {} } = {}) => {
    const r = await fetch(base + url, { method, headers: { ...(body !== undefined || raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    let json = null; try { json = await r.json(); } catch {}
    return { status: r.status, body: json, headers: r.headers };
  };
  const signup = (name, login) => api('POST', '/api/auth/signup', { body: { businessName: name, ownerName: 'Owner ' + name, login, password: 'Passw0rdTest1', bizType: 'grocery' } });

  let A, B, itemA, saleA;
  await t.test('health and unknown routes', async () => {
    assert.equal((await api('GET', '/health')).status, 200);
    assert.equal((await api('GET', '/api/me')).status, 401);
    assert.equal((await api('GET', '/nope')).status, 404);
    assert.equal((await api('GET', '/health')).headers.get('x-powered-by'), null);
  });
  await t.test('signup and login: validation, duplicates, wrong password, SQL injection', async () => {
    const a = await signup('Shop A', '9000000001'); assert.equal(a.status, 201); A = a.body.token;
    const b = await signup('Shop B', '9000000002'); assert.equal(b.status, 201); B = b.body.token;
    assert.equal((await signup('Shop A again', '9000000001')).status, 409);
    assert.equal((await api('POST', '/api/auth/signup', { body: { businessName: 'X', ownerName: 'Y', login: '9000000003', password: 'short' } })).status, 400);
    assert.equal((await api('POST', '/api/auth/login', { body: { login: '9000000001', password: 'WrongPassw0rd' } })).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { body: { login: "' OR '1'='1", password: "' OR '1'='1" } })).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { raw: '{"login": broken json' })).status, 400);
    const ok = await api('POST', '/api/auth/login', { body: { login: '9000000001', password: 'Passw0rdTest1' } });
    assert.equal(ok.status, 200); assert.ok(ok.body.token);
  });
  await t.test('tokens: missing, forged, tampered, expired are refused', async () => {
    assert.equal((await api('GET', '/api/me', { token: 'not.a.jwt' })).status, 401);
    const [h, p] = A.split('.');
    const claims = JSON.parse(Buffer.from(p, 'base64url'));
    const forged = `${h}.${Buffer.from(JSON.stringify({ ...claims, businessId: claims.businessId + 1 })).toString('base64url')}.${A.split('.')[2]}`;
    assert.equal((await api('GET', '/api/me', { token: forged })).status, 401, 'changed businessId without the secret');
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${p}.`;
    assert.equal((await api('GET', '/api/me', { token: none })).status, 401, 'alg=none');
    const sign = (c) => { const hp = `${h}.${Buffer.from(JSON.stringify(c)).toString('base64url')}`; return `${hp}.${crypto.createHmac('sha256', SECRET).update(hp).digest('base64url')}`; };
    assert.equal((await api('GET', '/api/me', { token: sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }) })).status, 401, 'expired');
    assert.equal((await api('GET', '/api/me', { token: A })).status, 200);
  });
  await t.test('items and sales: create, validate, read back', async () => {
    const it = await api('POST', '/api/items', { token: A, body: { name: 'Rice 1kg', category: 'Food', pricePaise: 6000, costPaise: 4500, gstPct: 5, minStock: 2, stock: { qty: 10 } } });
    assert.ok([200, 201].includes(it.status), JSON.stringify(it.body)); itemA = it.body.id ?? it.body.item?.id;
    assert.equal((await api('POST', '/api/items', { token: A, body: { name: '', pricePaise: -1 } })).status, 400);
    // Prices are GST-inclusive (MRP style): 2 x 6000 = 12000 paise including 5% GST.
    const s = await api('POST', '/api/sales', { token: A, body: { lines: [{ itemId: itemA, qty: 2 }], payments: [{ mode: 'CASH', amountPaise: 12000 }] } });
    assert.ok([200, 201].includes(s.status), JSON.stringify(s.body)); saleA = s.body.id ?? s.body.sale?.id; assert.ok(saleA, 'sale id');
    assert.equal((await api('GET', `/api/sales/${saleA}`, { token: A })).status, 200);
    assert.ok((await api('POST', '/api/sales', { token: A, body: { lines: [{ itemId: itemA, qty: 999 }], payments: [] } })).status >= 400, 'cannot sell more than in stock');
  });
  await t.test('tenant isolation: Business B cannot see or change Business A', async () => {
    const list = await api('GET', '/api/items', { token: B });
    assert.equal(list.status, 200); assert.ok(!JSON.stringify(list.body).includes('Rice 1kg'), 'B sees no A items');
    assert.ok([403, 404].includes((await api('PATCH', `/api/items/${itemA}`, { token: B, body: { pricePaise: 1 } })).status));
    assert.ok([403, 404].includes((await api('POST', `/api/items/${itemA}/stock`, { token: B, body: { qty: 5, costPaise: 1 } })).status));
    assert.ok([403, 404].includes((await api('GET', `/api/sales/${saleA}`, { token: B })).status));
    const sales = await api('GET', '/api/sales', { token: B }); assert.ok(!JSON.stringify(sales.body).includes(String(saleA)));
    const sum = await api('GET', '/api/reports/summary?period=today', { token: B }); assert.equal(sum.status, 200);
    assert.ok(!JSON.stringify(sum.body).includes('12000'), 'B summary has no A money');
    assert.ok([400, 403, 404].includes((await api('POST', '/api/sales', { token: B, body: { lines: [{ itemId: itemA, qty: 1 }], payments: [] } })).status), 'B cannot sell A stock');
    const priceA = (await api('GET', '/api/items', { token: A })).body.items.find((i) => String(i.id) === String(itemA));
    assert.equal(priceA.pricePaise ?? priceA.price_paise, 6000, 'A price unchanged');
  });
  await t.test('roles: a pos (cashier) user cannot manage items or staff', async () => {
    const st = await api('POST', '/api/staff', { token: A, body: { name: 'Ravi', login: 'ravi-a', role: 'pos', password: 'Passw0rdTest1' } });
    assert.ok([200, 201].includes(st.status), JSON.stringify(st.body));
    const pos = (await api('POST', '/api/auth/login', { body: { login: 'ravi-a', password: 'Passw0rdTest1' } })).body.token;
    assert.equal((await api('POST', '/api/items', { token: pos, body: { name: 'X', pricePaise: 100, gstPct: 0 } })).status, 403);
    assert.equal((await api('POST', '/api/staff', { token: pos, body: { name: 'Y', login: 'y-a', role: 'owner', password: 'Passw0rdTest1' } })).status, 403);
    assert.equal((await api('PUT', '/api/gateway', { token: pos, body: { merchantId: 'M', saltKey: 'saltsaltsalt', saltIndex: '1' } })).status, 403);
  });
  await t.test('SQL injection in search and lookup is harmless', async () => {
    for (const q of ["' OR 1=1 --", "'; DROP TABLE items; --", '%_%']) {
      const r = await api('GET', `/api/sales?q=${encodeURIComponent(q)}`, { token: B });
      assert.ok(r.status < 500, `search ${q}`);
      assert.ok(!JSON.stringify(r.body).includes(String(saleA)));
      assert.ok((await api('GET', `/api/sales/lookup?no=${encodeURIComponent(q)}`, { token: B })).status < 500);
    }
    assert.equal((await pool.query('SELECT count(*)::int n FROM items')).rows[0].n, 1, 'items table intact');
  });
  await t.test('CORS: only the configured admin origin is allowed', async () => {
    const ok = await api('GET', '/api/me', { token: A, headers: { Origin: 'https://admin.kiro.test' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://admin.kiro.test');
    const bad = await api('GET', '/api/me', { token: A, headers: { Origin: 'https://evil.test' } });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
  });
  await t.test('login rate limit: 30 tries per 15 minutes per IP, then 429', async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await api('POST', '/api/auth/login', { body: { login: 'nobody' + i, password: 'Wrong1password' } })).status;
    assert.equal(last, 429);
  });
});
