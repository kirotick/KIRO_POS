'use strict';
// The pure half of KIRO AI: facts from sales, topic detection, calculated answers, and the invented-number guard.
// No network, no database, no Node-only APIs, so the same file runs on the server and inside the website.
const KiroAIFacts = (function (KA) {
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inr = (r) => '₹' + Number(r).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const pct = (x) => Math.round(x * 1000) / 10;
// `unit: 'paise'` divides money by 100; the website already works in rupees.
const toRupees = (sales, unit) => (unit === 'rupees' ? sales : sales.map((s) => ({ ...s, total: s.total / 100, disc: s.disc / 100, lines: s.lines.map((l) => ({ ...l, a: l.a / 100, c: l.c / 100 })) })));

function windowStats(sales, from, to) { const l = sales.filter((s) => s.t >= from && s.t < to), total = l.reduce((a, s) => a + s.total, 0); return { total: Math.round(total), bills: l.length, avgBill: l.length ? Math.round(total / l.length) : 0 }; }

function buildFacts({ sales, items = [], stock = null, now = Date.now(), off = 330, unit = 'paise' }) {
  const S = toRupees(sales, unit), di = (t) => KA._t.dayIdx(t, off), today = di(now), D = 864e5, start = (d) => d * D - off * 6e4;
  const f = { asOf: new Date(now + off * 6e4).toISOString().slice(0, 10), currency: 'INR (rupees)', billsAnalysed: S.length };
  f.sales = { today: windowStats(S, start(today), start(today + 1)), yesterday: windowStats(S, start(today - 1), start(today)), last7days: windowStats(S, start(today - 6), start(today + 1)), previous7days: windowStats(S, start(today - 13), start(today - 6)),
    thisMonth: windowStats(S, start(today - new Date(now + off * 6e4).getUTCDate() + 1), start(today + 1)) };
  const fc = KA.forecast(KA.daily(S, { now, off }), { horizon: 7 });
  f.forecast = fc.ok ? { nextDays: fc.horizon.map((h) => ({ date: h.date, weekday: DAYS[h.dow], expected: Math.round(h.pred), low: Math.round(h.lo), high: Math.round(h.hi) })), nextWeekTotal: Math.round(fc.total),
    backtestErrorPercent: pct(fc.backtest.wape), naiveErrorPercent: pct(fc.backtest.naiveWape), beatsNaive: fc.backtest.beatsNaive, caution: fc.note } : { available: false, reason: fc.reason };
  const an = KA.anomalies(S, { now, off }); if (an.ok) { const counts = {}; an.items.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
    const big = an.items.filter((x) => x.type === 'large_bill').map((x) => x.value); f.unusual = { billsChecked: an.checked, counts, largestBill: big.length ? Math.max(...big) : 0, unusualDays: an.days.map((d) => ({ date: d.date, kind: d.type === 'low_day' ? 'unusually low' : 'unusually high', total: Math.round(d.value) })) }; }
  else f.unusual = { available: false, reason: an.reason };
  const ab = KA.abcxyz(S, { now, off }); if (ab.ok) f.itemClasses = { daysLooked: ab.days, A: { items: ab.summary.A.items, revenueSharePercent: pct(ab.summary.A.share) }, B: { items: ab.summary.B.items, revenueSharePercent: pct(ab.summary.B.share) }, C: { items: ab.summary.C.items, revenueSharePercent: pct(ab.summary.C.share) },
    topItems: ab.items.slice(0, 5).map((i) => ({ item: i.n, class: i.abc + (i.xyz === '?' ? '' : i.xyz), revenueSharePercent: pct(i.share) })) };
  const bk = KA.baskets(S); if (bk.ok && bk.pairs.length) f.boughtTogether = bk.pairs.map((p) => ({ items: [p.a, p.b], lift: p.lift, chanceBuyerOfFirstAlsoBuysSecondPercent: pct(p.confAB), bills: p.bills }));
  const rf = KA.rfm(S, { now, off }); f.customers = rf.ok ? { namedCustomers: rf.customers.length, segments: rf.counts } : { available: false, reason: rf.reason };
  if (items.length) { const ro = KA.reorder(items.map((i) => ({ id: i.id, n: i.name, stock: i.stock })), S, { now, off }); f.reorder = ro.items.filter((x) => x.reorderNow).slice(0, 5).map((x) => ({ item: x.n, inStock: x.stock, sellsPerDay: x.perDay, daysOfStockLeft: x.daysCover, suggestedOrderQty: x.suggestQty })); }
  if (stock) f.stock = stock; // already in rupees: { inventoryValueAtCost, stuckInDeadStock, deadStockLots, lowStockItems }
  const w = S.filter((s) => s.t >= start(today - 6)), by = {}; w.forEach((s) => { const o = by[s.by] || (by[s.by] = { bills: 0, total: 0 }); o.bills++; o.total += s.total; });
  f.staffThisWeek = Object.values(by).sort((a, b) => b.total - a.total).map((o, i) => ({ label: 'Staff ' + String.fromCharCode(65 + i), bills: o.bills, total: Math.round(o.total) }));
  return f;
}

// ---- which analytics topic does the question need? (plain keywords; anything else goes to the rule engine) ----
const TOPICS = [['forecast', /forecast|predict|projection|next (week|few days|days|month)|tomorrow|expect/], ['unusual', /anomal|unusual|suspicious|fraud|strange|irregular|odd |duplicate|double bill|discount abuse|cheat/],
  ['classes', /\babc\b|pareto|80\/?20|important items|which items (make|earn|bring)|revenue items|dead weight/], ['together', /together|combo|bundle|basket|cross.?sell|goes with|pair/],
  ['customers', /segment|rfm|loyal|churn|at risk|lost customers|best customers|repeat customers/], ['reorder', /reorder|re-order|restock|stock.?out|run out|safety stock|how much (to )?(buy|order)/],
  ['overview', /trend|growth|compare|versus| vs |last week|how are we doing|performance|insight|analy|health|what should i/]];
const topicOf = (q) => { const s = String(q).toLowerCase(); const t = TOPICS.find(([, re]) => re.test(s)); return t ? t[0] : null; };

// ---- the calculated answer: always available, no AI involved ----
function rulesAnswer(topic, f) {
  const L = [];
  const sales = f.sales;
  if (topic === 'forecast') {
    if (f.forecast.available === false) return f.forecast.reason;
    const fc = f.forecast; L.push(`Expected sales for the next 7 days: about ${inr(fc.nextWeekTotal)}.`, ...fc.nextDays.map((d) => `• ${d.weekday} ${d.date}: ${inr(d.expected)} (likely ${inr(d.low)} to ${inr(d.high)})`));
    L.push(`Check on past data: over the last 14 days this method was off by ${fc.backtestErrorPercent}% of sales${fc.beatsNaive ? ', better than just repeating last week' : ', no better than just repeating last week, so treat it as a rough guide'}.`); if (fc.caution) L.push(fc.caution);
  } else if (topic === 'unusual') {
    const u = f.unusual; if (u.available === false) return u.reason; const c = u.counts, n = Object.values(c).reduce((a, b) => a + b, 0);
    L.push(n || u.unusualDays.length ? `Checked ${u.billsChecked} bills. Found ${n} unusual bill${n === 1 ? '' : 's'}${u.unusualDays.length ? ` and ${u.unusualDays.length} unusual day${u.unusualDays.length === 1 ? '' : 's'}` : ''}.` : `Checked ${u.billsChecked} bills. Nothing looks unusual.`);
    const names = { large_bill: 'much larger than normal', big_discount: 'with a very high discount', odd_hour: 'billed at an unusual hour', possible_double_bill: 'that may have been entered twice' }; Object.entries(c).forEach(([k, v]) => L.push(`• ${v} bill${v === 1 ? '' : 's'} ${names[k] || k}`));
    u.unusualDays.forEach((d) => L.push(`• ${d.date}: ${d.kind} (${inr(d.total)})`)); if (n) L.push('Open Sales in the app to see which invoices these are.');
  } else if (topic === 'classes') {
    const c = f.itemClasses; if (!c) return 'There are no sales in the last 90 days to rank items.';
    L.push(`Over the last ${c.daysLooked} days: ${c.A.items} "A" item${c.A.items === 1 ? '' : 's'} bring ${c.A.revenueSharePercent}% of sales, ${c.B.items} "B" bring ${c.B.revenueSharePercent}%, and ${c.C.items} "C" bring ${c.C.revenueSharePercent}%.`, 'Top items:', ...c.topItems.map((i) => `• ${i.item}: ${i.revenueSharePercent}% of sales (class ${i.class})`), 'Class A items should never run out. Class C items are candidates to stock less.');
  } else if (topic === 'together') {
    if (!f.boughtTogether) return 'I have not found items that are bought together more often than chance yet. I need at least 30 bills with several items each.';
    L.push('Items customers buy together more often than chance:', ...f.boughtTogether.map((p) => `• ${p.items[0]} and ${p.items[1]}: ${p.bills} bills, ${p.lift} times more often than chance (${p.chanceBuyerOfFirstAlsoBuysSecondPercent}% of ${p.items[0]} buyers also buy ${p.items[1]})`), 'Consider placing them together or offering a combo.');
  } else if (topic === 'customers') {
    const c = f.customers; if (c.available === false) return c.reason; L.push(`${c.namedCustomers} named customers by value of recent visits:`, ...Object.entries(c.segments).map(([k, v]) => `• ${k}: ${v}`));
  } else if (topic === 'reorder') {
    if (!f.reorder || !f.reorder.length) return 'Nothing needs reordering based on the last 28 days of sales.';
    L.push('Reorder soon (stock is at or below what you sell during delivery plus a safety margin):', ...f.reorder.map((r) => `• ${r.item}: ${r.inStock} left, sells ${r.sellsPerDay} a day (${r.daysOfStockLeft} days left). Order about ${r.suggestedOrderQty}.`));
  } else {
    const a = sales.last7days, b = sales.previous7days, ch = b.total > 0 ? Math.round(((a.total - b.total) / b.total) * 1000) / 10 : null;
    L.push(`Today: ${inr(sales.today.total)} from ${sales.today.bills} bills. Yesterday: ${inr(sales.yesterday.total)}. This month: ${inr(sales.thisMonth.total)}.`, `Last 7 days: ${inr(a.total)} from ${a.bills} bills${ch === null ? '' : ` (${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch)}% on the 7 days before)`}.`);
    if (f.forecast.nextWeekTotal) L.push(`Expected next 7 days: about ${inr(f.forecast.nextWeekTotal)}.`); if (f.stock) L.push(`${inr(f.stock.stuckInDeadStock)} is stuck in dead stock.`);
  }
  return L.join('\n');
}

// ---- guard against invented numbers ----
const MULT = { lakh: 1e5, lakhs: 1e5, crore: 1e7, crores: 1e7, k: 1e3 };
function numbersIn(text) { const out = []; const re = /(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|crores?|k\b)?/gi; let m; while ((m = re.exec(text))) { const v = Number(m[1].replace(/,/g, '')); if (Number.isFinite(v)) out.push(v * (m[2] ? MULT[m[2].toLowerCase()] : 1)); } return out; }
function allowedNumbers(facts) { const set = new Set(); const add = (v) => { set.add(v); set.add(Math.round(v)); set.add(Math.round(v * 10) / 10); if (Math.abs(v) <= 1) set.add(Math.round(v * 100)); };
  (function walk(x) { if (typeof x === 'number') add(Math.abs(x)); else if (typeof x === 'string') numbersIn(x).forEach(add); else if (x && typeof x === 'object') Object.values(x).forEach(walk); })(facts); return set; }
function ungrounded(answer, facts) { const ok = allowedNumbers(facts), bad = [];
  for (const n of numbersIn(answer)) { if (Number.isInteger(n) && n <= 10) continue; let hit = false; for (const a of ok) if (Math.abs(n - a) <= Math.max(0.51, 0.006 * Math.abs(a))) { hit = true; break; } if (!hit) bad.push(n); } return bad; }


  return { buildFacts, topicOf, rulesAnswer, ungrounded, toRupees, inr };
})(typeof require !== 'undefined' ? require('./analytics') : KiroAnalytics);
if (typeof module !== 'undefined' && module.exports) module.exports = KiroAIFacts;
