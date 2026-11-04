'use strict';
// PLACEHOLDER AUTH: verifies an HS256 JWT carrying { businessId, role, sub, exp }.
// Replace with KIRO's real session/auth when the backend login exists; the handlers only need
// req.auth = { businessId, role }.
const crypto = require('crypto');
const b64u = (b) => Buffer.from(b).toString('base64url');

function verifyJwtHS256(token, secret, nowMs = Date.now()) {
  const p = String(token).split('.');
  if (p.length !== 3) return null;
  let header, claims;
  try { header = JSON.parse(Buffer.from(p[0], 'base64url')); claims = JSON.parse(Buffer.from(p[1], 'base64url')); } catch { return null; }
  if (!header || header.alg !== 'HS256') return null; // never trust the token's own algorithm choice
  const sig = crypto.createHmac('sha256', secret).update(p[0] + '.' + p[1]).digest();
  const got = Buffer.from(p[2], 'base64url');
  if (got.length !== sig.length || !crypto.timingSafeEqual(got, sig)) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < nowMs) return null; // exp is required
  return claims;
}

const signJwtHS256 = (claims, secret) => {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), c = b64u(JSON.stringify(claims));
  return `${h}.${c}.${b64u(crypto.createHmac('sha256', secret).update(h + '.' + c).digest())}`;
};

function requireAuth(secret) {
  return (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    const c = m && verifyJwtHS256(m[1], secret);
    if (!c || !Number.isInteger(c.businessId)) return res.status(401).json({ success: false, message: 'Sign in required' });
    req.auth = { businessId: c.businessId, role: String(c.role || ''), userId: c.sub };
    next();
  };
}

// After the token checks out, confirm the person still exists and is switched on, and take the role from the
// database (not the token), so removing or demoting a staff member takes effect immediately.
function requireLiveUser(store) {
  return async (req, res, next) => {
    try {
      const u = await store.getUserById(req.auth.businessId, req.auth.userId);
      if (!u || !u.active) return res.status(401).json({ success: false, message: 'Sign in required' });
      req.auth.role = u.role;
      next();
    } catch (e) { res.status(500).json({ success: false, message: 'Something went wrong' }); }
  };
}

module.exports = { verifyJwtHS256, signJwtHS256, requireAuth, requireLiveUser };
