'use strict';
// Ask KIRO for the API: a keyword assistant (NOT a language model) that answers from the business's own data.
// It never invents numbers: every figure comes from the same store functions the app screens use, and every
// answer is filtered by the caller's role. Returns { intent, answer, data } so the app can show text plus a card.
const { can } = require('./perms');

const inr = (paise) => '₹' + (Math.round(Number(paise)) / 100).toLocaleString('en-IN', { minimumFractionDigits: Number(paise) % 100 ? 2 : 0, maximumFractionDigits: 2 });
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1).toLowerCase();
const LABEL = { today: 'today', yesterday: 'yesterday', week: 'in the last 7 days', month: 'this month', year: 'this year', all: 'all time' };

function periodOf(s) {
  if (/yesterday/.test(s)) return 'yesterday';
  if (/all.?time|\bever\b|overall|since (start|begin)/.test(s)) return 'all';
  if (/year/.test(s)) return 'year';
  if (/month/.test(s)) return 'month';
  if (/week|7 days/.test(s)) return 'week';
  return 'today';
}

const HELP = 'I can answer from your own data:\n• Sales, bills and invoice numbers (today, yesterday, this week, this month)\n'
  + '• "Invoice 12" or "last 5 invoices": who billed it, customer, items, payment\n• Sales by staff, and who is using KIRO\n'
  + '• GST collected, payment modes, top items, customers\n• Stock: low stock, expiry, dead stock, fast movers\n• "Give me a summary"';

function createAsk({ store, now = () => new Date() }) {
  // Times are shown in the business's own time zone (businesses.tz), e.g. "10 Oct, 8:49 am".
  const fmt = (tz) => { let f; try { f = new Intl.DateTimeFormat('en-IN', { timeZone: tz, day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { f = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }); }
    return (d) => f.format(new Date(d)).replace(/\s?(am|pm)/i, (m) => ' ' + m.trim().toLowerCase()); };

  async function ask({ businessId, userId, role }, question) {
    const biz = await store.getBusiness(businessId), at = fmt(biz && biz.tz);
    const inv = (x) => `• ${x.invoice_no} · ${at(x.created_at)} · ${x.user_name} · ${inr(x.total_paise)}`;
    const s = String(question || '').toLowerCase().trim().slice(0, 200);
    if (!s) return { intent: 'help', answer: HELP };
    const per = periodOf(s), lab = LABEL[per];
    const mgr = can(role, 'reports:view');

    // invoice lookup: "invoice 12", "bill no INV/000012"
    const mi = /(?:invoice|bill|receipt|inv)\s*(?:no\.?|number|num|#)?\s*[:#]?\s*([a-z0-9\/\-]*\d[a-z0-9\/\-]*)/.exec(s);
    if (mi && !/(last|latest|recent)\s*\d*\s*(invoice|bill)/.test(s)) {
      const tok = mi[1].replace(/^[\/\-]+|[\/\-]+$/g, '');
      const hit = await store.lookupSale(businessId, tok);
      const sale = hit && await store.getSale(businessId, hit.id);
      if (!sale || !(can(role, 'sales:viewAll') || String(sale.user_id) === String(userId))) return { intent: 'invoice', answer: `No invoice matches "${tok}". Try the number as printed on the bill.` };
      const pay = (sale.payments || []).map((p) => `${cap(p.mode)} ${inr(p.amountPaise)}`).join(' · ');
      return { intent: 'invoice', data: { invoiceNo: sale.invoice_no },
        answer: `Invoice ${sale.invoice_no}\nDate: ${at(sale.created_at)}\nBilled by: ${sale.user_name}\nCustomer: ${sale.customer_name || sale.customer_phone || 'Walk-in'}\nPayment: ${pay || '—'}\nItems:\n`
          + sale.lines.map((l) => `• ${l.name} × ${l.qty} = ${inr(l.line_total_paise)}`).join('\n') + `\nTotal: ${inr(sale.total_paise)}` };
    }
    const ml = /(last|latest|recent)\s*(\d+)?\s*(invoice|bill|sale|receipt)/.exec(s) || (/invoice number|bill number/.test(s) ? [0, 0, 0, ''] : null);
    if (ml) {
      const n = Math.min(20, Number(ml[2]) || 5);
      const rows = await store.listSales(businessId, { period: 'all', userId: can(role, 'sales:viewAll') ? null : userId, limit: n });
      return { intent: 'recent', answer: rows.length ? `Latest ${rows.length} invoice${rows.length > 1 ? 's' : ''}:\n` + rows.map(inv).join('\n') : 'No bills yet.' };
    }
    if (/(using|active|logged|login|sign.?in|users|staff list|team|employees|logins)/.test(s) && !/sold|sales by|billed by/.test(s)) {
      if (!can(role, 'staff:manage')) return { intent: 'staff', answer: 'Only the owner can see staff logins and activity.' };
      const st = await store.listStaff(businessId);
      return { intent: 'staff', data: st, answer: 'People with access to this business:\n' + st.map((u) =>
        `• ${u.name} (${cap(u.role)}${u.active ? '' : ', switched off'}) · login ${u.login} · last active ${u.last_login_at ? at(u.last_login_at) : 'never'} · today ${u.bills_today} bills, ${inr(u.total_today)}`).join('\n') };
    }
    const needReport = () => (mgr ? null : { intent: 'denied', answer: 'You do not have permission to view business-wide reports.' });
    if (/(staff|cashier|employee|user|who|team)/.test(s) && /(sold|sale|sales|bill|billed|made|most|top|best|by|per)/.test(s)) {
      const d = needReport(); if (d) return d;
      const r = (await store.summary(businessId, per, null)).byStaff;
      return { intent: 'byStaff', data: r, answer: r.length ? `Sales by staff ${lab}:\n` + r.map((x) => `• ${x.name}: ${x.bills} bills, ${inr(x.totalPaise)}`).join('\n') : `No sales ${lab}.` };
    }
    if (/payment|cash|upi|card|mode/.test(s)) {
      const d = needReport(); if (d) return d;
      const m = await store.summary(businessId, per, null);
      return { intent: 'modes', data: m.byMode, answer: m.byMode.length ? `Payments ${lab}:\n` + m.byMode.map((x) => `• ${cap(x.mode)}: ${inr(x.amountPaise)}`).join('\n') + `\nTotal ${inr(m.totalPaise)} from ${m.bills} bill${m.bills === 1 ? '' : 's'}.` : `No sales ${lab}.` };
    }
    if (/gst|tax|cgst|sgst/.test(s)) {
      const d = needReport(); if (d) return d;
      const m = await store.summary(businessId, per, null), t = m.cgstPaise + m.sgstPaise;
      return { intent: 'gst', data: { cgstPaise: m.cgstPaise, sgstPaise: m.sgstPaise }, answer: t > 0 ? `GST collected ${lab} (included in prices): CGST ${inr(m.cgstPaise)} + SGST ${inr(m.sgstPaise)} = ${inr(t)} on sales of ${inr(m.totalPaise)}.` : `No GST recorded ${lab}.` };
    }
    if (/customer|client|buyer/.test(s)) {
      const d = needReport(); if (d) return d;
      const r = await store.topCustomers(businessId, per === 'today' ? 'all' : per, 5);
      return { intent: 'customers', data: r, answer: r.length ? `Top customers (${per === 'today' ? 'all time' : lab}):\n` + r.map((c) => `• ${c.name}${c.phone && c.phone !== c.name ? ' (' + c.phone + ')' : ''}: ${inr(c.totalPaise)} over ${c.bills} bills`).join('\n') : 'No customers saved yet. Enter a name or mobile at billing.' };
    }
    if (/dead|stuck|slow|aging|ageing|old stock|locked|capital|expir|low stock|running low|reorder|restock|fast|inventory|stock value/.test(s)) {
      if (!can(role, 'insights:view')) return { intent: 'denied', answer: 'You do not have permission to view stock insights.' };
      const i = await store.insights(businessId);
      if (/expir/.test(s)) return { intent: 'expiry', data: i.expiring, answer: i.expiring.length ? 'Expired or expiring within 90 days:\n' + i.expiring.slice(0, 10).map((e) => `• ${e.name}${e.batchNo ? ' batch ' + e.batchNo : ''}: ${e.qty} left, ${e.expiry}${e.expired ? ' (expired)' : ''}`).join('\n') : 'Nothing is expired or expiring in 90 days.' };
      if (/low|reorder|restock|running/.test(s)) return { intent: 'low', data: i.lowStock, answer: i.lowStock.length ? 'Low stock:\n' + i.lowStock.slice(0, 10).map((l) => `• ${l.name}: ${l.stock} left (minimum ${l.min})`).join('\n') : 'Nothing is low right now.' };
      if (/fast/.test(s)) return { intent: 'fast', data: i.fastMovers, answer: i.fastMovers.length ? 'Fast-moving categories (last 14 days):\n' + i.fastMovers.map((f) => `• ${f.category || 'Uncategorised'}: ${f.qty} sold`).join('\n') : 'No sales in the last 14 days.' };
      return { intent: 'dead', data: i.dead, answer: `Stuck capital in dead stock: ${inr(i.stuckPaise)} in ${i.dead.length} lot(s) older than 90 days with no sale in 90 days.\n` + i.dead.slice(0, 5).map((d) => `• ${d.name}: ${d.qty} left, ${d.ageDays} days old, ${inr(d.lockedPaise)}`).join('\n') + `\n\nTotal inventory at cost: ${inr(i.inventoryPaise)}.` };
    }
    if (/item|product|best.?sell|top sell|selling/.test(s) && /top|best|most|sell|sold/.test(s)) {
      const d = needReport(); if (d) return d;
      const m = await store.summary(businessId, per, null);
      return { intent: 'items', data: m.topItems, answer: m.topItems.length ? `Top items ${lab}:\n` + m.topItems.map((x) => `• ${x.name}: ${x.qty} sold, ${inr(x.totalPaise)}`).join('\n') : `No sales ${lab}.` };
    }
    // sales / summary (default for anything about sales, bills, revenue, today)
    if (/summary|overview|sales|sale|sold|bills|revenue|business|how (much|many)|today|yesterday|week|month|year|turnover|collection/.test(s)) {
      const m = await store.summary(businessId, per, mgr ? null : userId);
      if (!m.bills) return { intent: 'summary', data: m, answer: `No bills ${lab}.` };
      const lines = [`Sales ${lab}: ${inr(m.totalPaise)} from ${m.bills} bill${m.bills === 1 ? '' : 's'}. Invoice numbers ${m.firstInvoice} to ${m.lastInvoice}. Average bill ${inr(m.totalPaise / m.bills)}.`];
      if (/summary|overview/.test(s)) {
        if (m.byMode.length) lines.push('• Payment modes: ' + m.byMode.map((x) => `${cap(x.mode)} ${inr(x.amountPaise)}`).join(', '));
        if (mgr && m.byStaff[0]) lines.push(`• Top biller: ${m.byStaff[0].name} (${inr(m.byStaff[0].totalPaise)})`);
        if (m.topItems[0]) lines.push(`• Best seller: ${m.topItems[0].name} (${m.topItems[0].qty})`);
        if (m.cgstPaise + m.sgstPaise > 0) lines.push(`• GST included: ${inr(m.cgstPaise + m.sgstPaise)}`);
        if (can(role, 'insights:view')) { const i = await store.insights(businessId); lines.push(`• Stuck capital in dead stock: ${inr(i.stuckPaise)}`, `• Low-stock items: ${i.lowStock.length}`); }
      }
      return { intent: 'summary', data: m, answer: lines.join('\n') };
    }
    return { intent: 'help', answer: HELP };
  }
  return { ask };
}
module.exports = { createAsk, inr, periodOf };
