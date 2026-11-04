'use strict';
// In-memory fake of src/store.js with the same semantics, for fast handler tests.
const crypto = require('crypto');
module.exports.memStore = () => {
  const s = { gws: [], bills: [], events: [], nextId: 1 };
  return {
    s,
    upsertGateway: async (bid, mid, enc, idx) => {
      if (s.gws.some((g) => g.phonepe_mid === mid && g.business_id !== bid)) { const e = new Error('dup'); e.code = '23505'; throw e; }
      s.gws = s.gws.filter((g) => g.business_id !== bid);
      s.gws.push({ business_id: bid, phonepe_mid: mid, phonepe_salt_key: enc, phonepe_salt_index: idx }); return { id: 1 };
    },
    getGateway: async (bid) => s.gws.find((g) => g.business_id === bid) || null,
    getGatewayByMid: async (mid) => s.gws.find((g) => g.phonepe_mid === mid) || null,
    createBill: async (bid, inv, amt) => { const b = { id: String(s.nextId++), business_id: bid, invoice_no: inv, amount_paise: String(amt), status: 'Pending', phonepe_txn_id: null, qr_string: null, qr_expires_at: null, paid_at: null }; s.bills.push(b); return b; },
    getBill: async (bid, id) => s.bills.find((b) => b.business_id === bid && b.id === String(id)) || null,
    getBillByTxn: async (bid, t) => s.bills.find((b) => b.business_id === bid && b.phonepe_txn_id === t) || null,
    setQr: async (bid, id, t, qr, exp) => { const b = s.bills.find((x) => x.business_id === bid && x.id === String(id) && x.status === 'Pending'); if (!b) return null; Object.assign(b, { phonepe_txn_id: t, qr_string: qr, qr_expires_at: exp }); return { id }; },
    markPaid: async (bid, t) => { const b = s.bills.find((x) => x.business_id === bid && x.phonepe_txn_id === t && x.status === 'Pending'); if (!b) return null; b.status = 'Paid'; b.paid_at = new Date(); return { id: b.id }; },
    markReview: async (bid, t) => { const b = s.bills.find((x) => x.business_id === bid && x.phonepe_txn_id === t && x.status === 'Pending'); if (!b) return null; b.status = 'Review'; return { id: b.id }; },
    logEvent: async (bid, t, code, outcome, payload) => { s.events.push({ bid, t, code, outcome, payload }); return { id: s.events.length }; },
  };
};
module.exports.res = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, set() { return r; } }; return r; };
module.exports.b64json = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
module.exports.kek = crypto.randomBytes(32);
