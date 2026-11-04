/* KIRO cashier screen: show a PhonePe QR and react the moment the webhook marks the bill Paid.
   Plain browser JS (no build step). Usage:

     const stop = KiroPay.watchBill({
       apiBase: 'https://api.your-domain.example',
       billId: '123',
       getToken: () => sessionToken,          // same bearer token the rest of the POS uses
       onPaid:    () => KiroPay.showSuccess(payBox),   // then print the receipt and clear the bill
       onExpired: () => showNewQrButton(),
       onError:   (kind) => showMessage(kind),         // kind: 'auth' | 'network' | 'review'
     });
     // call stop() if the cashier cancels or switches bill.

   Latency: the screen learns about payment within one poll interval (default 2 s) after the webhook
   commits. For true push, replace polling with SSE/WebSocket plus Postgres LISTEN/NOTIFY or Redis pub/sub
   once you run more than one server. */
(function (root) {
  'use strict';

  function watchBill(o) {
    var interval = o.intervalMs || 2000, stopped = false, timer = null, fails = 0, ctl = null;

    function schedule(ms) { if (!stopped) timer = setTimeout(tick, ms); }
    function stop() { stopped = true; clearTimeout(timer); if (ctl) ctl.abort(); document.removeEventListener('visibilitychange', onVis); }
    function onVis() { if (!document.hidden && !stopped) { clearTimeout(timer); tick(); } }
    document.addEventListener('visibilitychange', onVis);

    async function tick() {
      ctl = new AbortController();
      try {
        var r = await fetch(o.apiBase + '/api/bills/' + encodeURIComponent(o.billId) + '/status', {
          headers: { Authorization: 'Bearer ' + o.getToken() }, cache: 'no-store', signal: ctl.signal,
        });
        if (r.status === 401) { stop(); return o.onError && o.onError('auth'); }
        if (!r.ok) throw new Error('http ' + r.status);
        var d = await r.json();
        fails = 0;
        if (d.status === 'Paid') { stop(); return o.onPaid && o.onPaid(d); }
        if (d.status === 'Review') { stop(); return o.onError && o.onError('review'); } // amount mismatch: do not release goods
        if (d.expired) { stop(); return o.onExpired && o.onExpired(); }
        schedule(document.hidden ? 10000 : interval);
      } catch (e) {
        if (stopped) return;
        fails++;
        if (fails === 3 && o.onError) o.onError('network'); // tell the cashier, keep trying
        schedule(Math.min(15000, interval * Math.pow(2, Math.min(fails, 3))));
      }
    }
    tick();
    return stop;
  }

  // Small animated tick. Respects prefers-reduced-motion.
  function showSuccess(el) {
    var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML =
      '<div role="status" aria-live="polite" style="text-align:center;padding:24px">' +
      '<svg width="96" height="96" viewBox="0 0 52 52" aria-hidden="true">' +
      '<circle cx="26" cy="26" r="24" fill="none" stroke="#16a34a" stroke-width="3"' + (still ? '' : ' stroke-dasharray="151" stroke-dashoffset="151"') + '>' +
      (still ? '' : '<animate attributeName="stroke-dashoffset" to="0" dur=".5s" fill="freeze"/>') + '</circle>' +
      '<path d="M14 27l8 8 16-17" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"' + (still ? '' : ' stroke-dasharray="40" stroke-dashoffset="40"') + '>' +
      (still ? '' : '<animate attributeName="stroke-dashoffset" to="0" dur=".4s" begin=".45s" fill="freeze"/>') + '</path></svg>' +
      '<p style="font-weight:800;font-size:20px;margin:8px 0 0">Payment received</p></div>';
  }

  root.KiroPay = { watchBill: watchBill, showSuccess: showSuccess };
})(window);
