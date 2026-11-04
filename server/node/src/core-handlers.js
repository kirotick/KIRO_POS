'use strict';
// Framework-agnostic handlers for logins, staff, items, sales, reports. Same (req,res) contract as handlers.js.
const pw = require('./password');
const { createAsk } = require('./ask');
const { can, listFor, ROLES } = require('./perms');
const { signJwtHS256 } = require('./auth');

const LOGIN_RE = /^[A-Za-z0-9._@+-]{3,60}$/;
const PHONE_RE = /^\+?\d{7,15}$/;
const ID_RE = /^\d{1,15}$/;
const PERIODS = ['today', 'yesterday', 'week', 'month', 'year', 'all'];
const BIZ_TYPES = ['general', 'pharmacy', 'grocery', 'restaurant', 'saree', 'clothing', 'battery', 'repair', 'salon', 'service'];
const MODES = ['CASH', 'UPI', 'CARD', 'CREDIT'];
const str = (v, max) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null);
const int = (v, min, max) => (Number.isSafeInteger(v) && v >= min && v <= max ? v : null);

function createCoreHandlers({ store, jwtSecret, now = () => new Date(), log = console, opts = {}, ai = null }) {
  const o = { tokenHours: 12, lockAfter: 5, lockMinutes: 15, posMaxDiscountPct: 10, ...opts };
  const fail = (res, code, message) => res.status(code).json({ success: false, message });
  const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { log.error('handler error:', e && e.code ? 'db ' + e.code : (e && e.name) || 'error'); fail(res, 500, 'Something went wrong'); }
  };
  const need = (perm) => (req, res) => (can(req.auth.role, perm) ? true : (fail(res, 403, 'You do not have permission to do this'), false));
  const token = (user) => signJwtHS256({ sub: String(user.id), businessId: user.business_id, role: user.role,
    exp: Math.floor(now().getTime() / 1000) + o.tokenHours * 3600 }, jwtSecret);
  const DUMMY = pw.hash('not-a-real-password-0'); // so unknown logins cost the same time as wrong passwords
  const bizOut = (b) => ({ id: b.id, name: b.name, type: b.biz_type, gstin: b.gstin, upiVpa: b.upi_vpa, invoicePrefix: b.invoice_prefix });

  // POST /auth/signup  - new business + its owner login
  const signup = wrap(async (req, res) => {
    const b = req.body || {};
    const name = str(b.businessName, 120), owner = str(b.ownerName, 80), login = str(b.login, 60);
    if (!name || !owner || !login || !LOGIN_RE.test(login)) return fail(res, 400, 'Business name, your name and a login are required');
    const type = BIZ_TYPES.includes(b.bizType) ? b.bizType : 'general';
    const perr = pw.policyError(b.password); if (perr) return fail(res, 400, perr);
    let r;
    try { r = await store.createBusiness(name, type, owner, login, await pw.hash(b.password)); }
    catch (e) { if (e && e.code === '23505') return fail(res, 409, 'This login is already taken'); throw e; }
    const user = { id: r.userId, business_id: r.businessId, role: 'owner' };
    res.status(201).json({ success: true, token: token(user), user: { id: String(r.userId), name: owner, role: 'owner', permissions: listFor('owner') },
      business: bizOut(await store.getBusiness(r.businessId)) });
  });

  // POST /auth/login
  const login = wrap(async (req, res) => {
    const { login: id, password } = req.body || {};
    if (typeof id !== 'string' || typeof password !== 'string' || id.length > 60 || password.length > 128) return fail(res, 400, 'Enter your login and password');
    const u = await store.getUserByLogin(id);
    if (!u) { await pw.verify(password, await DUMMY); return fail(res, 401, 'Wrong login or password'); }
    if (u.locked_until && new Date(u.locked_until).getTime() > now().getTime()) return fail(res, 429, 'Too many wrong attempts. Try again in a few minutes.');
    const good = await pw.verify(password, u.pw_hash);
    if (!good || !u.active) {
      if (!good) await store.loginFailed(u.id, o.lockAfter, o.lockMinutes);
      return fail(res, good ? 403 : 401, good ? 'This login has been switched off. Ask the owner.' : 'Wrong login or password');
    }
    await store.loginOk(u.id); // this is what "last active" in the staff list shows
    res.status(200).json({ success: true, token: token(u), user: { id: String(u.id), name: u.name, role: u.role, permissions: listFor(u.role) },
      business: bizOut(await store.getBusiness(u.business_id)) });
  });

  // GET /me
  const me = wrap(async (req, res) => {
    const u = await store.getUserById(req.auth.businessId, req.auth.userId);
    res.json({ success: true, user: { id: String(u.id), name: u.name, role: u.role, permissions: listFor(u.role) }, business: bizOut(await store.getBusiness(u.business_id)) });
  });

  // POST /auth/password
  const changePassword = wrap(async (req, res) => {
    const { current, next } = req.body || {};
    const u = await store.getUserById(req.auth.businessId, req.auth.userId);
    if (typeof current !== 'string' || !(await pw.verify(current, u.pw_hash))) return fail(res, 401, 'Current password is wrong');
    const perr = pw.policyError(next); if (perr) return fail(res, 400, perr);
    await store.setPassword(req.auth.businessId, u.id, await pw.hash(next));
    res.json({ success: true });
  });

  // PATCH /business  (owner) - GSTIN, UPI id shown on the payment QR
  const updateBusiness = wrap(async (req, res) => {
    if (!need('payments:configure')(req, res)) return;
    const b = req.body || {};
    const gstin = b.gstin == null ? null : String(b.gstin).toUpperCase();
    if (gstin !== null && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return fail(res, 400, 'Invalid GSTIN');
    if (b.upiVpa != null && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(b.upiVpa)) return fail(res, 400, 'Invalid UPI id');
    await store.updateBusiness(req.auth.businessId, { name: b.name == null ? null : str(b.name, 120), gstin, upiVpa: b.upiVpa });
    res.json({ success: true });
  });

  // GET/PUT /business/report  (owner) - nightly 10 PM WhatsApp report to the owner
  const getReportSettings = wrap(async (req, res) => {
    if (!need('payments:configure')(req, res)) return;
    const r = await store.getNightly(req.auth.businessId);
    res.json({ success: true, ownerWa: r.owner_wa ? '******' + r.owner_wa.slice(-4) : '', on: !!r.nightly_report, lastSent: r.nightly_last ? String(r.nightly_last).slice(0, 10) : null });
  });
  const saveReportSettings = wrap(async (req, res) => {
    if (!need('payments:configure')(req, res)) return;
    const b = req.body || {}; let ownerWa = null;
    if (b.ownerWa != null && b.ownerWa !== '') { const d = String(b.ownerWa).replace(/\D/g, ''); ownerWa = d.length === 10 ? '91' + d : d; if (!/^\d{11,15}$/.test(ownerWa)) return fail(res, 400, 'Enter a valid WhatsApp number'); }
    if (b.on != null && typeof b.on !== 'boolean') return fail(res, 400, 'Invalid setting');
    if (b.on === true && !ownerWa && !(await store.getNightly(req.auth.businessId)).owner_wa) return fail(res, 400, 'Add the owner WhatsApp number first');
    await store.setNightly(req.auth.businessId, { ownerWa, on: b.on ?? null });
    res.json({ success: true });
  });

  // ---- staff (owner only) ----
  const listStaff = wrap(async (req, res) => {
    if (!need('staff:manage')(req, res)) return;
    const rows = await store.listStaff(req.auth.businessId);
    res.json({ success: true, staff: rows.map((r) => ({ id: r.id, login: r.login, name: r.name, role: r.role, active: r.active,
      lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null, billsToday: r.bills_today, totalTodayPaise: r.total_today })) });
  });
  const createStaff = wrap(async (req, res) => {
    if (!need('staff:manage')(req, res)) return;
    const b = req.body || {};
    const name = str(b.name, 80), id = str(b.login, 60);
    if (!name || !id || !LOGIN_RE.test(id) && !PHONE_RE.test(id)) return fail(res, 400, 'Name and login are required');
    if (!ROLES.includes(b.role) || b.role === 'owner') return fail(res, 400, 'Role must be manager, accounts or pos');
    const perr = pw.policyError(b.password); if (perr) return fail(res, 400, perr);
    let r;
    try { r = await store.createStaff(req.auth.businessId, id, name, b.role, await pw.hash(b.password)); }
    catch (e) { if (e && e.code === '23505') return fail(res, 409, 'This login is already taken'); throw e; }
    res.status(201).json({ success: true, id: String(r.id) });
  });
  const updateStaff = wrap(async (req, res) => {
    if (!need('staff:manage')(req, res)) return;
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Not found');
    const t = await store.getUserById(req.auth.businessId, req.params.id);
    if (!t) return fail(res, 404, 'Not found');
    const b = req.body || {};
    if (t.role === 'owner' && (b.role !== undefined || b.active !== undefined)) return fail(res, 400, 'The owner login cannot be changed this way');
    if (b.role !== undefined && (!ROLES.includes(b.role) || b.role === 'owner')) return fail(res, 400, 'Invalid role');
    if (b.active !== undefined && typeof b.active !== 'boolean') return fail(res, 400, 'Invalid value');
    if (b.name !== undefined && !str(b.name, 80)) return fail(res, 400, 'Invalid name');
    await store.updateStaff(req.auth.businessId, t.id, { name: b.name && b.name.trim(), role: b.role, active: b.active });
    if (b.password !== undefined) { const perr = pw.policyError(b.password); if (perr) return fail(res, 400, perr); await store.setPassword(req.auth.businessId, t.id, await pw.hash(b.password)); }
    res.json({ success: true });
  });

  // ---- items ----
  const listItems = wrap(async (req, res) => {
    const q = req.query || {};
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 200, 1), 500);
    const rows = await store.listItems(req.auth.businessId, { q: typeof q.q === 'string' ? q.q.slice(0, 60) : null,
      barcode: typeof q.barcode === 'string' ? q.barcode.slice(0, 40) : null, lowOnly: q.low === '1', limit });
    const cost = can(req.auth.role, 'items:viewCost'), D = 864e5, t = now().getTime();
    res.json({ success: true, items: rows.map((r) => ({ id: r.id, name: r.name, category: r.category, barcode: r.barcode, pricePaise: r.price_paise,
      costPaise: cost ? r.cost_paise : undefined, gstPct: r.gst_pct, trackStock: r.track_stock, minStock: r.min_stock, stock: r.stock,
      oldestLotDays: r.oldest ? Math.floor((t - new Date(r.oldest).getTime()) / D) : null })) });
  });
  const validItem = (b, partial) => {
    const out = {};
    if (!partial || b.name !== undefined) { out.name = str(b.name, 120); if (!out.name) return 'Item name is required'; }
    if (!partial || b.pricePaise !== undefined) { out.pricePaise = int(b.pricePaise, 0, 1e9); if (out.pricePaise === null) return 'Invalid price'; }
    if (b.costPaise !== undefined) { out.costPaise = int(b.costPaise, 0, 1e9); if (out.costPaise === null) return 'Invalid cost'; }
    if (b.gstPct !== undefined) { if (typeof b.gstPct !== 'number' || b.gstPct < 0 || b.gstPct > 28) return 'GST must be 0 to 28'; out.gstPct = b.gstPct; }
    if (b.minStock !== undefined) { out.minStock = int(b.minStock, 0, 1e6); if (out.minStock === null) return 'Invalid minimum stock'; }
    if (b.category !== undefined) { out.category = str(b.category, 60); if (!out.category) return 'Invalid category'; }
    return out;
  };
  const createItem = wrap(async (req, res) => {
    if (!need('items:write')(req, res)) return;
    const b = req.body || {}, v = validItem(b, false);
    if (typeof v === 'string') return fail(res, 400, v);
    if (b.barcode !== undefined && (typeof b.barcode !== 'string' || b.barcode.length > 40)) return fail(res, 400, 'Invalid barcode');
    const item = { ...v, barcode: b.barcode, trackStock: b.trackStock !== false };
    if (b.stock) {
      const qty = int(b.stock.qty, 0, 1e6); if (qty === null) return fail(res, 400, 'Invalid opening stock');
      if (b.stock.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(b.stock.expiry)) return fail(res, 400, 'Invalid expiry date');
      item.stock = { qty, batchNo: b.stock.batchNo && String(b.stock.batchNo).slice(0, 40), expiry: b.stock.expiry };
    }
    let r;
    try { r = await store.createItem(req.auth.businessId, item); }
    catch (e) { if (e && e.code === '23505') return fail(res, 409, 'Another item already has this barcode'); throw e; }
    res.status(201).json({ success: true, id: String(r.id) });
  });
  const updateItem = wrap(async (req, res) => {
    if (!need('items:write')(req, res)) return;
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Not found');
    const b = req.body || {}, v = validItem(b, true);
    if (typeof v === 'string') return fail(res, 400, v);
    if (b.active !== undefined) { if (typeof b.active !== 'boolean') return fail(res, 400, 'Invalid value'); v.active = b.active; }
    const r = await store.updateItem(req.auth.businessId, req.params.id, v);
    if (!r) return fail(res, 404, 'Not found');
    res.json({ success: true });
  });
  const receiveStock = wrap(async (req, res) => {
    if (!need('items:write')(req, res)) return;
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Not found');
    const b = req.body || {}, qty = int(b.qty, 1, 1e6), cost = int(b.costPaise, 0, 1e9);
    if (qty === null || cost === null) return fail(res, 400, 'Quantity and cost per unit are required');
    if (b.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(b.expiry)) return fail(res, 400, 'Invalid expiry date');
    const r = await store.receiveStock(req.auth.businessId, req.params.id, qty, cost, b.batchNo && String(b.batchNo).slice(0, 40), b.expiry);
    if (!r) return fail(res, 404, 'Item not found, or it does not track stock');
    res.status(201).json({ success: true, lotId: String(r.id) });
  });

  // ---- sales ----
  const shapeSale = (s, full) => ({ id: s.id, invoiceNo: s.invoice_no, createdAt: new Date(s.created_at).toISOString(), billedBy: { id: s.user_id, name: s.user_name },
    customer: s.customer_name || s.customer_phone ? { name: s.customer_name, phone: s.customer_phone } : null,
    totalPaise: s.total_paise, payments: s.payments, status: s.status,
    ...(full ? { subtotalPaise: s.subtotal_paise, discountPaise: s.discount_paise, cgstPaise: s.cgst_paise, sgstPaise: s.sgst_paise,
      lines: s.lines.map((l) => ({ name: l.name, qty: l.qty, unitPricePaise: l.unit_price_paise, lineTotalPaise: l.line_total_paise, gstPct: l.gst_pct, taxPaise: l.tax_paise })) } : {}) });

  const createSale = wrap(async (req, res) => {
    if (!need('sales:create')(req, res)) return;
    const b = req.body || {};
    if (!Array.isArray(b.lines) || b.lines.length < 1 || b.lines.length > 200) return fail(res, 400, 'Add at least one item');
    const merged = new Map();
    for (const l of b.lines) {
      const itemId = l && typeof l.itemId === 'string' && ID_RE.test(l.itemId) ? l.itemId : null, qty = l && int(l.qty, 1, 100000);
      if (!itemId || qty === null) return fail(res, 400, 'Each line needs an item and a quantity');
      const price = l.unitPricePaise === undefined ? undefined : int(l.unitPricePaise, 0, 1e9);
      if (price === null) return fail(res, 400, 'Invalid price');
      if (price !== undefined && !can(req.auth.role, 'price:override')) return fail(res, 403, 'You cannot change prices');
      const k = itemId + ':' + (price === undefined ? '' : price), cur = merged.get(k);
      if (cur) cur.qty += qty; else merged.set(k, { itemId, qty, unitPricePaise: price });
    }
    const discount = b.discountPaise === undefined ? 0 : int(b.discountPaise, 0, 1e10);
    if (discount === null) return fail(res, 400, 'Invalid discount');
    const payments = Array.isArray(b.payments) ? b.payments : null;
    if (!payments || !payments.length || payments.length > 4 || payments.some((p) => !p || !MODES.includes(p.mode) || int(p.amountPaise, 1, 1e10) === null)) return fail(res, 400, 'Choose how the customer paid');
    const c = b.customer || {};
    const customer = { name: c.name ? String(c.name).slice(0, 80) : undefined, phone: c.phone ? String(c.phone).slice(0, 15) : undefined };
    if (customer.phone && !PHONE_RE.test(customer.phone)) return fail(res, 400, 'Invalid customer mobile number');
    const payload = { lines: [...merged.values()], discountPaise: discount, payments: payments.map((p) => ({ mode: p.mode, amountPaise: p.amountPaise })), customer };
    if (!can(req.auth.role, 'discount:any')) payload.maxDiscountPct = o.posMaxDiscountPct;
    let sale;
    try { sale = await store.createSale(req.auth.businessId, req.auth.userId, payload); }
    catch (e) {
      if (e && e.code === 'KS409') return fail(res, 409, String(e.message).replace(/^.*?not enough stock/, 'Not enough stock'));
      if (e && e.code === 'KS404') return fail(res, 404, 'One of the items no longer exists');
      if (e && e.code === 'KS001') return fail(res, 400, String(e.message).replace(/^.*?KS001:\s*/, ''));
      throw e;
    }
    res.status(201).json({ success: true, sale });
  });

  const periodOf = (q) => (PERIODS.includes(q) ? q : 'today');
  // GET /sales?period=&q=&staff=&before=&limit=   (cashiers only ever see their own bills)
  const listSales = wrap(async (req, res) => {
    const q = req.query || {}, all = can(req.auth.role, 'sales:viewAll');
    const staff = all && typeof q.staff === 'string' && ID_RE.test(q.staff) ? q.staff : null;
    const rows = await store.listSales(req.auth.businessId, { period: periodOf(q.period), userId: all ? staff : req.auth.userId,
      q: typeof q.q === 'string' && q.q.trim() ? q.q.trim().slice(0, 40) : null, beforeSeq: ID_RE.test(String(q.before)) ? q.before : null,
      limit: Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 100) });
    res.json({ success: true, sales: rows.map((r) => shapeSale(r, false)), nextBefore: rows.length ? String(rows[rows.length - 1].seq) : null });
  });
  const visible = (req, s) => can(req.auth.role, 'sales:viewAll') || String(s.user_id) === String(req.auth.userId);
  // GET /sales/lookup?no=12  or  ?no=INV/000012
  const lookupSale = wrap(async (req, res) => {
    const no = typeof (req.query || {}).no === 'string' ? req.query.no.trim().slice(0, 40) : '';
    if (!no) return fail(res, 400, 'Enter an invoice number');
    const hit = await store.lookupSale(req.auth.businessId, no);
    const s = hit && await store.getSale(req.auth.businessId, hit.id);
    if (!s || !visible(req, s)) return fail(res, 404, 'No invoice matches "' + no + '"');
    res.json({ success: true, sale: shapeSale(s, true) });
  });
  const getSale = wrap(async (req, res) => {
    if (!ID_RE.test(req.params.id)) return fail(res, 404, 'Not found');
    const s = await store.getSale(req.auth.businessId, req.params.id);
    if (!s || !visible(req, s)) return fail(res, 404, 'Not found');
    res.json({ success: true, sale: shapeSale(s, true) });
  });

  // GET /reports/summary?period=&mine=1   (mine=1 is allowed for everyone; the business-wide view needs reports:view)
  const summary = wrap(async (req, res) => {
    const q = req.query || {}, mine = q.mine === '1';
    if (!mine && !need('reports:view')(req, res)) return;
    res.json({ success: true, period: periodOf(q.period), summary: await store.summary(req.auth.businessId, periodOf(q.period), mine ? req.auth.userId : null) });
  });
  // GET /reports/insights
  const insights = wrap(async (req, res) => {
    if (!need('insights:view')(req, res)) return;
    res.json({ success: true, insights: await store.insights(req.auth.businessId) });
  });

  // POST /ask  { question }  -> { answer, intent, data }   (owner, manager, accounts; keyword assistant over this business's data)
  const asker = createAsk({ store });
  const ask = wrap(async (req, res) => {
    if (!need('ask:use')(req, res)) return;
    const q = (req.body || {}).question;
    if (typeof q !== 'string' || q.length > 200) return fail(res, 400, 'Ask a question of up to 200 characters');
    res.json({ success: true, ...(await asker.ask({ businessId: req.auth.businessId, userId: req.auth.userId, role: req.auth.role }, q)) });
  });

  // KIRO AI (see ai.js): POST /ai/ask, GET /ai/status, GET /ai/insights
  const aiAsk = wrap(async (req, res) => {
    if (!ai) return fail(res, 404, 'Not found');
    const q = (req.body || {}).question;
    if (typeof q !== 'string' || !q.trim() || q.length > 200) return fail(res, 400, 'Ask a question of up to 200 characters');
    const r = await ai.ask({ businessId: req.auth.businessId, userId: req.auth.userId, role: req.auth.role }, q);
    res.status(r.code).json(r.body);
  });
  const aiStatus = wrap(async (req, res) => res.json({ success: true, enabled: !!(ai && ai.enabled), analytics: !!ai }));
  const aiInsights = wrap(async (req, res) => {
    if (!ai) return fail(res, 404, 'Not found');
    if (!need('insights:view')(req, res)) return;
    res.json({ success: true, ...(await ai.insights({ businessId: req.auth.businessId, userId: req.auth.userId, role: req.auth.role })) });
  });

  return { signup, login, me, changePassword, updateBusiness, getReportSettings, saveReportSettings, listStaff, createStaff, updateStaff,
    listItems, createItem, updateItem, receiveStock, createSale, listSales, lookupSale, getSale, summary, insights, ask, aiAsk, aiStatus, aiInsights };
}
module.exports = { createCoreHandlers };
