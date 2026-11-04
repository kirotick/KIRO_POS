'use strict';
// KIRO analytics: the numbers behind KIRO AI. Pure functions, no dependencies, same file runs in Node (server) and in the browser (website).
// Money is unit-agnostic (rupees or paise, just be consistent). Input sale: { no, t:ms, by, cust, total, disc, lines:[{id,n,cat,q,a,c}] }
//   a = line amount, c = line cost (optional). `off` = minutes east of UTC for the shop's time zone (India = 330).
// Rules of thumb used throughout: robust statistics (median / MAD) because shop data has outliers by nature, and every method
// refuses to answer when there is too little history instead of producing a confident-looking guess.
const KiroAnalytics = (function () {
  const DAY = 864e5;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mad = (a, med = median(a)) => median(a.map((x) => Math.abs(x - med)));
  const mean = (a) => (a.length ? sum(a) / a.length : NaN);
  const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1)); };
  const dayIdx = (t, off) => Math.floor((t + off * 6e4) / DAY);          // local calendar day number
  const dow = (di) => (((di + 4) % 7) + 7) % 7;                          // 0 = Sunday (day 0 = 1 Jan 1970 was a Thursday)
  const iso = (di) => new Date(di * DAY).toISOString().slice(0, 10);
  const hourOf = (t, off) => Math.floor((((t + off * 6e4) % DAY) + DAY) % DAY / 36e5);
  const round = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);

  // ---- daily series: one entry per local day, zeros included, ending yesterday (today is incomplete, so it is left out) ----
  function daily(sales, { now = Date.now(), days = 120, off = 330, includeToday = false } = {}) {
    const last = dayIdx(now, off) - (includeToday ? 0 : 1), first = last - days + 1, m = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < first || d > last) continue; const o = m.get(d) || { total: 0, bills: 0 }; o.total += s.total; o.bills++; m.set(d, o); }
    const out = []; for (let d = first; d <= last; d++) { const o = m.get(d) || { total: 0, bills: 0 }; out.push({ day: d, date: iso(d), dow: dow(d), total: o.total, bills: o.bills }); }
    // trim leading empty days before the first real sale: the shop was not open yet, that is not "zero demand"
    let i = 0; while (i < out.length && out[i].bills === 0) i++;
    return out.slice(i);
  }

  // ---- forecast: weekday seasonality x robust (Theil-Sen) trend, with an honest backtest against "same weekday last week" ----
  function theilSen(y) {
    const n = y.length, slopes = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) slopes.push((y[j] - y[i]) / (j - i));
    const b = slopes.length ? median(slopes) : 0, a = median(y.map((v, i) => v - b * i));
    return { a, b };
  }
  // Weekday factors by classical decomposition: each day divided by its centred 7-day average, so a rising or falling
  // trend does not leak into the weekday pattern. Median per weekday, normalised to average 1.
  function weekdayFactors(w) {
    const r = Array.from({ length: 7 }, () => []);
    for (let i = 3; i < w.length - 3; i++) { const ma = sum(w.slice(i - 3, i + 4).map((x) => x.total)) / 7; if (ma > 0) r[w[i].dow].push(w[i].total / ma); }
    const idx = r.map((v) => (v.length ? median(v) : 1)), mi = mean(idx);
    return idx.map((v) => Math.max(mi > 0 ? v / mi : 1, 0.05));
  }
  function fitForecast(series, h) {
    const w = series.slice(-84), n = w.length; if (!(mean(w.map((x) => x.total)) > 0)) return null;
    const S = weekdayFactors(w), des = w.map((x) => x.total / S[x.dow]), { a, b } = theilSen(des);
    const res = des.map((v, i) => v - (a + b * i)), sig = 1.4826 * mad(res, median(res));
    const out = []; for (let k = 1; k <= h; k++) { const t = n - 1 + k, d = w[n - 1].day + k, s = S[dow(d)], p = Math.max(0, (a + b * t) * s); out.push({ date: iso(d), dow: dow(d), pred: p, lo: Math.max(0, p - 1.28 * sig * s), hi: p + 1.28 * sig * s }); }
    return { out, S, slopePerDay: b, sig };
  }
  function forecast(series, { horizon = 7, minDays = 28 } = {}) {
    if (series.length < minDays) return { ok: false, reason: `Need at least ${minDays} days of sales history to forecast; there are ${series.length}.` };
    const f = fitForecast(series, horizon); if (!f) return { ok: false, reason: 'No sales in the history to forecast from.' };
    // backtest: the last 14 days, each predicted using only the days before it
    let errM = 0, errN = 0, tot = 0, cnt = 0;
    for (let k = 14; k >= 1; k--) {
      const cut = series.length - k; if (cut < minDays) continue;
      const fit = fitForecast(series.slice(0, cut), 1), actual = series[cut].total, naive = series[cut - 7] ? series[cut - 7].total : NaN;
      if (!fit || !Number.isFinite(naive)) continue; errM += Math.abs(actual - fit.out[0].pred); errN += Math.abs(actual - naive); tot += actual; cnt++;
    }
    const wape = cnt && tot > 0 ? errM / tot : NaN, naiveWape = cnt && tot > 0 ? errN / tot : NaN;
    const total = sum(f.out.map((x) => x.pred));
    return { ok: true, horizon: f.out.map((x) => ({ ...x, pred: round(x.pred), lo: round(x.lo), hi: round(x.hi) })), total: round(total), weekdayIndex: f.S.map((v) => round(v, 3)),
      backtest: { days: cnt, wape: round(wape, 3), naiveWape: round(naiveWape, 3), beatsNaive: Number.isFinite(wape) && wape <= naiveWape },
      note: Number.isFinite(wape) && wape > 0.5 ? 'Daily sales here are very uneven, so day-level forecasts are rough. Trust the weekly total more than any single day.' : '' };
  }

  // ---- anomalies: unusual bills, discounts, hours, double entries, and days ----
  function anomalies(sales, { now = Date.now(), off = 330, z = 3.5, minBills = 30 } = {}) {
    const out = [], bills = sales.filter((s) => s.total > 0);
    if (bills.length < minBills) return { ok: false, reason: `Need at least ${minBills} bills to judge what is unusual; there are ${bills.length}.`, items: [] };
    const lg = bills.map((s) => Math.log(s.total)), md = median(lg), sc = 1.4826 * mad(lg, md) || 0.0001;
    for (const s of bills) { const mz = (Math.log(s.total) - md) / sc; if (mz > z) out.push({ type: 'large_bill', no: s.no, by: s.by, t: s.t, value: s.total, score: round(mz, 1), why: `${round(s.total / Math.exp(md), 1)}x the typical bill` }); }
    const dis = bills.filter((s) => s.disc > 0).map((s) => ({ s, r: s.disc / (s.total + s.disc) }));
    if (dis.length >= 10) { const rs = dis.map((x) => x.r), rm = median(rs), rd = 1.4826 * mad(rs, rm) || 0.01;
      for (const { s, r } of dis) if (r >= 0.25 && ((r - rm) / rd > z || r >= 0.5)) out.push({ type: 'big_discount', no: s.no, by: s.by, t: s.t, value: round(r * 100, 0), score: round((r - rm) / rd, 1), why: `${round(r * 100, 0)}% discount; typical is ${round(rm * 100, 0)}%` }); }
    if (bills.length >= 100) { const h = new Array(24).fill(0); bills.forEach((s) => h[hourOf(s.t, off)]++);
      for (const s of bills) { const hr = hourOf(s.t, off); if (h[hr] / bills.length <= 0.01) out.push({ type: 'odd_hour', no: s.no, by: s.by, t: s.t, value: hr, score: 0, why: `billed at ${String(hr).padStart(2, '0')}:00, when under 1% of bills happen` }); } }
    const srt = [...bills].sort((a, b) => a.t - b.t);
    for (let i = 1; i < srt.length; i++) { const p = srt[i - 1], c = srt[i]; if (p.by === c.by && p.total === c.total && c.t - p.t <= 120e3 && c.t !== p.t) out.push({ type: 'possible_double_bill', no: c.no, by: c.by, t: c.t, value: c.total, score: 0, why: `same amount by the same person ${Math.round((c.t - p.t) / 1000)}s after ${p.no}` }); }
    // days: compare each recent day to the same weekday's typical value
    const ser = daily(sales, { now, off, days: 120 }); const days = [];
    if (ser.length >= 28) for (const x of ser.slice(-14)) { const peers = ser.filter((y) => y.dow === x.dow && y.day !== x.day).map((y) => y.total); if (peers.length >= 3) { const pm = median(peers), ps = 1.4826 * mad(peers, pm) || Math.max(1, pm * 0.05), dz = (x.total - pm) / ps;
      if (Math.abs(dz) > z) days.push({ type: dz < 0 ? 'low_day' : 'high_day', date: x.date, value: x.total, score: round(dz, 1), why: `${round(x.total)} against a typical ${round(pm)} for this weekday` }); } }
    return { ok: true, items: out.sort((a, b) => b.t - a.t), days, checked: bills.length };
  }

  // ---- ABC / XYZ: which items carry the revenue (ABC) and how steady their demand is (XYZ) ----
  function abcxyz(sales, { now = Date.now(), days = 90, off = 330 } = {}) {
    const to = dayIdx(now, off) + 1, from = to - days, rev = new Map(), wk = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < from || d >= to) continue; const w = Math.floor((d - from) / 7);
      for (const l of s.lines) { const k = l.id != null ? String(l.id) : l.n, o = rev.get(k) || { id: k, n: l.n, cat: l.cat || '', a: 0, q: 0 }; o.a += l.a; o.q += l.q; rev.set(k, o);
        const arr = wk.get(k) || new Array(Math.ceil(days / 7)).fill(0); arr[w] += l.q; wk.set(k, arr); } }
    const list = [...rev.values()].sort((a, b) => b.a - a.a), tot = sum(list.map((x) => x.a));
    if (!list.length || !(tot > 0)) return { ok: false, reason: 'No sales in this period.', items: [] };
    let cum = 0; const items = list.map((x) => { const before = cum / tot; cum += x.a; const abc = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C';
      const arr = wk.get(x.id), nz = arr.filter((v) => v > 0).length, cv = std(arr) / (mean(arr) || 1), xyz = nz < 4 ? '?' : cv < 0.5 ? 'X' : cv < 1 ? 'Y' : 'Z';
      return { id: x.id, n: x.n, cat: x.cat, revenue: round(x.a), share: round(x.a / tot, 4), qty: x.q, abc, xyz, cv: round(cv, 2) }; });
    const g = (c) => items.filter((i) => i.abc === c);
    return { ok: true, days, items, summary: { A: { items: g('A').length, share: round(sum(g('A').map((i) => i.share)), 3) }, B: { items: g('B').length, share: round(sum(g('B').map((i) => i.share)), 3) }, C: { items: g('C').length, share: round(sum(g('C').map((i) => i.share)), 3) } } };
  }

  // ---- market basket: items that are bought together more often than chance (lift > 1) ----
  function baskets(sales, { minSupport = 0.02, minCount = 3, top = 5, minLift = 1.2 } = {}) {
    const bills = sales.map((s) => [...new Set(s.lines.map((l) => l.n))]).filter((b) => b.length), N = bills.length;
    if (N < 30) return { ok: false, reason: `Need at least 30 bills to find items bought together; there are ${N}.`, pairs: [] };
    const c1 = new Map(), c2 = new Map();
    for (const b of bills) { b.forEach((x) => c1.set(x, (c1.get(x) || 0) + 1)); for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const k = [b[i], b[j]].sort().join('\u0000'); c2.set(k, (c2.get(k) || 0) + 1); } }
    const pairs = []; for (const [k, c] of c2) { if (c < minCount || c / N < minSupport) continue; const [a, b] = k.split('\u0000'), lift = (c / N) / ((c1.get(a) / N) * (c1.get(b) / N));
      if (lift >= minLift) pairs.push({ a, b, bills: c, support: round(c / N, 4), confAB: round(c / c1.get(a), 3), confBA: round(c / c1.get(b), 3), lift: round(lift, 2) }); }
    return { ok: true, bills: N, pairs: pairs.sort((x, y) => y.lift * y.support - x.lift * x.support).slice(0, top) };
  }

  // ---- RFM customer segments ----
  function rfm(sales, { now = Date.now(), off = 330 } = {}) {
    const m = new Map(); for (const s of sales) { if (!s.cust) continue; const o = m.get(s.cust) || { cust: s.cust, last: 0, f: 0, m: 0 }; o.last = Math.max(o.last, s.t); o.f++; o.m += s.total; m.set(s.cust, o); }
    const cs = [...m.values()]; if (cs.length < 10) return { ok: false, reason: `Need at least 10 named customers for segments; there are ${cs.length}.`, customers: [] };
    cs.forEach((c) => { c.r = dayIdx(now, off) - dayIdx(c.last, off); });
    // Quintile 1..5 by the share of customers strictly worse; equal values always get equal scores.
    const score = (key, higherBetter) => { const sc = new Map(); cs.forEach((c) => { const worse = cs.filter((o) => (higherBetter ? o[key] < c[key] : o[key] > c[key])).length; sc.set(c, 1 + Math.min(4, Math.floor((worse * 5) / cs.length))); }); return sc; };
    const R = score('r', false), F = score('f', true), M = score('m', true);
    const out = cs.map((c) => { const r = R.get(c), f = F.get(c), mm = M.get(c); const seg = r >= 4 && f >= 4 ? 'Champions' : f >= 4 && r >= 3 ? 'Loyal' : r >= 4 && f <= 2 ? 'New or recent' : r <= 2 && f >= 3 ? 'At risk' : r === 1 && f <= 2 ? 'Lost' : 'Regular';
      return { cust: c.cust, recencyDays: c.r, bills: c.f, spent: round(c.m), r, f, m: mm, segment: seg }; });
    const counts = {}; out.forEach((c) => { counts[c.segment] = (counts[c.segment] || 0) + 1; });
    return { ok: true, customers: out.sort((a, b) => b.spent - a.spent), counts };
  }

  // ---- reorder points from real demand variability: ROP = mean demand x lead time + safety stock ----
  function reorder(items, sales, { now = Date.now(), off = 330, days = 28, leadDays = 3, z = 1.64 } = {}) {
    const to = dayIdx(now, off), from = to - days, dem = new Map();
    for (const s of sales) { const d = dayIdx(s.t, off); if (d < from || d >= to) continue; for (const l of s.lines) { const k = l.id != null ? String(l.id) : l.n, a = dem.get(k) || new Array(days).fill(0); a[d - from] += l.q; dem.set(k, a); } }
    const out = [];
    for (const it of items) { const a = dem.get(String(it.id)) || dem.get(it.n); if (!a) continue; const mu = mean(a), sd = std(a); if (!(mu > 0)) continue;
      const rop = mu * leadDays + z * sd * Math.sqrt(leadDays), cover = it.stock / mu;
      out.push({ id: it.id, n: it.n, stock: it.stock, perDay: round(mu, 2), reorderPoint: Math.ceil(rop), daysCover: round(cover, 1), reorderNow: it.stock <= rop, suggestQty: Math.max(0, Math.ceil(rop + mu * 7 - it.stock)) }); }
    return { ok: true, leadDays, items: out.sort((a, b) => a.daysCover - b.daysCover) };
  }

  return { daily, forecast, anomalies, abcxyz, baskets, rfm, reorder, _t: { median, mad, theilSen, dayIdx, dow } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = KiroAnalytics;
