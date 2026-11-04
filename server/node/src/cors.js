'use strict';
// Minimal CORS for the web build of the admin app. Native phone apps do not need it.
// CORS_ORIGINS is a comma-separated allowlist of exact origins (e.g. https://admin.example.com). Empty = CORS off.
// Only listed origins are echoed back; "*" is never used because requests carry a bearer token.
function corsMiddleware(origins) {
  const allow = new Set(String(origins || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean));
  return (req, res, next) => {
    const o = req.headers && req.headers.origin;
    if (o && allow.has(o)) {
      res.set('Access-Control-Allow-Origin', o); res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS'); res.set('Access-Control-Max-Age', '600');
      if (req.method === 'OPTIONS') return res.status(204).end();
    } else if (req.method === 'OPTIONS' && o) return res.status(403).end();
    next();
  };
}
module.exports = { corsMiddleware };
