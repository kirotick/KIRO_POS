'use strict';
// TEST-ONLY: serves the real KIRO core handlers over plain HTTP (no Express) on the same routes as src/app.js,
// backed by a real PostgreSQL. Lets the app be exercised end to end where `npm install express` is not possible.
const http = require('http');
const path = require('path');
const SRV = process.env.KIRO_SERVER_DIR || path.join(__dirname, '../../server/node');
const makeStore = require(path.join(SRV, 'src/core-store'));
const { createCoreHandlers } = require(path.join(SRV, 'src/core-handlers'));
const { requireAuth, requireLiveUser, signJwtHS256 } = require(path.join(SRV, 'src/auth'));

function start({ pool, secret, port, root, html, ai }) {
  const store = makeStore(pool);
  const core = createCoreHandlers({ store, jwtSecret: secret, log: { error() {} }, ai });
  const auth = requireAuth(secret), live = requireLiveUser(store);
  const R = [['POST', '/api/auth/login', core.login, false], ['GET', '/api/me', core.me, true], ['GET', '/api/staff', core.listStaff, true], ['GET', '/api/sales', core.listSales, true],
    ['GET', '/api/sales/lookup', core.lookupSale, true], ['GET', '/api/sales/:id', core.getSale, true], ['GET', '/api/reports/summary', core.summary, true],
    ['GET', '/api/reports/insights', core.insights, true], ['POST', '/api/ask', core.ask, true], ['POST', '/api/ai/ask', core.aiAsk, true], ['GET', '/api/ai/status', core.aiStatus, true], ['GET', '/api/ai/insights', core.aiInsights, true]];
  const server = http.createServer(async (rq, rs) => {
    const u = new URL(rq.url, 'http://x');
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    if (rq.method === 'OPTIONS') { rs.writeHead(204, cors); return rs.end(); }
    if (u.pathname === '/') { rs.writeHead(200, { 'Content-Type': 'text/html' }); return rs.end(html); }
    if (u.pathname === '/app.js') { rs.writeHead(200, { 'Content-Type': 'text/javascript' }); return rs.end(require('fs').readFileSync(path.join(root, 'out/app.js'))); }
    let hit = null, params = {};
    for (const [m, p, h, a] of R) { const re = new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'); const mm = re.exec(u.pathname); if (m === rq.method && mm) { hit = [h, a]; params = mm.groups || {}; break; } }
    const out = { code: 200, status(c) { this.code = c; return this; }, json(b) { rs.writeHead(this.code, { 'Content-Type': 'application/json', ...cors }); rs.end(JSON.stringify(b)); return this; }, set() { return this; } };
    if (!hit) return out.status(404).json({ success: false, message: 'Not found' });
    let body = ''; for await (const c of rq) body += c;
    const req = { method: rq.method, headers: rq.headers, query: Object.fromEntries(u.searchParams), params, body: body ? (() => { try { return JSON.parse(body); } catch { return null; } })() : undefined };
    try {
      if (hit[1]) {
        let ok = false; await new Promise((r) => auth(req, out, () => { ok = true; r(); }) || (out.code !== 200 ? r() : null));
        if (!ok) return; ok = false; await live(req, out, () => { ok = true; }); if (!ok) return;
      }
      await hit[0](req, out);
    } catch (e) { out.status(500).json({ success: false, message: 'Something went wrong' }); }
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r({ server, core, store, sign: (c) => signJwtHS256(c, secret) })));
}
module.exports = { start, SRV };
