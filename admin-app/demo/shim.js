// DEMO ONLY. Replaces the network with an in-browser fake KIRO API over sample data, so the real app screens can be tried without a server.
// Ask KIRO uses the real answer engine from the server code (server/node/src/ask.js) on this sample data.
import { createAsk } from '../../server/node/src/ask';
import { listFor } from '../../server/node/src/perms';

const D = 864e5, now = Date.now(), at = (days, h, m) => { const d = new Date(now - days * D); d.setHours(h, m, 0, 0); return d.getTime(); };
const BIZ = { id: 1, name: 'Lakshmi Stores', biz_type: 'grocery', gstin: null, upi_vpa: null, invoice_prefix: 'INV', tz: 'Asia/Kolkata' };
const USERS = [
  { id: 1, login: '9876543210', name: 'Asha', role: 'owner', active: true, last_login_at: new Date(now - 4 * 6e4).toISOString() },
  { id: 2, login: 'mina', name: 'Mina', role: 'manager', active: true, last_login_at: new Date(now - 26 * 36e5).toISOString() },
  { id: 3, login: 'ravi', name: 'Ravi', role: 'pos', active: true, last_login_at: new Date(now - 35 * 6e4).toISOString() },
  { id: 4, login: 'acc', name: 'Kiran', role: 'accounts', active: true, last_login_at: null },
];
const ITEMS = [
  { id: 1, name: 'Basmati Rice 5kg', category: 'Grocery', price: 62000, cost: 48000, gst: 5 }, { id: 2, name: 'Tata Tea 500g', category: 'Grocery', price: 27000, cost: 21000, gst: 5 },
  { id: 3, name: 'Amul Butter', category: 'Dairy', price: 5800, cost: 4900, gst: 12 }, { id: 4, name: 'Surf Excel 1kg', category: 'Home care', price: 21000, cost: 16500, gst: 18 },
  { id: 5, name: 'Dettol Soap', category: 'Personal care', price: 4500, cost: 3200, gst: 18 }, { id: 6, name: 'Festival Gift Hamper', category: 'Gifts', price: 149900, cost: 98000, gst: 12 },
  { id: 7, name: 'Paracetamol 500', category: 'Health', price: 3000, cost: 1800, gst: 5 },
];
const LOTS = [
  { item: 1, left: 18, cost: 48000, age: 20, expiry: null }, { item: 2, left: 6, cost: 21000, age: 15, expiry: null }, { item: 3, left: 30, cost: 4900, age: 4, expiry: null },
  { item: 4, left: 3, cost: 16500, age: 40, expiry: null }, { item: 5, left: 40, cost: 3200, age: 25, expiry: null }, { item: 6, left: 9, cost: 98000, age: 150, expiry: null },
  { item: 7, left: 12, cost: 1800, age: 200, expiry: new Date(now + 40 * D).toISOString().slice(0, 10) },
];
const CUST = [['Meena Iyer', '9000000001'], ['Rahul Verma', '9000000002'], ['', ''], ['', ''], ['Sunita Rao', '9000000003'], ['', '']];
// a deterministic set of bills over the last ten days
const SALES = []; let seq = 0;
const bill = (days, h, m, user, lines, mode, cust) => {
  const ls = lines.map(([id, q]) => { const it = ITEMS[id - 1], tot = it.price * q, tax = Math.round(tot - tot / (1 + it.gst / 100)); return { item_id: id, name: it.name, category: it.category, qty: q, unit_price_paise: it.price, line_total_paise: tot, gst_pct: it.gst, tax_paise: tax, cost_paise: it.cost * q }; });
  const total = ls.reduce((a, l) => a + l.line_total_paise, 0), tax = ls.reduce((a, l) => a + l.tax_paise, 0), cg = Math.floor(tax / 2);
  const u = USERS.find((x) => x.name === user); seq++;
  SALES.push({ id: String(seq), seq, invoice_no: 'INV/' + String(seq).padStart(6, '0'), user_id: String(u.id), user_name: u.name, customer_name: cust ? cust[0] : null, customer_phone: cust ? cust[1] : null,
    subtotal_paise: total, discount_paise: 0, total_paise: total, cgst_paise: cg, sgst_paise: tax - cg, payments: mode === 'SPLIT' ? [{ mode: 'CASH', amountPaise: 20000 }, { mode: 'UPI', amountPaise: total - 20000 }] : [{ mode, amountPaise: total }],
    status: 'paid', created_at: new Date(at(days, h, m)).toISOString(), lines: ls });
};
[[9, 10, 5, 'Asha', [[1, 1], [3, 2]], 'UPI', CUST[0]], [9, 17, 40, 'Ravi', [[5, 3]], 'CASH'], [8, 11, 15, 'Ravi', [[2, 1], [3, 1]], 'CASH'], [7, 12, 30, 'Mina', [[4, 2]], 'UPI', CUST[1]],
 [6, 18, 5, 'Ravi', [[1, 2]], 'UPI'], [5, 9, 50, 'Asha', [[2, 2], [5, 2]], 'CASH'], [4, 16, 20, 'Ravi', [[3, 4]], 'CASH'], [3, 10, 45, 'Mina', [[1, 1], [4, 1]], 'SPLIT', CUST[4]],
 [2, 13, 10, 'Ravi', [[5, 5], [3, 1]], 'UPI'], [1, 11, 0, 'Asha', [[4, 2]], 'CARD', CUST[0]], [1, 15, 35, 'Ravi', [[1, 1]], 'UPI'], [1, 19, 10, 'Ravi', [[2, 1], [5, 1]], 'CASH'],
 [0, 9, 20, 'Ravi', [[3, 3], [5, 2]], 'CASH'], [0, 10, 5, 'Asha', [[1, 2]], 'UPI', CUST[0]], [0, 11, 40, 'Ravi', [[4, 1], [2, 1]], 'UPI'], [0, 12, 15, 'Mina', [[1, 1], [2, 1]], 'SPLIT', CUST[1]]]
  .forEach((b, i, all) => { // bills dated today are spread over the part of the day that has already passed, so the demo never shows an empty "today"
    const ds = new Date(); ds.setHours(0, 0, 0, 0); const todays = all.filter((x) => x[0] === 0), k = todays.indexOf(b);
    if (b[0] === 0) { const t = ds.getTime() + ((k + 1) / (todays.length + 1)) * (now - ds.getTime()); const save = at; bill(0, 0, 0, ...b.slice(3)); SALES[SALES.length - 1].created_at = new Date(t).toISOString(); } else bill(...b); });
const startOf = (p) => { const t = new Date(); t.setHours(0, 0, 0, 0); const d = t.getTime();
  return { today: [d, 9e15], yesterday: [d - D, d], week: [d - 6 * D, 9e15], month: [new Date(t.getFullYear(), t.getMonth(), 1).getTime(), 9e15], year: [new Date(t.getFullYear(), 0, 1).getTime(), 9e15], all: [0, 9e15] }[p] || [d, 9e15]; };
const inP = (s, p, uid) => { const [f, t] = startOf(p), x = new Date(s.created_at).getTime(); return x >= f && x < t && (uid == null || String(s.user_id) === String(uid)); };
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);

const store = {
  getBusiness: async () => BIZ,
  listStaff: async () => USERS.map((u) => { const td = SALES.filter((s) => inP(s, 'today', u.id)); return { ...u, id: String(u.id), bills_today: td.length, total_today: sum(td, (s) => s.total_paise) }; }),
  listSales: async (b, { period, userId, q, beforeSeq, limit }) => SALES.filter((s) => inP(s, period, userId) && (!beforeSeq || s.seq < Number(beforeSeq))
    && (!q || [s.invoice_no, s.customer_name, s.customer_phone].some((v) => String(v || '').toLowerCase().includes(String(q).toLowerCase())))).sort((a, b2) => b2.seq - a.seq).slice(0, limit || 50),
  lookupSale: async (b, token) => { const n = /^\d{1,9}$/.test(token) ? Number(token) : null; const s = SALES.find((x) => x.invoice_no.toLowerCase() === String(token).toLowerCase() || (n !== null && x.seq === n)); return s ? { id: s.id } : null; },
  getSale: async (b, id) => SALES.find((s) => s.id === String(id)) || null,
  summary: async (b, period, userId) => {
    const l = SALES.filter((s) => inP(s, period, userId)), modes = {}, staff = {}, items = {};
    l.forEach((s) => { s.payments.forEach((p) => { modes[p.mode] = (modes[p.mode] || 0) + p.amountPaise; }); const o = staff[s.user_id] || (staff[s.user_id] = { userId: s.user_id, name: s.user_name, bills: 0, totalPaise: 0 }); o.bills++; o.totalPaise += s.total_paise;
      s.lines.forEach((x) => { const i = items[x.name] || (items[x.name] = { name: x.name, qty: 0, totalPaise: 0 }); i.qty += x.qty; i.totalPaise += x.line_total_paise; }); });
    const o = [...l].sort((a, b2) => a.seq - b2.seq);
    return { bills: l.length, totalPaise: sum(l, (s) => s.total_paise), cgstPaise: sum(l, (s) => s.cgst_paise), sgstPaise: sum(l, (s) => s.sgst_paise), discountPaise: 0,
      firstInvoice: o[0] ? o[0].invoice_no : null, lastInvoice: o.length ? o[o.length - 1].invoice_no : null,
      byMode: Object.entries(modes).map(([mode, amountPaise]) => ({ mode, amountPaise })).sort((a, b2) => b2.amountPaise - a.amountPaise), byStaff: Object.values(staff).sort((a, b2) => b2.totalPaise - a.totalPaise),
      topItems: Object.values(items).sort((a, b2) => b2.qty - a.qty || b2.totalPaise - a.totalPaise).slice(0, 10) };
  },
  insights: async () => {
    const recent = (id, days) => SALES.some((s) => now - new Date(s.created_at).getTime() < days * D && s.lines.some((l) => l.item_id === id));
    const dead = LOTS.filter((l) => l.age > 90 && !recent(l.item, 90)).map((l) => ({ itemId: String(l.item), name: ITEMS[l.item - 1].name, batchNo: null, qty: l.left, costPaise: l.cost, lockedPaise: l.left * l.cost, ageDays: l.age })).sort((a, b) => b.lockedPaise - a.lockedPaise);
    const fast = {}; SALES.filter((s) => now - new Date(s.created_at).getTime() < 14 * D).forEach((s) => s.lines.forEach((l) => { fast[l.category] = (fast[l.category] || 0) + l.qty; }));
    return { inventoryPaise: sum(LOTS, (l) => l.left * l.cost), expiredPaise: 0, stuckPaise: sum(dead, (d) => d.lockedPaise), dead,
      fastMovers: Object.entries(fast).map(([category, qty]) => ({ category, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5),
      expiring: LOTS.filter((l) => l.expiry).map((l) => ({ itemId: String(l.item), name: ITEMS[l.item - 1].name, batchNo: 'B7', expiry: l.expiry, qty: l.left, valuePaise: l.left * l.cost, expired: false })),
      lowStock: LOTS.filter((l) => l.left <= 6).map((l) => ({ itemId: String(l.item), name: ITEMS[l.item - 1].name, stock: l.left, min: 8 })) };
  },
  topCustomers: async () => { const g = {}; SALES.filter((s) => s.customer_name).forEach((s) => { const o = g[s.customer_name] || (g[s.customer_name] = { name: s.customer_name, phone: s.customer_phone, bills: 0, totalPaise: 0 }); o.bills++; o.totalPaise += s.total_paise; }); return Object.values(g).sort((a, b) => b.totalPaise - a.totalPaise).slice(0, 5); },
};
const asker = createAsk({ store });
const can = (role, perm) => listFor(role).includes(perm);
const shape = (s, full) => ({ id: s.id, invoiceNo: s.invoice_no, createdAt: s.created_at, billedBy: { id: s.user_id, name: s.user_name }, customer: s.customer_name || s.customer_phone ? { name: s.customer_name, phone: s.customer_phone } : null,
  totalPaise: s.total_paise, payments: s.payments, status: s.status, ...(full ? { subtotalPaise: s.subtotal_paise, discountPaise: s.discount_paise, cgstPaise: s.cgst_paise, sgstPaise: s.sgst_paise,
    lines: s.lines.map((l) => ({ name: l.name, qty: l.qty, unitPricePaise: l.unit_price_paise, lineTotalPaise: l.line_total_paise, gstPct: l.gst_pct, taxPaise: l.tax_paise })) } : {}) });
const userOut = (u) => ({ id: String(u.id), name: u.name, role: u.role, permissions: listFor(u.role) });
const bizOut = { id: 1, name: BIZ.name, type: BIZ.biz_type, gstin: null, upiVpa: null, invoicePrefix: 'INV' };
export const DEMO_USERS = { owner: USERS[0], manager: USERS[1], accounts: USERS[3], cashier: USERS[2] };
export const demoSession = (key) => ({ token: 'demo-' + DEMO_USERS[key].id, user: userOut(DEMO_USERS[key]), business: bizOut });

async function route(method, path, query, body, token) {
  const out = (code, b) => ({ code, b });
  if (method === 'POST' && path === '/auth/login') { const u = USERS.find((x) => x.login === String(body.login).toLowerCase()); return u && body.password === 'demo' ? out(200, { success: true, token: 'demo-' + u.id, user: userOut(u), business: bizOut }) : out(401, { success: false, message: 'Wrong login or password. In this demo the password is "demo".' }); }
  const u = USERS.find((x) => 'demo-' + x.id === token); if (!u) return out(401, { success: false, message: 'Sign in required' });
  const role = u.role, auth = { businessId: 1, userId: String(u.id), role };
  if (path === '/me') return out(200, { success: true, user: userOut(u), business: bizOut });
  if (path === '/staff') return can(role, 'staff:manage') ? out(200, { success: true, staff: (await store.listStaff()).map((r) => ({ id: r.id, login: r.login, name: r.name, role: r.role, active: r.active, lastLoginAt: r.last_login_at, billsToday: r.bills_today, totalTodayPaise: r.total_today })) }) : out(403, { success: false, message: 'You do not have permission to do this' });
  if (path === '/sales/lookup') { const h = await store.lookupSale(1, query.no || ''); const s = h && await store.getSale(1, h.id); return s ? out(200, { success: true, sale: shape(s, true) }) : out(404, { success: false, message: 'No invoice matches "' + query.no + '"' }); }
  if (path.startsWith('/sales/')) { const s = await store.getSale(1, path.slice(7)); return s && (can(role, 'sales:viewAll') || s.user_id === String(u.id)) ? out(200, { success: true, sale: shape(s, true) }) : out(404, { success: false, message: 'Not found' }); }
  if (path === '/sales') { const all = can(role, 'sales:viewAll'); const rows = await store.listSales(1, { period: query.period || 'today', userId: all ? query.staff || null : u.id, q: query.q || null, limit: Number(query.limit) || 50 }); return out(200, { success: true, sales: rows.map((r) => shape(r, false)), nextBefore: rows.length ? String(rows[rows.length - 1].seq) : null }); }
  if (path === '/reports/summary') { const mine = query.mine === '1'; if (!mine && !can(role, 'reports:view')) return out(403, { success: false, message: 'You do not have permission to do this' }); return out(200, { success: true, period: query.period || 'today', summary: await store.summary(1, query.period || 'today', mine ? u.id : null) }); }
  if (path === '/reports/insights') return can(role, 'insights:view') ? out(200, { success: true, insights: await store.insights() }) : out(403, { success: false, message: 'You do not have permission to do this' });
  if (path === '/ask') { if (!can(role, 'ask:use')) return out(403, { success: false, message: 'You do not have permission to do this' }); return out(200, { success: true, ...(await asker.ask(auth, body.question)) }); }
  return out(404, { success: false, message: 'Not found' });
}
export function installDemoFetch(base) {
  window.fetch = async (url, o = {}) => {
    const u = new URL(url); if (!String(url).startsWith(base)) throw new TypeError('demo: network disabled');
    const h = o.headers || {}, tok = /^Bearer (.+)$/.exec(h.Authorization || ''); await new Promise((r) => setTimeout(r, 120));
    const r = await route(o.method || 'GET', u.pathname.replace(/^\/api/, ''), Object.fromEntries(u.searchParams), o.body ? JSON.parse(o.body) : {}, tok && tok[1]);
    return { ok: r.code < 400, status: r.code, json: async () => r.b };
  };
}
