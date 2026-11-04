'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { createNightly, buildReport, toParam } = require('../src/nightly');

const ENV = { WA_TOKEN: 't', WA_PHONE_NUMBER_ID: '123', WA_TEMPLATE: 'daily_report' };
const today = { bills: 3, totalPaise: 1250050, byMode: [{ mode: 'UPI', amountPaise: 800000 }, { mode: 'Cash', amountPaise: 450050 }], topItems: [{ name: 'Para 500', qty: 9 }], cgstPaise: 1000, sgstPaise: 1000, discountPaise: 0 };
const ins = { expiring: [{ expired: false }, { expired: true }], lowStock: [{ name: 'Cough Syrup' }], stuckPaise: 500000 };
function fake({ hour = 22, claim = true } = {}) {
  const st = { claims: 0, releases: 0, sends: [], ai: 0 };
  const store = { nightlyDue: async () => [{ id: 1, name: 'Care Pharmacy', owner_wa: '919811122233', tz: 'Asia/Kolkata', local_hour: hour }],
    nightlyClaim: async () => { st.claims++; return claim ? { id: 1 } : null; }, nightlyRelease: async () => { st.releases++; },
    summary: async () => today, insights: async () => ins };
  return { st, store };
}
const mkFetch = (st, { waStatus = 200, aiText = null } = {}) => async (url, o) => {
  if (url.includes('graph.facebook.com')) { st.sends.push({ url, auth: o.headers.Authorization, body: JSON.parse(o.body) }); return { ok: waStatus < 300, status: waStatus, json: async () => ({}) }; }
  st.ai++; return { ok: aiText != null, status: aiText != null ? 200 : 500, json: async () => ({ choices: [{ message: { content: aiText } }] }) };
};
const quiet = { error() {} };

test('report text has the right numbers', () => {
  const t = buildReport({ name: 'Care Pharmacy', dateLabel: '10 Oct', today, ins }).join('\n');
  assert.match(t, /Sales: ₹12,500\.5 from 3 bills/); assert.match(t, /UPI ₹8,000, Cash ₹4,500\.5/); assert.match(t, /Top sellers: Para 500 x9/); assert.match(t, /GST collected: ₹20/);
  assert.match(t, /Low stock: 1 item \(Cough Syrup\)/); assert.match(t, /1 batch within 90 days, 1 already expired/); assert.match(t, /stuck in dead stock: ₹5,000/);
});
test('template variable has no line breaks and is capped', () => {
  const p = toParam(['a\nb', 'c\t d', 'x'.repeat(2000)]); assert.ok(!/[\n\r\t]/.test(p)); assert.ok(p.length <= 900);
});
test('sends only from 10 PM local time, as a template message to the owner, no AI key -> calculated text', async () => {
  const early = fake({ hour: 21 }); let n = createNightly({ store: early.store, env: ENV, fetchImpl: mkFetch(early.st), log: quiet });
  await n.run(); assert.equal(early.st.sends.length, 0, '21:xx is too early'); assert.equal(early.st.claims, 0);
  const f = fake({ hour: 22 }); n = createNightly({ store: f.store, env: ENV, fetchImpl: mkFetch(f.st), log: quiet });
  const r = await n.run(); assert.deepEqual(r, { 1: 'sent' }); const s = f.st.sends[0];
  assert.match(s.url, /graph\.facebook\.com\/v21\.0\/123\/messages/); assert.equal(s.auth, 'Bearer t'); assert.equal(s.body.to, '919811122233'); assert.equal(s.body.type, 'template');
  assert.equal(s.body.template.name, 'daily_report'); assert.match(s.body.template.components[0].parameters[0].text, /Care Pharmacy - daily report.*Sales: ₹12,500\.5 from 3 bills/); assert.equal(f.st.ai, 0);
});
test('already claimed today -> nothing sent (no double send)', async () => {
  const f = fake({ claim: false }); const n = createNightly({ store: f.store, env: ENV, fetchImpl: mkFetch(f.st), log: quiet });
  assert.deepEqual(await n.run(), { 1: 'already_sent' }); assert.equal(f.st.sends.length, 0);
});
test('WhatsApp failure releases the claim so the next check retries', async () => {
  const f = fake(); const n = createNightly({ store: f.store, env: ENV, fetchImpl: mkFetch(f.st, { waStatus: 401 }), log: quiet });
  assert.deepEqual(await n.run(), { 1: 'failed' }); assert.equal(f.st.releases, 1);
});
test('not configured -> does nothing at all', async () => {
  const f = fake(); const n = createNightly({ store: f.store, env: {}, fetchImpl: mkFetch(f.st), log: quiet });
  assert.deepEqual(await n.run(), { skipped: 'whatsapp_not_configured' }); assert.equal(f.st.claims, 0);
});
test('AI wording used only when every number is in the report; invented number -> calculated text', async () => {
  const AI = { ...ENV, AI_API_KEY: 'k', AI_MODEL: 'm' };
  let f = fake(); let n = createNightly({ store: f.store, env: AI, fetchImpl: mkFetch(f.st, { aiText: 'Good evening! You made ₹12,500.5 from 3 bills today.\nOnly 1 item is low.' }), log: quiet });
  assert.deepEqual(await n.run(), { 1: 'sent_ai' }); assert.match(f.st.sends[0].body.template.components[0].parameters[0].text, /Good evening! You made ₹12,500\.5 from 3 bills today\. \| Only 1 item is low\./);
  f = fake(); n = createNightly({ store: f.store, env: AI, fetchImpl: mkFetch(f.st, { aiText: 'Great! You made ₹99,999 today.' }), log: quiet });
  assert.deepEqual(await n.run(), { 1: 'sent' }); assert.match(f.st.sends[0].body.template.components[0].parameters[0].text, /Sales: ₹12,500\.5 from 3 bills/);
  f = fake(); n = createNightly({ store: f.store, env: AI, fetchImpl: mkFetch(f.st, { aiText: null }), log: quiet });
  assert.deepEqual(await n.run(), { 1: 'sent' }, 'AI down -> still sends the calculated report');
});
