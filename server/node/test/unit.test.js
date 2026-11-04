'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const kc = require('../src/crypto');
const pp = require('../src/phonepe');
const auth = require('../src/auth');
const { createHandlers } = require('../src/handlers');
const { memStore, res: mkRes, b64json, kek } = require('./helpers');

const CFG = { baseUrl: 'https://pp.example.test', qrPath: '/v3/qr/init', publicBaseUrl: 'https://api.kiro.test', qrExpirySeconds: 600, maxBillPaise: 10000000 };
const silent = { error() {} };

test('signing matches independently computed (Python hashlib) vectors', () => {
  const b64 = 'eyJtZXJjaGFudElkIjogIk0xIiwgInRyYW5zYWN0aW9uSWQiOiAiVDEiLCAiYW1vdW50IjogMTIzNDV9';
  assert.equal(pp.signRequest(b64, '/v3/qr/init', 'saltSECRET123', '1'), '8dfae0f51e3f39cc1417e2307efb5b426d86267341e685306fe2b6c5e10ddc3f###1');
  assert.equal(pp.signCallback(b64, 'saltSECRET123', '1'), '704d827ed1ad295e28529e9e40df93aef76c275290779822b666db10aec187a9###1');
});

test('crypto: roundtrip, tenant binding, tamper detection, no plaintext', () => {
  const c = kc.encrypt('my-salt-key', kek, 7);
  assert.ok(!c.includes('my-salt-key'));
  assert.equal(kc.decrypt(c, kek, 7), 'my-salt-key');
  assert.throws(() => kc.decrypt(c, kek, 8));                       // copied to another tenant
  const t = Buffer.from(c.slice(3), 'base64'); t[t.length - 1] ^= 1;
  assert.throws(() => kc.decrypt('v1:' + t.toString('base64'), kek, 7));
  assert.throws(() => kc.loadKey('c2hvcnQ='));
});

test('jwt: valid ok; wrong secret, alg none, expired, missing exp rejected', () => {
  const S = 'x'.repeat(40), exp = Math.floor(Date.now() / 1000) + 60;
  assert.equal(auth.verifyJwtHS256(auth.signJwtHS256({ businessId: 1, exp }, S), S).businessId, 1);
  assert.equal(auth.verifyJwtHS256(auth.signJwtHS256({ businessId: 1, exp }, S), 'y'.repeat(40)), null);
  assert.equal(auth.verifyJwtHS256(auth.signJwtHS256({ businessId: 1, exp: 1 }, S), S), null);
  assert.equal(auth.verifyJwtHS256(auth.signJwtHS256({ businessId: 1 }, S), S), null);
  const none = Buffer.from('{"alg":"none"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ businessId: 1, exp })).toString('base64url') + '.';
  assert.equal(auth.verifyJwtHS256(none, S), null);
});

async function setup() {
  const store = memStore(); const calls = [];
  const fetchImpl = async (url, opt) => { calls.push({ url, opt }); return { ok: true, status: 200, json: async () => ({ success: true, data: { qrString: 'upi://pay?pa=x@y&am=1' } }) }; };
  const h = createHandlers({ store, kek, cfg: CFG, fetchImpl, log: silent });
  const owner = (bid) => ({ auth: { businessId: bid, role: 'owner' } });
  for (const [bid, mid, salt] of [[1, 'MIDA', 'saltA-secret-1'], [2, 'MIDB', 'saltB-secret-2']]) {
    const r = mkRes(); await h.saveGateway({ ...owner(bid), body: { merchantId: mid, saltKey: salt, saltIndex: '1' } }, r); assert.equal(r.code, 200);
  }
  return { store, h, calls, fetchImpl };
}
async function billWithQr(ctx, bid, amt, inv) {
  let r = mkRes(); await ctx.h.createBill({ auth: { businessId: bid, role: 'cashier' }, body: { invoiceNo: inv, amountPaise: amt } }, r);
  const id = r.body.bill.id; r = mkRes();
  await ctx.h.createQr({ auth: { businessId: bid, role: 'cashier' }, params: { id } }, r); assert.equal(r.code, 200);
  return { id, txn: ctx.store.s.bills.find((b) => b.id === id).phonepe_txn_id };
}
function cb(mid, txn, code, amount, salt, idx = '1', tamper) {
  const b64 = b64json({ success: true, code, data: { merchantId: mid, merchantTransactionId: txn, ...(amount != null ? { amount } : {}) } });
  return { body: { response: b64 }, headers: { 'x-verify': tamper || pp.signCallback(b64, salt, idx) } };
}

test('gateway: salt stored encrypted, never returned; non-owner blocked; duplicate MID rejected', async () => {
  const { store, h } = await setup();
  assert.ok(store.s.gws[0].phonepe_salt_key.startsWith('v1:'));
  let r = mkRes(); await h.saveGateway({ auth: { businessId: 3, role: 'cashier' }, body: { merchantId: 'MIDC', saltKey: 'abcdefgh1' } }, r); assert.equal(r.code, 403);
  r = mkRes(); await h.saveGateway({ auth: { businessId: 3, role: 'owner' }, body: { merchantId: 'MIDA', saltKey: 'abcdefgh1' } }, r); assert.equal(r.code, 409);
  r = mkRes(); await h.saveGateway({ auth: { businessId: 3, role: 'owner' }, body: { merchantId: 'bad id!', saltKey: 'abcdefgh1' } }, r); assert.equal(r.code, 400);
  assert.ok(!JSON.stringify(r.body).includes('abcdefgh1'));
});

test('QR init: correct URL, signed header, paise amount, callback URL; reuse while valid', async () => {
  const ctx = await setup();
  const { id, txn } = await billWithQr(ctx, 1, 25050, 'INV/2026/1');
  const c = ctx.calls[0];
  assert.equal(c.url, 'https://pp.example.test/v3/qr/init');
  const reqB64 = JSON.parse(c.opt.body).request, pl = JSON.parse(Buffer.from(reqB64, 'base64'));
  assert.deepEqual([pl.merchantId, pl.transactionId, pl.amount, pl.callbackUrl, pl.merchantOrderId], ['MIDA', txn, 25050, 'https://api.kiro.test/phonepe-webhook', 'INV-INV-2026-1']);
  assert.equal(c.opt.headers['X-Verify'], pp.signRequest(reqB64, '/v3/qr/init', 'saltA-secret-1', '1'));
  const r = mkRes(); await ctx.h.createQr({ auth: { businessId: 1, role: 'x' }, params: { id } }, r);
  assert.equal(ctx.calls.length, 1); assert.equal(r.code, 200);             // reused, no second PhonePe call
});

test('QR init failure gives a generic 502 and leaks nothing', async () => {
  const store = memStore(), h0 = createHandlers({ store, kek, cfg: CFG, fetchImpl: async () => { throw new Error('boom saltA-secret-1'); }, log: silent });
  let r = mkRes(); await h0.saveGateway({ auth: { businessId: 1, role: 'owner' }, body: { merchantId: 'MIDA', saltKey: 'saltA-secret-1' } }, r);
  r = mkRes(); await h0.createBill({ auth: { businessId: 1 }, body: { invoiceNo: 'A1', amountPaise: 500 } }, r);
  const out = mkRes(); await h0.createQr({ auth: { businessId: 1 }, params: { id: r.body.bill.id } }, out);
  assert.equal(out.code, 502); assert.ok(!JSON.stringify(out.body).includes('saltA'));
});

test('webhook: valid PAYMENT_SUCCESS marks Paid, status endpoint reflects it', async () => {
  const ctx = await setup(); const { id, txn } = await billWithQr(ctx, 1, 10000, 'A1');
  const r = mkRes(); await ctx.h.webhook(cb('MIDA', txn, 'PAYMENT_SUCCESS', 10000, 'saltA-secret-1'), r);
  assert.equal(r.code, 200); assert.equal(ctx.store.s.bills[0].status, 'Paid'); assert.equal(ctx.store.s.events[0].outcome, 'paid');
  const s = mkRes(); await ctx.h.billStatus({ auth: { businessId: 1 }, params: { id } }, s);
  assert.equal(s.body.status, 'Paid'); assert.ok(s.body.paidAt);
});

test('webhook: forged / wrong-salt / tampered / unknown merchant all 401 and change nothing', async () => {
  const ctx = await setup(); const { txn } = await billWithQr(ctx, 1, 10000, 'A1');
  const tries = [
    cb('MIDA', txn, 'PAYMENT_SUCCESS', 10000, 'WRONG-SALT-xx'),                       // attacker guesses salt
    cb('MIDA', txn, 'PAYMENT_SUCCESS', 10000, 'saltB-secret-2'),                      // signed with another tenant's salt
    cb('MIDA', txn, 'PAYMENT_SUCCESS', 10000, 'saltA-secret-1', '1', 'deadbeef###1'), // garbage signature
    cb('MIDZ', txn, 'PAYMENT_SUCCESS', 10000, 'saltA-secret-1'),                      // unknown merchant
  ];
  for (const t of tries) { const r = mkRes(); await ctx.h.webhook(t, r); assert.equal(r.code, 401); assert.equal(r.body.message, 'Verification failed'); }
  assert.equal(ctx.store.s.bills[0].status, 'Pending'); assert.equal(ctx.store.s.events.length, 0);
  // payload altered after signing
  const good = cb('MIDA', txn, 'PAYMENT_ERROR', 10000, 'saltA-secret-1');
  const forged = { body: { response: b64json({ success: true, code: 'PAYMENT_SUCCESS', data: { merchantId: 'MIDA', merchantTransactionId: txn, amount: 10000 } }) }, headers: good.headers };
  const r = mkRes(); await ctx.h.webhook(forged, r); assert.equal(r.code, 401);
});

test('webhook: cannot pay a bill that belongs to another business', async () => {
  const ctx = await setup(); const { txn } = await billWithQr(ctx, 2, 10000, 'B1'); // bill belongs to business 2
  const r = mkRes(); await ctx.h.webhook(cb('MIDA', txn, 'PAYMENT_SUCCESS', 10000, 'saltA-secret-1'), r); // validly signed by business 1
  assert.equal(r.code, 200); assert.equal(ctx.store.s.bills[0].status, 'Pending'); assert.equal(ctx.store.s.events[0].outcome, 'unknown_bill');
});

test('webhook: replay is idempotent; failure codes ignored; amount mismatch goes to Review', async () => {
  const ctx = await setup(); const a = await billWithQr(ctx, 1, 10000, 'A1'), b = await billWithQr(ctx, 1, 20000, 'A2'), c = await billWithQr(ctx, 1, 30000, 'A3');
  const ok = cb('MIDA', a.txn, 'PAYMENT_SUCCESS', 10000, 'saltA-secret-1');
  let r = mkRes(); await ctx.h.webhook(ok, r); r = mkRes(); await ctx.h.webhook(ok, r);
  assert.equal(r.code, 200); assert.deepEqual(ctx.store.s.events.map((e) => e.outcome), ['paid', 'already_processed']);
  r = mkRes(); await ctx.h.webhook(cb('MIDA', b.txn, 'PAYMENT_ERROR', null, 'saltA-secret-1'), r);
  assert.equal(ctx.store.s.bills[1].status, 'Pending');
  r = mkRes(); await ctx.h.webhook(cb('MIDA', c.txn, 'PAYMENT_SUCCESS', 100, 'saltA-secret-1'), r);
  assert.equal(ctx.store.s.bills[2].status, 'Review');
});

test('webhook: malformed input is 400 and never throws', async () => {
  const ctx = await setup();
  for (const req of [{ body: null, headers: {} }, { body: { response: 5 }, headers: {} }, { body: { response: 'not base64!!' }, headers: { 'x-verify': 'a' } },
    { body: { response: Buffer.from('{"x":1}').toString('base64') }, headers: { 'x-verify': 'a' } }, { body: { response: 'A'.repeat(9000) }, headers: { 'x-verify': 'a' } }]) {
    const r = mkRes(); await ctx.h.webhook(req, r); assert.equal(r.code, 400);
  }
});

test('status/QR endpoints are tenant-scoped (other business gets 404)', async () => {
  const ctx = await setup(); const { id } = await billWithQr(ctx, 1, 10000, 'A1');
  let r = mkRes(); await ctx.h.billStatus({ auth: { businessId: 2 }, params: { id } }, r); assert.equal(r.code, 404);
  r = mkRes(); await ctx.h.createQr({ auth: { businessId: 2 }, params: { id } }, r); assert.equal(r.code, 404);
  r = mkRes(); await ctx.h.billStatus({ auth: { businessId: 1 }, params: { id: '1; DROP TABLE bills' } }, r); assert.equal(r.code, 404);
});

test('bill validation: bad amounts and invoice numbers rejected', async () => {
  const ctx = await setup();
  for (const body of [{ invoiceNo: 'A1', amountPaise: 12.5 }, { invoiceNo: 'A1', amountPaise: 0 }, { invoiceNo: 'A1', amountPaise: 10 ** 12 }, { invoiceNo: "A';--", amountPaise: 500 }, { invoiceNo: 'A1', amountPaise: '500' }]) {
    const r = mkRes(); await ctx.h.createBill({ auth: { businessId: 1 }, body }, r); assert.equal(r.code, 400);
  }
});

test('expired flag: Pending bill past QR expiry reports expired', async () => {
  const store = memStore(); let t = Date.now();
  const h = createHandlers({ store, kek, cfg: CFG, now: () => new Date(t), log: silent, fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, data: { qrString: 'q' } }) }) });
  let r = mkRes(); await h.saveGateway({ auth: { businessId: 1, role: 'owner' }, body: { merchantId: 'MIDA', saltKey: 'saltA-secret-1' } }, r);
  r = mkRes(); await h.createBill({ auth: { businessId: 1 }, body: { invoiceNo: 'A1', amountPaise: 500 } }, r); const id = r.body.bill.id;
  await h.createQr({ auth: { businessId: 1 }, params: { id } }, mkRes());
  r = mkRes(); await h.billStatus({ auth: { businessId: 1 }, params: { id } }, r); assert.equal(r.body.expired, false);
  t += 601000; r = mkRes(); await h.billStatus({ auth: { businessId: 1 }, params: { id } }, r); assert.equal(r.body.expired, true);
});

test('CORS: only listed origins are allowed, preflight answered, others untouched', () => {
  const { corsMiddleware } = require('../src/cors');
  const run = (mw, method, origin) => { const h = {}; let code = null, nexted = false; const res = { set: (k, v) => { h[k] = v; return res; }, status: (c) => { code = c; return res; }, end: () => res };
    mw({ method, headers: origin ? { origin } : {} }, res, () => { nexted = true; }); return { h, code, nexted }; };
  const mw = corsMiddleware('https://admin.example.com, https://b.example.com/');
  let r = run(mw, 'GET', 'https://admin.example.com'); assert.equal(r.h['Access-Control-Allow-Origin'], 'https://admin.example.com'); assert.ok(r.nexted);
  r = run(mw, 'GET', 'https://b.example.com'); assert.equal(r.h['Access-Control-Allow-Origin'], 'https://b.example.com');
  r = run(mw, 'OPTIONS', 'https://admin.example.com'); assert.equal(r.code, 204); assert.ok(!r.nexted); assert.match(r.h['Access-Control-Allow-Headers'], /Authorization/);
  r = run(mw, 'GET', 'https://evil.example'); assert.equal(r.h['Access-Control-Allow-Origin'], undefined); assert.ok(r.nexted);
  r = run(mw, 'OPTIONS', 'https://evil.example'); assert.equal(r.code, 403);
  r = run(corsMiddleware(''), 'GET', 'https://admin.example.com'); assert.equal(r.h['Access-Control-Allow-Origin'], undefined, 'empty list = CORS off');
  r = run(mw, 'GET', undefined); assert.ok(r.nexted && !Object.keys(r.h).length, 'non-browser clients unaffected');
});
