'use strict';
// Runs the real SQL (migration + src/store.js) on a real PostgreSQL via psql.
// Skipped unless TEST_PG_HOST/TEST_PG_PORT/TEST_PG_DB are set (see README).
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('child_process');
const fs = require('fs'); const path = require('path');
const { promisify } = require('util'); const run = promisify(execFile);
const E = process.env;
const enabled = E.TEST_PG_HOST && E.TEST_PG_PORT && E.TEST_PG_DB;
const base = ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-h', E.TEST_PG_HOST, '-p', E.TEST_PG_PORT, '-U', E.TEST_PG_USER || 'kiro', '-d', E.TEST_PG_DB];

const lit = (v) => v === null || v === undefined ? 'NULL' : v instanceof Date ? `'${v.toISOString()}'` : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
// pg-Pool-compatible shim: substitutes $n safely-quoted, returns rows as JSON.
const pool = { async query(text, params = []) {
  const sql = text.replace(/\$(\d+)/g, (_, n) => lit(params[Number(n) - 1]));
  try {
    const { stdout } = await run('psql', [...base, '-c', `WITH r AS (${sql}) SELECT coalesce(json_agg(r),'[]'::json) FROM r`]);
    return { rows: JSON.parse(stdout) };
  } catch (e) { const m = /ERROR:\s+(\w{5}):/.exec(e.stderr || ''); const err = new Error('pg error'); err.code = m && m[1]; throw err; }
} };
const exec = (sql) => run('psql', [...base, '-c', sql]);

test('real Postgres: migration + store + handlers', { skip: !enabled }, async () => {
  const mig = fs.readFileSync(path.join(__dirname, '../migrations/001_phonepe.sql'), 'utf8');
  await run('psql', [...base, '-c', 'DROP TABLE IF EXISTS phonepe_webhook_events, bills, merchant_payment_gateways CASCADE']);
  await run('psql', [...base, '-f', path.join(__dirname, '../migrations/001_phonepe.sql')]);
  await run('psql', [...base, '-f', path.join(__dirname, '../migrations/001_phonepe.sql')]); // re-run is harmless
  const store = require('../src/store')(pool);

  await store.upsertGateway(1, 'MIDA', 'v1:aaa', '1');
  await store.upsertGateway(1, 'MIDA2', 'v1:bbb', '2');                         // update in place
  assert.equal((await store.getGateway(1)).phonepe_mid, 'MIDA2');
  await assert.rejects(store.upsertGateway(2, 'MIDA2', 'v1:ccc', '1'), { code: '23505' }); // MID unique across tenants
  assert.equal(await store.getGatewayByMid('NOPE'), null);

  const b = await store.createBill(1, "INV/'1", 25050);                        // quote in invoice no is safe
  await assert.rejects(store.createBill(1, "INV/'1", 100), { code: '23505' });  // unique per business
  await assert.rejects(store.createBill(1, 'X', 0), { code: '23514' });         // CHECK amount > 0
  assert.equal(await store.getBill(2, b.id), null);                              // tenant scoping
  assert.ok(await store.setQr(1, b.id, 'KRtxn1', 'upi://q', new Date(Date.now() + 600000)));
  assert.equal(await store.setQr(2, b.id, 'KRother', 'x', new Date()), null);   // other tenant cannot touch it

  // 8 simultaneous callbacks: exactly one wins
  const wins = (await Promise.all(Array.from({ length: 8 }, () => store.markPaid(1, 'KRtxn1')))).filter(Boolean);
  assert.equal(wins.length, 1);
  assert.equal((await store.getBill(1, b.id)).status, 'Paid');
  assert.equal(await store.markReview(1, 'KRtxn1'), null);                       // Paid can't go to Review
  assert.equal(await store.setQr(1, b.id, 'KRtxn2', 'x', new Date()), null);     // Paid bill can't get a new QR
  assert.ok(await store.logEvent(1, 'KRtxn1', 'PAYMENT_SUCCESS', 'paid', { a: "it's", n: 1 }));
  const ev = (await run('psql', [...base, '-c', "SELECT payload->>'a' FROM phonepe_webhook_events"])).stdout.trim();
  assert.equal(ev, "it's");

  // full webhook through handlers + real SQL
  const { createHandlers } = require('../src/handlers'); const kc = require('../src/crypto'); const pp = require('../src/phonepe');
  const { res: mkRes, b64json, kek } = require('./helpers');
  const h = createHandlers({ store, kek, cfg: { baseUrl: 'https://x.test', qrPath: '/v3/qr/init', publicBaseUrl: 'https://api.test', qrExpirySeconds: 600, maxBillPaise: 10 ** 7 },
    fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, data: { qrString: 'q' } }) }), log: { error() {} } });
  let r = mkRes(); await h.saveGateway({ auth: { businessId: 5, role: 'owner' }, body: { merchantId: 'MIDE', saltKey: 'salt-for-e-123', saltIndex: '1' } }, r); assert.equal(r.code, 200);
  r = mkRes(); await h.createBill({ auth: { businessId: 5 }, body: { invoiceNo: 'E1', amountPaise: 9900 } }, r); const id = r.body.bill.id;
  r = mkRes(); await h.createQr({ auth: { businessId: 5 }, params: { id } }, r); assert.equal(r.code, 200);
  const txn = (await store.getBill(5, id)).phonepe_txn_id;
  const b64 = b64json({ code: 'PAYMENT_SUCCESS', data: { merchantId: 'MIDE', merchantTransactionId: txn, amount: 9900 } });
  r = mkRes(); await h.webhook({ body: { response: b64 }, headers: { 'x-verify': pp.signCallback(b64, 'salt-for-e-123', '1') } }, r); assert.equal(r.code, 200);
  r = mkRes(); await h.billStatus({ auth: { businessId: 5 }, params: { id } }, r); assert.equal(r.body.status, 'Paid');
  const stored = (await run('psql', [...base, '-c', "SELECT phonepe_salt_key FROM merchant_payment_gateways WHERE business_id=5"])).stdout.trim();
  assert.ok(stored.startsWith('v1:') && !stored.includes('salt-for-e-123'));
});
