'use strict';
// Nightly owner report: every evening at 10 PM (the business's own time zone) KIRO sends the day's summary to the owner on WhatsApp, as text.
//   * The numbers come from the database. An AI model may only reword them: if its text contains any number that is not in the
//     calculated report, or it fails, the calculated report is sent instead.
//   * WhatsApp rule: a business may only START a chat with a pre-approved TEMPLATE. The template has one variable ({{1}}) that holds
//     the report. Meta does not allow line breaks inside a variable, so lines are joined with " | ".
//   * Credentials come from env vars on the server only (see .env.example). Nothing is sent unless they are all present.
const inr = (paise) => '₹' + (Math.round(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function buildReport({ name, dateLabel, today, ins }) {
  const L = [`${name} - daily report, ${dateLabel}`];
  L.push(`Sales: ${inr(today.totalPaise)} from ${today.bills} bill${today.bills === 1 ? '' : 's'}`);
  if (today.bills) {
    L.push('Payments: ' + (today.byMode.map((m) => `${m.mode} ${inr(m.amountPaise)}`).join(', ') || 'none'));
    if (today.topItems.length) L.push('Top sellers: ' + today.topItems.slice(0, 3).map((x) => `${x.name} x${x.qty}`).join(', '));
    L.push(`GST collected: ${inr(today.cgstPaise + today.sgstPaise)}`);
    if (today.discountPaise) L.push(`Discounts given: ${inr(today.discountPaise)}`);
  }
  const exp = ins.expiring.filter((e) => !e.expired).length, expd = ins.expiring.filter((e) => e.expired).length;
  L.push(`Low stock: ${ins.lowStock.length} item${ins.lowStock.length === 1 ? '' : 's'}${ins.lowStock.length ? ' (' + ins.lowStock.slice(0, 3).map((x) => x.name).join(', ') + ')' : ''}`);
  if (exp || expd) L.push(`Expiry: ${exp} batch${exp === 1 ? '' : 'es'} within 90 days, ${expd} already expired`);
  if (ins.stuckPaise) L.push(`Money stuck in dead stock: ${inr(ins.stuckPaise)}`);
  return L;
}

// Meta rejects variables with newlines, tabs or 4+ spaces in a row, and long text.
const toParam = (lines) => lines.join(' | ').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').slice(0, 900);
const nums = (t) => (String(t).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => x.replace(/,/g, ''));

function createNightly({ store, env = (typeof process !== 'undefined' && process.env) || {}, fetchImpl = (...a) => fetch(...a), now = () => Date.now(), log = console, hour = 22 }) {
  const wa = { token: env.WA_TOKEN, phoneId: env.WA_PHONE_NUMBER_ID, template: env.WA_TEMPLATE, lang: env.WA_TEMPLATE_LANG || 'en', ver: env.WA_GRAPH_VERSION || 'v21.0' };
  const sendReady = !!(wa.token && wa.phoneId && wa.template);
  const ai = { key: env.AI_API_KEY, model: env.AI_MODEL, base: String(env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '') };
  const aiReady = !!(ai.key && ai.model);

  async function reword(lines) {
    if (!aiReady) return null;
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetchImpl(ai.base + '/chat/completions', { method: 'POST', signal: ctl.signal, headers: { Authorization: 'Bearer ' + ai.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ai.model, temperature: 0.2, max_tokens: 300, messages: [
          { role: 'system', content: 'Rewrite this shop report as a short, friendly WhatsApp message for the owner, in plain English. Keep every number exactly as given. Never add, change or calculate numbers. At most 6 short lines. You may add one practical tip only if the report supports it, without any new number.' },
          { role: 'user', content: lines.join('\n') }] }) });
      if (!res.ok) return null;
      const body = await res.json(), text = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
      if (typeof text !== 'string' || !text.trim()) return null;
      const allowed = new Set(nums(lines.join('\n')));
      return nums(text).every((n) => allowed.has(n)) ? text.trim() : null;   // invented number -> discard
    } catch { return null; } finally { clearTimeout(t); }
  }

  async function send(to, param) {
    const res = await fetchImpl(`https://graph.facebook.com/${wa.ver}/${wa.phoneId}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + wa.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: wa.template, language: { code: wa.lang }, components: [{ type: 'body', parameters: [{ type: 'text', text: param }] }] } }) });
    if (!res.ok) { const e = new Error('whatsapp_http_' + res.status); e.status = res.status; throw e; }
  }

  // One business: claim today's slot, build, send. If sending fails the claim is released so the next tick retries.
  async function sendFor(b) {
    const claimed = await store.nightlyClaim(b.id); if (!claimed) return 'already_sent';
    try {
      const [today, ins] = await Promise.all([store.summary(b.id, 'today'), store.insights(b.id)]);
      const dateLabel = new Date(now()).toLocaleDateString('en-IN', { timeZone: b.tz, day: 'numeric', month: 'short' });
      const lines = buildReport({ name: b.name, dateLabel, today, ins });
      const worded = await reword(lines);
      await send(b.owner_wa, toParam(worded ? worded.split('\n').filter(Boolean) : lines));
      return worded ? 'sent_ai' : 'sent';
    } catch (e) { await store.nightlyRelease(b.id).catch(() => {}); log.error && log.error('nightly report failed for business', b.id, e.message); return 'failed'; }
  }

  // Call every few minutes. Only acts from 10 PM local time onward, once per local day per business.
  async function run() {
    if (!sendReady) return { skipped: 'whatsapp_not_configured' };
    const out = {};
    for (const b of await store.nightlyDue()) { if (b.local_hour < hour) continue; out[b.id] = await sendFor(b); }
    return out;
  }
  return { run, sendFor, buildReport, toParam, sendReady, aiReady };
}
module.exports = { createNightly, buildReport, toParam, inr };
