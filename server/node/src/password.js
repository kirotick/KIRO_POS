'use strict';
// scrypt password hashing (Node built-in, no dependency). Format: scrypt$N$r$p$saltB64$hashB64
const crypto = require('crypto');
const N = 16384, R = 8, P = 1, KEYLEN = 64;

const hash = (pw) => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16);
  crypto.scrypt(pw, salt, KEYLEN, { N, r: R, p: P }, (e, key) =>
    e ? reject(e) : resolve(`scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`));
});

const verify = (pw, stored) => new Promise((resolve) => {
  const p = String(stored || '').split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return resolve(false);
  const [n, r, par] = [Number(p[1]), Number(p[2]), Number(p[3])];
  const salt = Buffer.from(p[4], 'base64'), want = Buffer.from(p[5], 'base64');
  crypto.scrypt(pw, salt, want.length, { N: n, r, p: par }, (e, key) =>
    resolve(!e && key.length === want.length && crypto.timingSafeEqual(key, want)));
});

// Same rule the sign-up screen enforces: 8+ chars with letters and a digit.
const policyError = (pw) => {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 128) return 'Password is too long';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password needs letters and a number';
  return null;
};

module.exports = { hash, verify, policyError };
