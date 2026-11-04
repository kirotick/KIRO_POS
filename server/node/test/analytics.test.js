'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const KA = require('../src/analytics');
const OFF = 330, NOW = Date.UTC(2026, 9, 10, 6, 0, 0);           // Sat 10 Oct 2026, 11:30 IST
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const DAY = 864e5, at = (daysAgo, hour, min = 0) => { const d = Math.floor((NOW + OFF * 6e4) / DAY) - daysAgo; return d * DAY + hour * 36e5 + min * 6e4 - OFF * 6e4; };
// 120 days: weekly pattern (weekend strong, Tuesday weak) and a gentle upward trend, plus noise
const WEEK = [1.5, 0.9, 0.6, 0.8, 0.9, 1.0, 1.4]; // Sun..Sat
function gen(days, { trend = 0.004, noise = 0.06, seed = 7, perDay = 12000 } = {}) {
  const r = rng(seed), sales = []; let n = 0;
  for (let ago = days; ago >= 1; ago--) { const d = Math.floor((NOW + OFF * 6e4) / DAY) - ago, dw = (((d + 4) % 7) + 7) % 7, target = perDay * WEEK[dw] * (1 + trend * (days - ago)) * (1 + (r() - 0.5) * 2 * noise), k = 8 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) sales.push({ no: 'INV/' + String(++n).padStart(6, '0'), t: at(ago, 10 + i, Math.floor(r() * 50)), by: i % 2 ? 'Ravi' : 'Asha', cust: '', total: Math.round(target / k * (0.8 + r() * 0.4)), disc: 0, lines: [{ id: 1, n: 'Rice', cat: 'Grocery', q: 1, a: 100, c: 70 }] }); }
  return sales;
}
test('daily: local-day buckets, zero days kept, today excluded, leading empty days trimmed', () => {
  const s = [{ no: '1', t: at(3, 12), by: 'a', total: 100, disc: 0, lines: [] }, { no: '2', t: at(3, 13), by: 'a', total: 50, disc: 0, lines: [] }, { no: '3', t: at(1, 9), by: 'a', total: 70, disc: 0, lines: [] }, { no: '4', t: at(0, 9), by: 'a', total: 999, disc: 0, lines: [] }];
  const d = KA.daily(s, { now: NOW, off: OFF, days: 10 }); assert.equal(d.length, 3, 'starts at first sale, ends yesterday'); assert.deepEqual(d.map((x) => x.total), [150, 0, 70]); assert.deepEqual(d.map((x) => x.bills), [2, 0, 1]);
  assert.equal(d[2].date, '2026-10-09'); assert.equal(d[2].dow, 5, '9 Oct 2026 is a Friday');
  const late = [{ no: 'x', t: Date.UTC(2026, 9, 8, 19, 0, 0), by: 'a', total: 5, disc: 0, lines: [] }]; // 19:00 UTC = 00:30 IST on the 9th
  assert.equal(KA.daily(late, { now: NOW, off: OFF, days: 5 })[0].date, '2026-10-09', 'a bill just after midnight IST belongs to the next local day');
});
test('forecast: recovers weekday pattern and trend, and beats "same day last week"', () => {
  const sales = gen(120), f = KA.forecast(KA.daily(sales, { now: NOW, off: OFF }), { horizon: 7 }); assert.ok(f.ok); assert.equal(f.horizon.length, 7);
  assert.equal(f.horizon[0].date, '2026-10-10', 'first forecast day is today');
  const truth = (ago) => { const d = Math.floor((NOW + OFF * 6e4) / DAY) - ago, dw = (((d + 4) % 7) + 7) % 7; return 12000 * WEEK[dw] * (1 + 0.004 * (120 - ago)); };
  f.horizon.forEach((h, i) => { const t = truth(-i); assert.ok(Math.abs(h.pred - t) / t < 0.12, `day ${i}: ${h.pred} vs ${Math.round(t)}`); assert.ok(h.lo <= h.pred && h.pred <= h.hi); });
  assert.ok(f.backtest.beatsNaive, JSON.stringify(f.backtest)); assert.ok(f.backtest.wape < 0.1, 'backtest WAPE ' + f.backtest.wape); assert.equal(f.backtest.days, 14);
  assert.ok(f.weekdayIndex[0] > f.weekdayIndex[2], 'Sunday above Tuesday');
});
test('forecast refuses with too little history, and with no sales', () => {
  const f = KA.forecast(KA.daily(gen(20), { now: NOW, off: OFF }), {}); assert.equal(f.ok, false); assert.match(f.reason, /at least 28 days/);
  assert.equal(KA.forecast([], {}).ok, false);
});
test('forecast is not fooled by one huge day (robust trend)', () => {
  const s = gen(100); s.push({ no: 'big', t: at(30, 12), by: 'a', total: 5000000, disc: 0, lines: [] });
  const a = KA.forecast(KA.daily(gen(100), { now: NOW, off: OFF })), b = KA.forecast(KA.daily(s, { now: NOW, off: OFF })); assert.ok(Math.abs(b.total - a.total) / a.total < 0.15, `${a.total} vs ${b.total}`);
});
test('anomalies: flags planted large bill, big discount, odd hour and double bill; ignores normal bills', () => {
  const s = gen(60); const norm = KA.anomalies(s, { now: NOW, off: OFF }); assert.ok(norm.ok); assert.equal(norm.items.filter((x) => x.type !== 'odd_hour').length, 0, 'normal data: nothing flagged ' + JSON.stringify(norm.items.slice(0, 3)));
  s.push({ no: 'BIG', t: at(2, 12), by: 'Ravi', cust: '', total: 400000, disc: 0, lines: [] });
  s.push({ no: 'DISC', t: at(3, 12), by: 'Ravi', cust: '', total: 600, disc: 900, lines: [] });
  s.push({ no: 'NIGHT', t: at(4, 3, 10), by: 'Asha', cust: '', total: 1000, disc: 0, lines: [] });
  s.push({ no: 'D1', t: at(5, 15, 0), by: 'Asha', cust: '', total: 777, disc: 0, lines: [] }, { no: 'D2', t: at(5, 15, 1), by: 'Asha', cust: '', total: 777, disc: 0, lines: [] });
  for (let i = 0; i < 12; i++) s.push({ no: 'dd' + i, t: at(6 + i, 12, 5), by: 'Asha', cust: '', total: 800, disc: 100, lines: [] });
  const a = KA.anomalies(s, { now: NOW, off: OFF }), has = (type, no) => a.items.some((x) => x.type === type && x.no === no);
  assert.ok(has('large_bill', 'BIG')); assert.ok(has('big_discount', 'DISC')); assert.ok(has('odd_hour', 'NIGHT')); assert.ok(has('possible_double_bill', 'D2'));
  assert.ok(!a.items.some((x) => x.type === 'big_discount' && x.no.startsWith('dd')), 'a normal 11% discount is not flagged'); assert.ok(a.items.find((x) => x.no === 'BIG').why.match(/x the typical bill/));
});
test('anomalies: unusual day vs same weekday; refuses with too few bills', () => {
  const s = gen(60).filter((x) => !(x.t >= at(2, 0) && x.t < at(1, 0))); const a = KA.anomalies(s, { now: NOW, off: OFF }); assert.ok(a.days.some((d) => d.type === 'low_day' && d.date === '2026-10-08'), JSON.stringify(a.days));
  assert.equal(KA.anomalies(gen(60).slice(0, 10), { now: NOW }).ok, false);
});
test('abcxyz: Pareto classes and steadiness', () => {
  const sales = []; const L = (id, n, a, q) => ({ id, n, cat: 'x', q, a, c: 0 });
  for (let w = 0; w < 12; w++) { const t = at(w * 7 + 1, 12); sales.push({ no: 'a' + w, t, by: 'a', total: 0, disc: 0, lines: [L(1, 'Rice', 8500, 8), L(2, 'Tea', 1000, 3), L(3, 'Soap', 400, 4), L(4, 'Gum', 100, 2)] }); }
  sales.push({ no: 'burst', t: at(10, 12), by: 'a', total: 0, disc: 0, lines: [L(5, 'Gift Box', 100, 50)] });
  const r = KA.abcxyz(sales, { now: NOW, off: OFF, days: 90 }), by = Object.fromEntries(r.items.map((i) => [i.n, i]));
  assert.equal(by.Rice.abc, 'A'); assert.equal(by.Tea.abc, 'B'); assert.equal(by.Gum.abc, 'C'); assert.equal(by.Rice.xyz, 'X', 'sold every week'); assert.equal(by['Gift Box'].xyz, '?', 'too few weeks to judge');
  assert.ok(Math.abs(r.summary.A.share + r.summary.B.share + r.summary.C.share - 1) < 0.01); assert.equal(KA.abcxyz([], { now: NOW }).ok, false);
});
test('baskets: finds a planted pair with lift above 1 and ignores independent items', () => {
  const r = rng(3), sales = []; const L = (n) => ({ id: n, n, q: 1, a: 10, c: 0 });
  for (let i = 0; i < 400; i++) { const l = []; if (r() < 0.3) { l.push(L('Bread'), L('Butter')); } else { if (r() < 0.3) l.push(L('Bread')); if (r() < 0.3) l.push(L('Butter')); } if (r() < 0.4) l.push(L('Soap')); if (!l.length) l.push(L('Tea')); sales.push({ no: i, t: at(1, 12), by: 'a', total: 1, disc: 0, lines: l }); }
  const b = KA.baskets(sales); assert.ok(b.ok); assert.deepEqual([b.pairs[0].a, b.pairs[0].b], ['Bread', 'Butter']); assert.ok(b.pairs[0].lift > 1.3, 'lift ' + b.pairs[0].lift);
  assert.ok(!b.pairs.some((p) => p.a === 'Soap' || p.b === 'Soap'), 'independent item is not paired'); assert.equal(KA.baskets(sales.slice(0, 10)).ok, false);
});
test('rfm: segments follow recency and frequency; refuses with few customers', () => {
  const s = []; const bill = (c, ago, tot) => s.push({ no: c + ago, t: at(ago, 12), by: 'a', cust: c, total: tot, disc: 0, lines: [] });
  for (let i = 0; i < 12; i++) { const c = 'cust' + i; if (i < 3) for (let k = 0; k < 10; k++) bill(c, k * 3 + 1, 500); else if (i < 6) for (let k = 0; k < 6; k++) bill(c, 60 + k * 5, 400); else bill(c, 100 + i, 100); }
  const r = KA.rfm(s, { now: NOW, off: OFF }), seg = Object.fromEntries(r.customers.map((c) => [c.cust, c.segment]));
  assert.equal(seg.cust0, 'Champions'); assert.ok(['At risk', 'Regular', 'Loyal'].includes(seg.cust4)); assert.equal(seg.cust11, 'Lost'); assert.equal(KA.rfm(s.slice(0, 5), { now: NOW }).ok, false);
});
test('reorder: ROP = mean x lead time + z x sd x sqrt(lead time), checked by hand', () => {
  const s = []; for (let d = 1; d <= 28; d++) s.push({ no: d, t: at(d, 12), by: 'a', total: 0, disc: 0, lines: [{ id: 1, n: 'Tea', q: d % 2 ? 6 : 2, a: 1, c: 0 }] });
  const r = KA.reorder([{ id: 1, n: 'Tea', stock: 10 }, { id: 2, n: 'Unsold', stock: 5 }], s, { now: NOW, off: OFF, days: 28, leadDays: 4, z: 1.64 }).items;
  assert.equal(r.length, 1, 'items with no sales are skipped'); const sd = Math.sqrt((14 * 4 + 14 * 4) / 27), exp = Math.ceil(4 * 4 + 1.64 * sd * 2);
  assert.equal(r[0].perDay, 4); assert.equal(r[0].reorderPoint, exp); assert.equal(r[0].daysCover, 2.5); assert.equal(r[0].reorderNow, true); assert.equal(r[0].suggestQty, Math.ceil(exp + 28 - 10));
});
test('statistics helpers', () => { const { median, mad } = KA._t; assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5); assert.equal(mad([1, 2, 3, 4, 100]), 1); assert.ok(Number.isNaN(median([]))); });
