'use strict';
// Runs the real SQL (migration + src/store.js) on a real PostgreSQL.
// Skipped unless TEST_DATABASE_URL (preferred, e.g. the Neon "qa" branch) or TEST_PG_HOST/PORT/DB is set.
// Drops and recreates the payment tables: never point it at production (pgpool.js refuses DATABASE_URL).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { enabled, pool, file, exec } = require('./pgpool');

test('real Postgres: migration + store + handlers', { skip: !enabled }, async () => {
  await exec('DROP TABLE IF EXISTS phonepe_webhook_events, bills, merchant_payment_gateways CASCADE');
  await file(path.join(__dirname, '../migrations/001_phonepe.sql'));
  await file(path.join(__dirname, '../migrations/001_phonepe.sql')); // re-run is harmless
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
  const ev = (await pool.query("SELECT payload->>'a' AS a FROM phonepe_webhook_events")).rows[0].a;
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
  const stored = (await pool.query('SELECT phonepe_salt_key FROM merchant_payment_gateways WHERE business_id=5')).rows[0].phonepe_salt_key;
  assert.ok(stored.startsWith('v1:') && !stored.includes('salt-for-e-123'));
});
