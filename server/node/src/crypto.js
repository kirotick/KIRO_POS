'use strict';
// AES-256-GCM encryption for salt keys. The tenant id is bound as AAD, so a ciphertext copied
// from one business's row into another's fails to decrypt.
const crypto = require('crypto');

function loadKey(b64) {
  const k = Buffer.from(String(b64 || ''), 'base64');
  if (k.length !== 32) throw new Error('PHONEPE_KEK must be 32 random bytes, base64-encoded');
  return k;
}

function encrypt(plain, key, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(String(aad)));
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1:' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

function decrypt(blob, key, aad) {
  if (typeof blob !== 'string' || !blob.startsWith('v1:')) throw new Error('unrecognised ciphertext');
  const raw = Buffer.from(blob.slice(3), 'base64');
  if (raw.length < 29) throw new Error('ciphertext too short');
  const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  d.setAAD(Buffer.from(String(aad)));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}

module.exports = { loadKey, encrypt, decrypt };
