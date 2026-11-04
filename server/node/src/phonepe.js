'use strict';
// PhonePe signing, QR init call and callback decoding, as defined in the ERP integration guide.
const crypto = require('crypto');

const sha256Hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// X-Verify for outgoing requests: sha256(base64 + path + salt) + "###" + index
const signRequest = (b64, path, salt, index) => `${sha256Hex(b64 + path + salt)}###${index}`;
// X-Verify expected on incoming callbacks: sha256(base64 response + salt) + "###" + index
const signCallback = (b64, salt, index) => `${sha256Hex(b64 + salt)}###${index}`;

// Constant-time comparison that also hides length differences.
const safeEqual = (a, b) =>
  crypto.timingSafeEqual(
    crypto.createHash('sha256').update(String(a)).digest(),
    crypto.createHash('sha256').update(String(b)).digest()
  );

const newTxnId = () => 'KR' + crypto.randomBytes(12).toString('hex'); // 26 chars, under PhonePe's 35 limit

function buildInitPayload({ merchantId, txnId, orderId, amountPaise, expiresIn, callbackUrl }) {
  return {
    merchantId,
    transactionId: txnId,
    merchantOrderId: orderId,
    amount: amountPaise, // integer paise
    expiresIn,
    callbackUrl,
  };
}

async function initQr({ fetchImpl = fetch, baseUrl, path, creds, payload, timeoutMs = 10000 }) {
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const headers = {
    'Content-Type': 'application/json',
    accept: 'application/json',
    'X-Verify': signRequest(b64, path, creds.saltKey, creds.saltIndex),
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(baseUrl.replace(/\/+$/, '') + path, {
      method: 'POST', headers, body: JSON.stringify({ request: b64 }), signal: ctl.signal,
    });
    let j = null;
    try { j = await r.json(); } catch { /* non-JSON body */ }
    const qr = j && j.success === true && j.data && typeof j.data.qrString === 'string' ? j.data.qrString : null;
    if (r.ok && qr) return { ok: true, qrString: qr };
    return { ok: false, message: (j && typeof j.message === 'string' && j.message.slice(0, 120)) || 'PhonePe rejected the request' };
  } catch {
    return { ok: false, message: 'Could not reach PhonePe' }; // never echo the error: it may carry request details
  } finally {
    clearTimeout(timer);
  }
}

// Decode WITHOUT trusting: only used to find which merchant's salt key to verify with.
function decodeCallback(b64) {
  if (typeof b64 !== 'string' || b64.length < 8 || b64.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  let j;
  try { j = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); } catch { return null; }
  const d = j && j.data;
  if (!d || typeof d.merchantId !== 'string' || typeof d.merchantTransactionId !== 'string' || typeof j.code !== 'string') return null;
  if (d.merchantId.length > 50 || d.merchantTransactionId.length > 64) return null;
  const amt = d.amount == null ? null : Number(d.amount);
  return { merchantId: d.merchantId, txnId: d.merchantTransactionId, code: j.code.slice(0, 64), amount: Number.isFinite(amt) ? amt : null, raw: j };
}

module.exports = { sha256Hex, signRequest, signCallback, safeEqual, newTxnId, buildInitPayload, initQr, decodeCallback };
