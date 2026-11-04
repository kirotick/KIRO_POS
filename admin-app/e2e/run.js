'use strict';
// App end-to-end: the real app screens (bundled with DOM stand-ins) in headless Chromium -> real HTTP -> real handlers -> real PostgreSQL.
// Needs TEST_PG_HOST / TEST_PG_PORT / TEST_PG_DB (empty database). Usage: node e2e/run.js
const path = require('path'); const { execSync } = require('child_process');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const { start, SRV } = require('./http-adapter');
const { pool, file, exec, enabled } = require(path.join(SRV, 'test/pgpool'));
if (!enabled) { console.log('Set TEST_PG_HOST/PORT/DB'); process.exit(2); }
const fail = []; const ok = (c, m) => { if (!c) { fail.push(m); console.log('FAIL', m); } else console.log('ok  ', m); };
const SECRET = 'x'.repeat(40), PORT = 4777;
(async () => {
  execSync('node build.js', { cwd: __dirname, stdio: 'inherit' });
  await exec('DROP TABLE IF EXISTS sale_line_lots, sale_lines, sales, stock_lots, items, users, businesses, phonepe_webhook_events, bills, merchant_payment_gateways CASCADE');
  for (const f of ['001_phonepe.sql', '002_core.sql']) await file(path.join(SRV, 'migrations', f));
  // KIRO AI with a stand-in provider (no internet in tests): it rewords the numbers it is given, except when the question says WEIRD, when it invents one.
  const { createAi } = require(path.join(SRV, 'src/ai')); const coreStore = require(path.join(SRV, 'src/core-store'))(pool);
  const stub = async (url, o) => { const b = JSON.parse(o.body), user = b.messages[1].content, f = JSON.parse(user.split('DATA:\n')[1].split('\n\nQUESTION')[0]); global.__aiBody = o.body;
    const text = /WEIRD/.test(user) ? 'Sales will hit ₹98,765 tomorrow.' : `So far today you have sold ₹${f.sales.today.total} from ${f.sales.today.bills} bills.`; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) }; };
  const ai = createAi({ store: coreStore, env: { AI_API_KEY: 'k', AI_MODEL: 'm' }, fetchImpl: stub, log: { error() {} } });
  const srv = await start({ ai, pool, secret: SECRET, port: PORT, root: __dirname, html: '<!doctype html><meta name=viewport content="width=device-width"><body style="margin:0;height:100vh"><div id="root" style="height:100vh"></div><script src="/app.js"></script>' });
  // ---- seed through the real handlers ----
  const { verifyJwtHS256 } = require(path.join(SRV, 'src/auth'));
  const call = async (h, auth, body, extra = {}) => { const r = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } }; await h({ body, params: {}, query: {}, headers: {}, auth, ...extra }, r); return r; };
  const su = await call(srv.core.signup, null, { businessName: 'Lakshmi Stores', ownerName: 'Asha', login: '9876543210', password: 'Passw0rdTest1', bizType: 'grocery' });
  const cl = verifyJwtHS256(su.body.token, SECRET), O = { businessId: cl.businessId, userId: cl.sub, role: 'owner' };
  for (const [n, l, r] of [['Ravi', 'ravi', 'pos'], ['Mina', 'mina', 'manager'], ['Acc', 'acc', 'accounts']]) await call(srv.core.createStaff, O, { name: n, login: l, role: r, password: 'Passw0rdTest1' });
  const login = async (l) => { const r = await call(srv.core.login, null, { login: l, password: 'Passw0rdTest1' }); const c = verifyJwtHS256(r.body.token, SECRET); return { businessId: c.businessId, userId: c.sub, role: c.role }; };
  const R = await login('ravi');
  const item = async (name, cat, price, cost, qty, extra = {}) => (await call(srv.core.createItem, O, { name, category: cat, pricePaise: price, costPaise: cost, gstPct: 5, stock: { qty }, ...extra })).body.id;
  const soap = await item('Soap', 'Care', 10000, 6000, 20), tea = await item('Tea', 'Food', 5000, 3000, 20), shawl = await item('Old Shawl', 'Silk', 90000, 40000, 2);
  await pool.query(`UPDATE stock_lots SET received_at = now() - interval '120 days' WHERE item_id = $1`, [shawl]);
  const sale = (a, lines, pay, cust) => call(srv.core.createSale, a, { lines, payments: pay, customer: cust });
  ok((await sale(O, [{ itemId: soap, qty: 2 }], [{ mode: 'CASH', amountPaise: 20000 }], { name: 'Meena', phone: '9000000001' })).code === 201, 'seed bill 1');
  ok((await sale(R, [{ itemId: tea, qty: 3 }], [{ mode: 'UPI', amountPaise: 15000 }])).code === 201, 'seed bill 2');
  ok((await sale(R, [{ itemId: tea, qty: 1 }], [{ mode: 'CASH', amountPaise: 5000 }])).code === 201, 'seed bill 3');

  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 780 } });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const T = (id) => pg.locator(`[data-testid="${id}"]`);
  const txt = () => pg.evaluate(() => document.body.innerText);
  const signIn = async (l, p = 'Passw0rdTest1') => { await T('login').fill(l); await T('password').fill(p); await T('loginGo').click(); };
  const signOut = async () => { await T('tab-more').click(); await T('signOut').click(); await T('login').waitFor(); };
  await pg.goto(`http://127.0.0.1:${PORT}/`); await T('login').waitFor();

  // ---- login ----
  await signIn('ravi', 'wrong'); await T('loginErr').waitFor(); ok(/Wrong login or password/.test(await txt()), 'wrong password shows the server message');
  await T('password').fill(''); await T('loginGo').click(); ok(/Enter your login and password/.test(await txt()), 'empty password is caught on the phone');
  await T('login').fill('9876543210'); await T('password').fill('Passw0rdTest1'); await T('loginGo').click(); await pg.waitForSelector('[data-testid="tab-home"]');

  // ---- owner: home ----
  await pg.waitForFunction(() => /Lakshmi Stores/.test(document.body.innerText) && /₹400/.test(document.body.innerText)); let t = await txt();
  if (process.env.SHOTS) await pg.screenshot({ path: process.env.SHOTS + '/home.png' });
  ok(/Lakshmi Stores/.test(t) && /Hello Asha/.test(t), 'home shows business and user');
  ok(/₹400/.test(t) && /3 bills/.test(t) && /INV\/000001 → INV\/000003/.test(t), 'home: sales ₹400 from 3 bills, invoice range'); ok(/Average bill/.test(t) && /₹133\.33/.test(t), 'average bill');
  ok(/Cash/.test(t) && /Upi/.test(t) && /Ravi/.test(t) && /Asha/.test(t), 'payment modes and sales by staff'); ok(/GST included/.test(t), 'owner sees GST');
  const tabs = await pg.$$eval('[data-testid^="tab-"]', (e) => e.map((x) => x.dataset.testid)); ok(JSON.stringify(tabs) === JSON.stringify(['tab-home', 'tab-sales', 'tab-stock', 'tab-ask', 'tab-staff', 'tab-more']), 'owner tabs: ' + tabs);

  // ---- sales + invoice ----
  await T('tab-sales').click(); await T('sale-INV/000002').waitFor(); t = await txt();
  ok(/INV\/000001/.test(t) && /INV\/000003/.test(t) && /Ravi/.test(t) && /Meena/.test(t), 'sales list shows invoices, staff, customer');
  await T('salesSearch').fill('000002'); await T('salesGo').click(); await pg.waitForFunction(() => !/INV\/000001/.test(document.body.innerText) && /INV\/000002/.test(document.body.innerText)); ok(true, 'search by invoice number narrows the list');
  await T('salesSearch').fill('Meena'); await T('salesGo').click(); await T('sale-INV/000001').waitFor(); ok(!/INV\/000002/.test(await txt()), 'search by customer');
  await T('sale-INV/000001').click(); await pg.waitForFunction(() => /Items/.test(document.body.innerText) && /Billed by/.test(document.body.innerText)); t = await txt();
  ok(/Soap/.test(t) && /2 × ₹100/.test(t) && /₹200/.test(t) && /Meena · 9000000001/.test(t) && /Paid by Cash/.test(t) && /CGST/.test(t), 'invoice detail');
  await T('back').click(); await T('sale-INV/000001').waitFor(); ok(true, 'back returns to the list');

  // ---- stock ----
  await T('tab-stock').click(); await pg.waitForFunction(() => /Dead stock/.test(document.body.innerText) && /Old Shawl/.test(document.body.innerText)); t = await txt();
  ok(/₹800/.test(t) && /Old Shawl/.test(t) && /120 days old/.test(t), 'stock: dead stock ₹800 (2 × ₹400) and age'); ok(/Fast movers/.test(t) && /Food/.test(t), 'fast movers');

  // ---- staff ----
  await T('tab-staff').click(); await T('staff-ravi').waitFor(); t = await txt();
  ok(/Ravi/.test(t) && /login ravi/.test(t) && /POS cashier/.test(t) && /2 · ₹200/.test(t), 'staff: Ravi login, role, 2 bills ₹200 today'); ok(/Asha/.test(t) && /last active just now|last active \d+ min ago/.test(t), 'last active shown');

  // ---- Ask KIRO ----
  await T('tab-ask').click(); await T('askIn').fill('Invoice 2'); await T('askGo').click(); await pg.waitForFunction(() => /Billed by: Ravi/.test(document.body.innerText)); t = await txt();
  ok(/Invoice INV\/000002/.test(t) && /Tea × 3 = ₹150/.test(t), 'ask: invoice 2 answer');
  await pg.getByText('Who is using KIRO?', { exact: true }).click(); await pg.waitForFunction(() => /login ravi/.test(document.body.innerText)); ok(true, 'ask: who is using chip');
  await pg.getByText('Sales by staff this week', { exact: true }).click(); await pg.waitForFunction(() => /Ravi: 2 bills, ₹200/.test(document.body.innerText)); ok(true, 'ask: sales by staff');
  await T('askIn').fill('Give me a summary'); await T('askIn').press('Enter'); await pg.waitForFunction(() => /Top biller/.test(document.body.innerText)); ok(true, 'ask: Enter key sends, summary');
  if (process.env.SHOTS) await pg.screenshot({ path: process.env.SHOTS + '/ask.png' });
  ok((await T('myMsg').count()) === 4, 'four questions shown');

  // ---- KIRO AI inside Ask KIRO ----
  await pg.getByText('Forecast next week', { exact: true }).click(); await pg.waitForFunction(() => /So far today you have sold ₹400 from 3 bills/.test(document.body.innerText)); t = await txt();
  ok(/AI wording · numbers checked against your data/.test(t), 'ask: AI-worded answer is labelled'); ok(!/Cust|9000000001|Meena|INV\//.test(global.__aiBody), 'ask: nothing identifying was sent to the AI provider');
  await T('askIn').fill('forecast WEIRD'); await T('askGo').click(); await pg.waitForFunction(() => /AI wording was rejected/.test(document.body.innerText)); t = await txt();
  ok(!/98,765/.test(t) && /at least 28 days of sales history/.test(t), 'ask: an answer with an invented number is replaced by the calculated one (honest refusal with 3 days of data)');
  // ---- sign out, roles ----
  await signOut(); ok(/Sign in/.test(await txt()), 'sign out returns to login');
  const tabsFor = async (l) => { await signIn(l); await pg.waitForSelector('[data-testid="tab-home"]'); const x = await pg.$$eval('[data-testid^="tab-"]', (e) => e.map((y) => y.dataset.testid.slice(4))); return x; };
  let x = await tabsFor('mina'); ok(x.join() === 'home,sales,stock,ask,more', 'manager tabs (no Staff): ' + x); await pg.waitForFunction(() => /₹400/.test(document.body.innerText)); await signOut();
  x = await tabsFor('acc'); ok(x.join() === 'home,sales,stock,ask,more', 'accounts tabs: ' + x); await signOut();
  x = await tabsFor('ravi'); ok(x.join() === 'home,more', 'cashier sees only Home and More: ' + x);
  await pg.waitForFunction(() => /₹200/.test(document.body.innerText)); t = await txt(); ok(/2 bills/.test(t) && !/Sales by staff/.test(t) && !/GST included/.test(t), 'cashier home shows only their own sales (₹200, 2 bills), no staff or GST');
  await signOut();

  // ---- expired / switched-off session returns to login ----
  await signIn('9876543210'); await pg.waitForSelector('[data-testid="tab-home"]');
  await pg.evaluate(() => { for (const k of Object.keys(localStorage)) { const v = JSON.parse(localStorage.getItem(k)); v.token = v.token.slice(0, -3) + 'abc'; localStorage.setItem(k, JSON.stringify(v)); } });
  await pg.reload(); await T('login').waitFor({ timeout: 5000 }); ok(true, 'a stored token that no longer verifies sends the app back to login');
  await call(srv.core.updateStaff, O, { active: false }, { params: { id: R.userId } });
  await signIn('ravi', 'Passw0rdTest1'); await pg.waitForFunction(() => /switched off/.test(document.body.innerText)); ok(true, 'switched-off login shows the owner message');
  // session survives a reload
  await T('login').fill('9876543210'); await T('password').fill('Passw0rdTest1'); await T('loginGo').click(); await pg.waitForSelector('[data-testid="tab-home"]'); await pg.reload(); await pg.waitForSelector('[data-testid="tab-home"]'); ok(true, 'session restored after reload');
  ok(errs.filter((e) => !/401|Failed to load resource/.test(e)).length === 0, 'no page errors: ' + errs.join(' | '));
  await br.close(); srv.server.close();
  console.log(fail.length ? 'FAILED ' + fail.length : 'ALL OK'); process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
