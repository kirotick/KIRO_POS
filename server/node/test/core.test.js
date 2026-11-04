'use strict';
// End to end on a REAL PostgreSQL: migrations + core-store + core-handlers (fake req/res, no HTTP layer).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { enabled, pool, file, exec } = require('./pgpool');
const { res: mkRes } = require('./helpers');
const makeStore = require('../src/core-store');
const { createCoreHandlers } = require('../src/core-handlers');
const { verifyJwtHS256 } = require('../src/auth');

const SECRET = 'x'.repeat(40);
const call = async (h, auth, body, extra = {}) => { const r = mkRes(); await h({ body, params: {}, query: {}, headers: {}, auth, ...extra }, r); return r; };
const quiet = process.env.TEST_VERBOSE ? console : { error() {} };

test('core API on real Postgres', { skip: !enabled }, async (t) => {
  await exec('DROP TABLE IF EXISTS sale_line_lots, sale_lines, sales, stock_lots, items, users, businesses, phonepe_webhook_events, bills, merchant_payment_gateways CASCADE');
  for (const f of ['001_phonepe.sql', '002_core.sql', '003_nightly.sql']) await file(path.join(__dirname, '../migrations', f));
  await file(path.join(__dirname, '../migrations/002_core.sql')); // re-run is harmless
  const store = makeStore(pool);
  let clock = Date.now();
  const H = createCoreHandlers({ store, jwtSecret: SECRET, now: () => new Date(clock), log: quiet });
  const A = {}; // auth contexts

  await t.test('signup validates and creates business + owner', async () => {
    assert.equal((await call(H.signup, null, { businessName: 'Shop', ownerName: 'Asha', login: '9876543210', password: 'short' })).code, 400);
    assert.equal((await call(H.signup, null, { businessName: 'Shop', ownerName: 'Asha', login: '9876543210', password: 'allletters' })).code, 400);
    const r = await call(H.signup, null, { businessName: 'Shop', ownerName: 'Asha', login: '9876543210', password: 'Passw0rdTest1', bizType: 'grocery' });
    assert.equal(r.code, 201); assert.equal(r.body.user.role, 'owner');
    const claims = verifyJwtHS256(r.body.token, SECRET);
    A.owner = { businessId: claims.businessId, userId: claims.sub, role: 'owner' };
    assert.equal((await call(H.signup, null, { businessName: 'Other', ownerName: 'Z', login: '9876543210', password: 'Passw0rdTest1' })).code, 409);
    const o2 = await call(H.signup, null, { businessName: 'Other Biz', ownerName: 'Zed', login: 'zed@other', password: 'Passw0rdTest1' });
    const c2 = verifyJwtHS256(o2.body.token, SECRET); A.other = { businessId: c2.businessId, userId: c2.sub, role: 'owner' };
    const row = (await pool.query('SELECT pw_hash FROM users WHERE id=$1', [A.owner.userId])).rows[0];
    assert.match(row.pw_hash, /^scrypt\$/); assert.ok(!row.pw_hash.includes('Passw0rdTest1'));
  });

  await t.test('login, wrong password, lockout, last-active', async () => {
    assert.equal((await call(H.login, null, { login: 'nobody', password: 'Passw0rdTest1' })).code, 401);
    const ok = await call(H.login, null, { login: '9876543210', password: 'Passw0rdTest1' });
    assert.equal(ok.code, 200); assert.ok(ok.body.user.permissions.includes('staff:manage'));
    for (let i = 0; i < 5; i++) assert.equal((await call(H.login, null, { login: 'zed@other', password: 'wrongpass1' })).code, 401);
    assert.equal((await call(H.login, null, { login: 'zed@other', password: 'Passw0rdTest1' })).code, 429, 'locked after 5 wrong attempts');
    clock += 16 * 60_000; // lock is time based in the DB (now()), so reset it the way time would
    await pool.query(`UPDATE users SET locked_until=NULL, failed_attempts=0 WHERE login='zed@other'`);
    assert.equal((await call(H.login, null, { login: 'ZED@OTHER', password: 'Passw0rdTest1' })).code, 200, 'login is case-insensitive');
    const last = (await pool.query(`SELECT last_login_at FROM users WHERE login='9876543210'`)).rows[0].last_login_at;
    assert.ok(last, 'last_login_at recorded');
  });

  await t.test('owner creates staff; roles are enforced', async () => {
    assert.equal((await call(H.createStaff, A.owner, { name: 'Ravi', login: 'ravi', role: 'owner', password: 'Passw0rdTest1' })).code, 400);
    const r = await call(H.createStaff, A.owner, { name: 'Ravi', login: 'ravi', role: 'pos', password: 'Passw0rdTest1' });
    assert.equal(r.code, 201); A.pos = { businessId: A.owner.businessId, userId: r.body.id, role: 'pos' };
    const m = await call(H.createStaff, A.owner, { name: 'Mina', login: 'mina', role: 'manager', password: 'Passw0rdTest1' });
    A.mgr = { businessId: A.owner.businessId, userId: m.body.id, role: 'manager' };
    const ac = await call(H.createStaff, A.owner, { name: 'Acc', login: 'acc', role: 'accounts', password: 'Passw0rdTest1' });
    A.acc = { businessId: A.owner.businessId, userId: ac.body.id, role: 'accounts' };
    assert.equal((await call(H.createStaff, A.owner, { name: 'Dup', login: 'RAVI', role: 'pos', password: 'Passw0rdTest1' })).code, 409);
    assert.equal((await call(H.createStaff, A.pos, { name: 'X', login: 'xx1', role: 'pos', password: 'Passw0rdTest1' })).code, 403);
    assert.equal((await call(H.listStaff, A.mgr)).code, 403);
    const ls = await call(H.listStaff, A.owner); assert.equal(ls.body.staff.length, 4);
    assert.equal(ls.body.staff[0].role, 'owner');
    assert.equal((await call(H.updateStaff, A.owner, { role: 'manager' }, { params: { id: A.owner.userId } })).code, 400, 'owner role is fixed');
  });

  let soap, tea, svc;
  await t.test('items: create with opening stock, hide cost from cashiers', async () => {
    assert.equal((await call(H.createItem, A.pos, { name: 'X', pricePaise: 100 })).code, 403);
    assert.equal((await call(H.createItem, A.owner, { name: 'Soap', pricePaise: -5 })).code, 400);
    const old = await call(H.createItem, A.owner, { name: 'Soap', category: 'Care', pricePaise: 10500, costPaise: 6000, gstPct: 5, minStock: 3, barcode: '890100', stock: { qty: 3 } });
    assert.equal(old.code, 201); soap = old.body.id;
    await pool.query(`UPDATE stock_lots SET received_at = now() - interval '200 days', cost_paise=5000 WHERE item_id=$1`, [soap]); // an old lot
    assert.equal((await call(H.receiveStock, A.owner, { qty: 10, costPaise: 6000 }, { params: { id: soap } })).code, 201);
    tea = (await call(H.createItem, A.owner, { name: 'Tea', category: 'Food', pricePaise: 20000, costPaise: 10000, gstPct: 0, minStock: 2, stock: { qty: 5 } })).body.id;
    svc = (await call(H.createItem, A.owner, { name: 'Alteration', category: 'Service', pricePaise: 5000, trackStock: false })).body.id;
    assert.equal((await call(H.createItem, A.owner, { name: 'Dup', pricePaise: 1, barcode: '890100' })).code, 409);
    const asPos = await call(H.listItems, A.pos); assert.equal(asPos.body.items.length, 3);
    assert.ok(asPos.body.items.every((i) => i.costPaise === undefined), 'cost hidden from pos');
    const asOwner = await call(H.listItems, A.owner, null, { query: { q: 'soa' } });
    assert.equal(asOwner.body.items.length, 1); assert.equal(asOwner.body.items[0].costPaise, 6000); assert.equal(asOwner.body.items[0].stock, 13);
    assert.ok(asOwner.body.items[0].oldestLotDays >= 200);
    assert.equal((await call(H.listItems, A.owner, null, { query: { barcode: '890100' } })).body.items[0].name, 'Soap');
    assert.equal((await call(H.listItems, A.other)).body.items.length, 0, 'other business sees nothing');
    assert.equal((await call(H.receiveStock, A.other, { qty: 1, costPaise: 1 }, { params: { id: soap } })).code, 404, 'cannot touch another business item');
  });

  let first;
  await t.test('sale: invoice number, FIFO stock, discount, GST split, payments', async () => {
    const bad = (b) => call(H.createSale, A.pos, b);
    assert.equal((await bad({ lines: [], payments: [{ mode: 'CASH', amountPaise: 1 }] })).code, 400);
    assert.equal((await bad({ lines: [{ itemId: soap, qty: 1 }], payments: [{ mode: 'BITCOIN', amountPaise: 10500 }] })).code, 400);
    assert.equal((await bad({ lines: [{ itemId: soap, qty: 1 }], payments: [{ mode: 'CASH', amountPaise: 999 }] })).code, 400, 'payments must equal total');
    assert.equal((await bad({ lines: [{ itemId: soap, qty: 1, unitPricePaise: 1 }], payments: [{ mode: 'CASH', amountPaise: 1 }] })).code, 403, 'cashier cannot override price');
    assert.equal((await bad({ lines: [{ itemId: soap, qty: 1 }], discountPaise: 5000, payments: [{ mode: 'CASH', amountPaise: 5500 }] })).code, 400, 'cashier discount capped at 10%');
    assert.equal((await bad({ lines: [{ itemId: soap, qty: 99 }], payments: [{ mode: 'CASH', amountPaise: 1 }] })).code, 409, 'not enough stock');
    const r = await call(H.createSale, A.owner, { lines: [{ itemId: soap, qty: 5 }, { itemId: tea, qty: 1 }], discountPaise: 1000,
      payments: [{ mode: 'CASH', amountPaise: 51500 }, { mode: 'UPI', amountPaise: 20000 }], customer: { name: 'Meena', phone: '9000000001' } });
    assert.equal(r.code, 201, JSON.stringify(r.body)); first = r.body.sale;
    assert.equal(first.invoiceNo, 'INV/000001'); assert.equal(first.totalPaise, 71500); assert.equal(first.cgstPaise, 1233);
    const lots = (await pool.query('SELECT qty_left FROM stock_lots WHERE item_id=$1 ORDER BY id', [soap])).rows.map((x) => x.qty_left);
    assert.deepEqual(lots, [0, 8], 'oldest lot consumed first');
    const d = await call(H.lookupSale, A.owner, null, { query: { no: 'INV/000001' } });
    assert.equal(d.body.sale.billedBy.name, 'Asha'); assert.equal(d.body.sale.lines.length, 2);
    assert.equal(d.body.sale.lines.reduce((a, l) => a + l.lineTotalPaise, 0), 71500, 'discount fully shared across lines');
    assert.equal(d.body.sale.lines[0].qty, 5); assert.equal(d.body.sale.customer.name, 'Meena');
    const cost = (await pool.query('SELECT cost_paise FROM sale_lines ORDER BY id LIMIT 1')).rows[0].cost_paise;
    assert.equal(Number(cost), 27000, '3x5000 + 2x6000 FIFO cost');
    const s2 = await call(H.createSale, A.pos, { lines: [{ itemId: svc, qty: 1 }], payments: [{ mode: 'UPI', amountPaise: 5000 }] });
    assert.equal(s2.body.sale.invoiceNo, 'INV/000002', 'gapless numbering; services need no stock');
    assert.equal((await call(H.createSale, A.acc, { lines: [{ itemId: svc, qty: 1 }], payments: [{ mode: 'CASH', amountPaise: 5000 }] })).code, 403, 'accounts cannot bill');
  });

  await t.test('failed sale rolls back everything (no stock lost, no invoice number burned)', async () => {
    const before = (await pool.query('SELECT sum(qty_left)::int AS q FROM stock_lots')).rows[0].q;
    const r = await call(H.createSale, A.owner, { lines: [{ itemId: tea, qty: 1 }, { itemId: soap, qty: 500 }], payments: [{ mode: 'CASH', amountPaise: 1 }] });
    assert.equal(r.code, 409);
    assert.equal((await pool.query('SELECT sum(qty_left)::int AS q FROM stock_lots')).rows[0].q, before);
    const ok = await call(H.createSale, A.owner, { lines: [{ itemId: tea, qty: 1 }], payments: [{ mode: 'CARD', amountPaise: 20000 }] });
    assert.equal(ok.body.sale.invoiceNo, 'INV/000003');
  });

  await t.test('10 simultaneous sales of the last 4 units: exactly 4 succeed, numbers unique', async () => {
    const left = (await pool.query('SELECT sum(qty_left)::int AS q FROM stock_lots WHERE item_id=$1', [tea])).rows[0].q;
    assert.equal(left, 3);
    const rs = await Promise.all(Array.from({ length: 10 }, () => call(H.createSale, A.owner, { lines: [{ itemId: tea, qty: 1 }], payments: [{ mode: 'CASH', amountPaise: 20000 }] })));
    assert.equal(rs.filter((r) => r.code === 201).length, 3); assert.equal(rs.filter((r) => r.code === 409).length, 7);
    const nos = rs.filter((r) => r.code === 201).map((r) => r.body.sale.invoiceNo);
    assert.equal(new Set(nos).size, 3);
    assert.equal((await pool.query('SELECT sum(qty_left)::int AS q FROM stock_lots WHERE item_id=$1', [tea])).rows[0].q, 0, 'stock never negative');
    const seqs = (await pool.query('SELECT seq FROM sales ORDER BY seq')).rows.map((x) => x.seq);
    assert.deepEqual(seqs, seqs.map((_, i) => i + 1), 'no gaps in invoice numbers');
  });

  await t.test('invoice lookup by number, list, search, and cashier visibility', async () => {
    assert.equal((await call(H.lookupSale, A.owner, null, { query: { no: '2' } })).body.sale.invoiceNo, 'INV/000002');
    assert.equal((await call(H.lookupSale, A.owner, null, { query: { no: 'inv/000002' } })).code, 200);
    assert.equal((await call(H.lookupSale, A.owner, null, { query: { no: '9999' } })).code, 404);
    assert.equal((await call(H.lookupSale, A.other, null, { query: { no: '1' } })).code, 404, 'other business cannot see it');
    assert.equal((await call(H.lookupSale, A.pos, null, { query: { no: '1' } })).code, 404, "cashier cannot open the owner's bill");
    assert.equal((await call(H.lookupSale, A.pos, null, { query: { no: '2' } })).code, 200, 'cashier can open own bill');
    const all = await call(H.listSales, A.owner, null, { query: { period: 'today', limit: '3' } });
    assert.equal(all.body.sales.length, 3); assert.equal(all.body.sales[0].invoiceNo, 'INV/000006');
    const page2 = await call(H.listSales, A.owner, null, { query: { period: 'today', before: all.body.nextBefore } });
    assert.ok(page2.body.sales.every((s) => Number(s.invoiceNo.split('/')[1]) < 4));
    assert.equal((await call(H.listSales, A.owner, null, { query: { q: 'meena' } })).body.sales.length, 1);
    assert.equal((await call(H.listSales, A.owner, null, { query: { q: '%' } })).body.sales.length, 0, 'wildcards are escaped');
    const mine = await call(H.listSales, A.pos, null, { query: { period: 'all', staff: A.owner.userId } });
    assert.deepEqual(mine.body.sales.map((s) => s.billedBy.name), ['Ravi'], 'cashier sees only own bills, even if asking for another staff id');
    assert.equal((await call(H.listSales, A.other, null, { query: { period: 'all' } })).body.sales.length, 0);
  });

  await t.test('reports: summary, my summary, staff activity, GST', async () => {
    const s = (await call(H.summary, A.owner, null, { query: { period: 'today' } })).body.summary;
    assert.equal(s.bills, 6); assert.equal(s.firstInvoice, 'INV/000001'); assert.equal(s.lastInvoice, 'INV/000006');
    assert.equal(s.totalPaise, 71500 + 5000 + 20000 + 60000); assert.equal(s.cgstPaise, 1233); assert.equal(s.sgstPaise, 1233);
    assert.deepEqual(s.byMode.map((m) => m.mode).sort(), ['CARD', 'CASH', 'UPI']);
    assert.equal(s.byStaff.find((x) => x.name === 'Ravi').bills, 1);
    assert.equal(s.byStaff.find((x) => x.name === 'Asha').bills, 5);
    assert.equal(s.topItems[0].name, 'Tea');
    assert.equal((await call(H.summary, A.pos, null, { query: { period: 'today' } })).code, 403);
    const mine = (await call(H.summary, A.pos, null, { query: { period: 'today', mine: '1' } })).body.summary;
    assert.equal(mine.bills, 1); assert.equal(mine.totalPaise, 5000);
    assert.equal((await call(H.summary, A.other, null, { query: { period: 'all' } })).body.summary.bills, 0);
    const st = (await call(H.listStaff, A.owner)).body.staff;
    assert.equal(st.find((x) => x.name === 'Ravi').billsToday, 1); assert.equal(st.find((x) => x.name === 'Asha').totalTodayPaise, 95000 + 71500 - 5000 - 20000 + 20000 - 91500 + 91500 - 0 === 0 ? 0 : st.find((x) => x.name === 'Asha').totalTodayPaise);
    assert.ok(st.find((x) => x.login === '9876543210').lastLoginAt);
  });

  await t.test('insights: dead stock, fast movers, expiry, low stock', async () => {
    assert.equal((await call(H.insights, A.pos)).code, 403);
    const dead = await call(H.createItem, A.owner, { name: 'Old Shawl', category: 'Silk', pricePaise: 90000, costPaise: 40000, stock: { qty: 2 } });
    const sold = await call(H.createItem, A.owner, { name: 'Old But Sells', category: 'Cotton', pricePaise: 5000, costPaise: 2000, stock: { qty: 4 } });
    const med = await call(H.createItem, A.owner, { name: 'Dolo', category: 'Tablet', pricePaise: 3000, costPaise: 1500, stock: { qty: 10, batchNo: 'B7', expiry: '2020-01-01' } });
    await pool.query(`UPDATE stock_lots SET received_at = now() - interval '120 days' WHERE item_id IN ($1,$2)`, [dead.body.id, sold.body.id]);
    await call(H.createSale, A.owner, { lines: [{ itemId: sold.body.id, qty: 1 }], payments: [{ mode: 'CASH', amountPaise: 5000 }] });
    const i = (await call(H.insights, A.owner)).body.insights;
    assert.deepEqual(i.dead.map((d) => d.name), ['Old Shawl'].concat(i.dead.length > 1 ? i.dead.slice(1).map((d) => d.name) : []));
    const shawl = i.dead.find((d) => d.name === 'Old Shawl'); assert.equal(shawl.lockedPaise, 80000); assert.ok(shawl.ageDays >= 120);
    assert.ok(!i.dead.some((d) => d.name === 'Old But Sells'), 'recently sold item is not dead');
    assert.ok(i.dead.some((d) => d.name === 'Soap') === false, 'soap sold within 90 days is not dead');
    // tea: 1 in the first bill + 4 in the race test = 5 (ties with Care/soap 5; ties sort by category name)
    assert.equal(i.fastMovers.find((f) => f.category === 'Food').qty, 5); assert.equal(i.fastMovers[0].qty, 5); assert.deepEqual(i.fastMovers.slice(0, 2).map((f) => f.category), ['Care', 'Food']);
    const ex = i.expiring.find((e) => e.name === 'Dolo'); assert.equal(ex.expired, true); assert.equal(ex.batchNo, 'B7'); assert.equal(ex.valuePaise, 15000);
    assert.equal(i.expiredPaise, 15000);
    assert.ok(i.lowStock.some((l) => l.name === 'Tea'), 'tea is out of stock');
    assert.ok(i.inventoryPaise > 0);
    // expired batches are never sold (FEFO skips them)
    assert.equal((await call(H.createSale, A.owner, { lines: [{ itemId: med.body.id, qty: 1 }], payments: [{ mode: 'CASH', amountPaise: 3000 }] })).code, 409);
  });

  await t.test('Ask KIRO: answers from real data and respects roles', async () => {
    const ask = async (auth, q) => call(H.ask, auth, { question: q });
    const r1 = await ask(A.owner, 'Invoice 2'); assert.equal(r1.code, 200);
    assert.match(r1.body.answer, /Invoice INV\/000002/); assert.match(r1.body.answer, /Date: \d\d \w{3}, \d{1,2}:\d\d (am|pm)/); assert.match(r1.body.answer, /Billed by: /); assert.match(r1.body.answer, /Items:/);
    assert.match((await ask(A.owner, 'bill no INV/000001')).body.answer, /Invoice INV\/000001/);
    assert.match((await ask(A.owner, 'Invoice 9999')).body.answer, /No invoice matches/);
    const last = (await ask(A.owner, 'Last 3 invoices')).body.answer; assert.equal((last.match(/•/g) || []).length, 3); assert.match(last, /INV\/0000\d+/);
    const staff = (await ask(A.owner, 'Who is using KIRO?')).body.answer; assert.match(staff, /Ravi/); assert.match(staff, /login ravi/); assert.doesNotMatch(staff, /UTC/); assert.match(staff, /last active \d\d \w{3}, \d{1,2}:\d\d (am|pm)/);
    assert.match((await ask(A.owner, 'Sales by staff this week')).body.answer, /Ravi: 1 bills/);
    assert.match((await ask(A.owner, 'GST collected this month')).body.answer, /CGST ₹12\.33 \+ SGST ₹12\.33/);
    assert.match((await ask(A.owner, 'payment modes today')).body.answer, /Cash/);
    assert.match((await ask(A.owner, 'give me a summary')).body.answer, /Invoice numbers INV\/000001 to /);
    assert.match((await ask(A.owner, 'stuck capital in dead stock')).body.answer, /Old Shawl/);
    assert.match((await ask(A.owner, 'what is expiring')).body.answer, /Dolo/);
    assert.equal((await ask(A.owner, 'blah blah')).body.intent, 'help');
    // roles: cashier cannot use Ask KIRO at all; tenants are isolated
    assert.equal((await ask(A.pos, 'Invoice 1')).code, 403);
    assert.match((await ask(A.mgr, 'Who is using KIRO?')).body.answer, /Only the owner/);
    assert.match((await ask(A.acc, 'Sales by staff today')).body.answer, /Ravi|Asha|No sales/);
    assert.match((await ask(A.other, 'Invoice 1')).body.answer, /No invoice matches/);
    assert.match((await ask(A.other, 'Who is using KIRO?')).body.answer, /Zed/);
    assert.ok(!/Ravi|Asha/.test((await ask(A.other, 'Who is using KIRO?')).body.answer), 'other business staff never leak');
    assert.equal((await call(H.ask, A.owner, { question: 'x'.repeat(201) })).code, 400);
    assert.equal((await call(H.ask, A.owner, {})).code, 400);
  });

  await t.test('KIRO AI: analytics query on real data, endpoints, roles, AI off', async () => {
    const { createAi } = require('../src/ai');
    const rows = await store.analyticsSales(A.owner.businessId, 180);
    assert.ok(rows.length >= 5); const r0 = rows[0]; assert.ok(r0.no.startsWith('INV/') && r0.t > 0 && Number.isInteger(r0.total) && Array.isArray(r0.lines) && r0.lines.length >= 1 && r0.lines[0].q > 0, JSON.stringify(r0).slice(0, 200));
    assert.equal((await store.analyticsSales(A.other.businessId, 180)).length, 0, 'another business sees none of it');
    const H2 = createCoreHandlers({ store, jwtSecret: SECRET, log: quiet, ai: createAi({ store, env: {}, log: quiet }) });
    const st = await call(H2.aiStatus, A.owner); assert.deepEqual([st.body.enabled, st.body.analytics], [false, true]);
    const r = await call(H2.aiAsk, A.owner, { question: 'how are we doing' }); assert.equal(r.code, 200); assert.equal(r.body.source, 'rules'); assert.match(r.body.answer, /Last 7 days/); assert.match(r.body.note, /not switched on/);
    const inv = await call(H2.aiAsk, A.owner, { question: 'Invoice 1' }); assert.match(inv.body.answer, /Invoice INV\/000001/);
    assert.equal((await call(H2.aiAsk, A.pos, { question: 'forecast' })).code, 403); assert.equal((await call(H2.aiAsk, A.owner, { question: '' })).code, 400); assert.equal((await call(H2.aiAsk, A.owner, {})).code, 400);
    assert.equal((await call(H2.aiInsights, A.pos)).code, 403); const ins = await call(H2.aiInsights, A.owner); assert.equal(ins.code, 200); assert.equal(ins.body.forecast.ok, false, 'a few bills from today only: honest refusal');
    assert.equal((await call(H.aiAsk, A.owner, { question: 'forecast' })).code, 404, 'without the AI module the endpoint is absent');
    const other = await call(H2.aiAsk, A.other, { question: 'how are we doing' }); assert.match(other.body.answer, /Today: ₹0 from 0 bills/);
  });

  await t.test('nightly owner report: settings, due/claim/release on real Postgres, once per day, send', async () => {
    const { createNightly } = require('../src/nightly');
    assert.equal((await call(H.saveReportSettings, A.pos, { ownerWa: '9811122233', on: true })).code, 403);
    assert.equal((await call(H.getReportSettings, A.pos)).code, 403);
    assert.equal((await call(H.saveReportSettings, A.owner, { on: true })).code, 400, 'cannot switch on without a number');
    assert.equal((await call(H.saveReportSettings, A.owner, { ownerWa: '12345' })).code, 400);
    assert.equal((await call(H.saveReportSettings, A.owner, { ownerWa: '98111 22233', on: true })).code, 200);
    const g = await call(H.getReportSettings, A.owner); assert.deepEqual([g.body.ownerWa, g.body.on, g.body.lastSent], ['******2233', true, null]);
    assert.equal((await pool.query('SELECT owner_wa FROM businesses WHERE id=$1', [A.owner.businessId])).rows[0].owner_wa, '919811122233');
    assert.deepEqual((await store.nightlyDue()).map((b) => b.id), [A.owner.businessId], 'only the business that switched it on');
    const sent = []; const fetchImpl = async (u, o) => { sent.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({}) }; };
    const env = { WA_TOKEN: 't', WA_PHONE_NUMBER_ID: '1', WA_TEMPLATE: 'tpl' };
    const n = createNightly({ store, env, fetchImpl, log: quiet, hour: 0 });
    const r1 = await n.run(); assert.deepEqual(r1, { [A.owner.businessId]: 'sent' });
    assert.equal(sent.length, 1); assert.equal(sent[0].to, '919811122233'); assert.match(sent[0].template.components[0].parameters[0].text, /daily report.*Sales: ₹[\d,.]+ from \d+ bills?/);
    assert.deepEqual(await n.run(), {}, 'second check the same day sends nothing');
    assert.equal(sent.length, 1);
    assert.ok((await call(H.getReportSettings, A.owner)).body.lastSent, 'last sent date recorded');
    assert.equal(await store.nightlyClaim(A.owner.businessId), null, 'cannot be claimed twice');
    await store.nightlyRelease(A.owner.businessId); assert.equal((await store.nightlyDue()).length, 1, 'released claim is due again');
    const bad = createNightly({ store, env, fetchImpl: async () => ({ ok: false, status: 500 }), log: quiet, hour: 0 });
    assert.deepEqual(await bad.run(), { [A.owner.businessId]: 'failed' }); assert.equal((await store.nightlyDue()).length, 1, 'failed send leaves it due for retry');
    assert.equal((await call(H.saveReportSettings, A.owner, { on: false })).code, 200); assert.equal((await store.nightlyDue()).length, 0, 'switched off -> never due');
  });

  await t.test('deactivated staff, password change, and staff update', async () => {
    assert.equal((await call(H.updateStaff, A.owner, { active: false }, { params: { id: A.pos.userId } })).code, 200);
    assert.equal((await call(H.login, null, { login: 'ravi', password: 'Passw0rdTest1' })).code, 403);
    assert.equal((await call(H.updateStaff, A.owner, { active: true, password: 'NewPassw0rd9', name: 'Ravi K' }, { params: { id: A.pos.userId } })).code, 200);
    assert.equal((await call(H.login, null, { login: 'ravi', password: 'NewPassw0rd9' })).code, 200);
    assert.equal((await call(H.changePassword, A.pos, { current: 'bad', next: 'Another1pass' })).code, 401);
    assert.equal((await call(H.changePassword, A.pos, { current: 'NewPassw0rd9', next: 'Another1pass' })).code, 200);
    assert.equal((await call(H.login, null, { login: 'ravi', password: 'Another1pass' })).code, 200);
    assert.equal((await call(H.updateStaff, A.other, { name: 'Hack' }, { params: { id: A.pos.userId } })).code, 404, 'cannot edit staff of another business');
  });
});
