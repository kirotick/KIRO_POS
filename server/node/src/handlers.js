'use strict';
// Framework-agnostic handlers: (req, res) with req.body / req.params / req.headers / req.auth.
// Works as-is with Express (res.status().json()). Dependencies are injected so they can be tested.
const kcrypto = require('./crypto');
const pp = require('./phonepe');

const INVOICE_RE = /^[A-Za-z0-9/_-]{1,40}$/;
const MID_RE = /^[A-Za-z0-9_-]{3,50}$/;
const ID_RE = /^\d{1,15}$/;

function createHandlers({ store, kek, cfg, fetchImpl, now = () => new Date(), log = console }) {
  // cfg: { baseUrl, qrPath, publicBaseUrl, qrExpirySeconds, maxBillPaise }
  const fail = (res, code, message) => res.status(code).json({ success: false, message });
  const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { log.error('handler error:', e && e.code ? 'db ' + e.code : (e && e.name) || 'error'); fail(res, 500, 'Something went wrong'); }
  };
  const decryptSalt = (gw) => kcrypto.decrypt(gw.phonepe_salt_key, kek, gw.business_id);

  // PUT /api/gateway  (owner only) - save this business's PhonePe credentials
  const saveGateway = wrap(async (req, res) => {
    if (req.auth.role !== 'owner') return fail(res, 403, 'Only the owner can change payment settings');
    const { merchantId, saltKey, saltIndex } = req.body || {};
    const idx = String(saltIndex == null ? '1' : saltIndex);
    if (typeof merchantId !== 'string' || !MID_RE.test(merchantId)) return fail(res, 400, 'Invalid merchant id');
    if (typeof saltKey !== 'string' || saltKey.length < 8 || saltKey.length > 100) return fail(res, 400, 'Invalid salt key');
    if (!/^\d{1,3}$/.test(idx)) return fail(res, 400, 'Invalid salt index');
    try {
      await store.upsertGateway(req.auth.businessId, merchantId, kcrypto.encrypt(saltKey, kek, req.auth.businessId), idx);
    } catch (e) {
      if (e && e.code === '23505') return fail(res, 409, 'This merchant id is already linked to another business');
      throw e;
    }
    res.status(200).json({ success: true }); // never echo the salt key back
  });

  // POST /api/bills  - create a Pending bill (amount in integer paise)
  const createBill = wrap(async (req, res) => {
    const { invoiceNo, amountPaise } = req.body || {};
    if (typeof invoiceNo !== 'string' || !INVOICE_RE.test(invoiceNo)) return fail(res, 400, 'Invalid invoice number');
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 100 || amountPaise > cfg.maxBillPaise) return fail(res, 400, 'Invalid amount');
    let bill;
    try { bill = await store.createBill(req.auth.businessId, invoiceNo, amountPaise); }
    catch (e) { if (e && e.code === '23505') return fail(res, 409, 'Invoice number already used'); throw e; }
    res.status(201).json({ success: true, bill: { id: String(bill.id), status: bill.status } });
  });

  // POST /api/bills/:id/phonepe-qr - create (or reuse) a dynamic QR for a Pending bill
  const createQr = wrap(async (req, res) => {
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Bill not found');
    const bill = await store.getBill(req.auth.businessId, req.params.id);
    if (!bill) return fail(res, 404, 'Bill not found');
    if (bill.status !== 'Pending') return fail(res, 409, 'Bill is already ' + bill.status);
    const t = now().getTime();
    if (bill.qr_string && bill.qr_expires_at && new Date(bill.qr_expires_at).getTime() - t > 30000) {
      return res.status(200).json({ success: true, qrString: bill.qr_string, expiresAt: new Date(bill.qr_expires_at).toISOString() });
    }
    const gw = await store.getGateway(req.auth.businessId);
    if (!gw) return fail(res, 409, 'PhonePe is not set up for this business');
    const txnId = pp.newTxnId();
    const out = await pp.initQr({
      fetchImpl, baseUrl: cfg.baseUrl, path: cfg.qrPath,
      creds: { saltKey: decryptSalt(gw), saltIndex: gw.phonepe_salt_index },
      payload: pp.buildInitPayload({
        merchantId: gw.phonepe_mid, txnId, orderId: 'INV-' + bill.invoice_no.replace(/[^A-Za-z0-9-]/g, '-'),
        amountPaise: Number(bill.amount_paise), expiresIn: cfg.qrExpirySeconds,
        callbackUrl: cfg.publicBaseUrl + '/phonepe-webhook',
      }),
    });
    if (!out.ok) return fail(res, 502, out.message);
    const expiresAt = new Date(t + cfg.qrExpirySeconds * 1000);
    if (!(await store.setQr(req.auth.businessId, bill.id, txnId, out.qrString, expiresAt))) return fail(res, 409, 'Bill changed, try again');
    res.status(200).json({ success: true, qrString: out.qrString, expiresAt: expiresAt.toISOString() });
  });

  // GET /api/bills/:id/status - what the cashier screen polls
  const billStatus = wrap(async (req, res) => {
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Bill not found');
    const bill = await store.getBill(req.auth.businessId, req.params.id); // scoped: other tenants get 404
    if (!bill) return fail(res, 404, 'Bill not found');
    const expired = bill.status === 'Pending' && (!bill.qr_expires_at || new Date(bill.qr_expires_at).getTime() < now().getTime());
    res.set && res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, status: bill.status, expired, paidAt: bill.paid_at ? new Date(bill.paid_at).toISOString() : null });
  });

  // POST /phonepe-webhook - public, server to server
  const webhook = wrap(async (req, res) => {
    const b64 = req.body && typeof req.body.response === 'string' ? req.body.response : null;
    const received = req.headers['x-verify'];
    const ev = b64 && typeof received === 'string' ? pp.decodeCallback(b64) : null;
    if (!ev) return fail(res, 400, 'Bad request');

    // The payload is untrusted until verified; it only tells us whose salt key to verify with.
    const gw = await store.getGatewayByMid(ev.merchantId);
    const denied = () => fail(res, 401, 'Verification failed'); // same answer for unknown merchant and bad signature
    if (!gw) return denied();
    let salt;
    try { salt = decryptSalt(gw); } catch { log.error('cannot decrypt gateway credentials for business', gw.business_id); return fail(res, 500, 'Something went wrong'); }
    if (!pp.safeEqual(pp.signCallback(b64, salt, gw.phonepe_salt_index), received)) return denied();

    // Verified from here on.
    let outcome = 'ignored';
    if (ev.code === 'PAYMENT_SUCCESS') {
      const bill = await store.getBillByTxn(gw.business_id, ev.txnId);
      if (!bill) outcome = 'unknown_bill';
      else if (ev.amount !== null && ev.amount !== Number(bill.amount_paise)) {
        await store.markReview(gw.business_id, ev.txnId); // paid amount differs from the bill: a human must look
        outcome = 'amount_mismatch';
      } else outcome = (await store.markPaid(gw.business_id, ev.txnId)) ? 'paid' : 'already_processed';
    }
    try { await store.logEvent(gw.business_id, ev.txnId, ev.code, outcome, ev.raw); }
    catch { log.error('could not write webhook audit row'); }
    res.status(200).json({ success: true }); // 200 even for duplicates so PhonePe stops retrying
  });

  return { saveGateway, createBill, createQr, billStatus, webhook };
}

module.exports = { createHandlers };
