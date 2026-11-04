'use strict';
// SQL for logins, staff, items, sales and reports. `pool` is a pg Pool (or anything with query(text, params)).
// Every query is parameterised and filtered by business_id. bigint/numeric come back as strings from pg, so
// numbers are normalised with num() (paise stay far below 2^53).
const num = (v) => (v === null || v === undefined ? v : Number(v));
const esc = (s) => String(s).replace(/[\\%_]/g, (c) => '\\' + c);

module.exports = (pool) => {
  const all = async (text, params) => (await pool.query(text, params)).rows;
  const one = async (text, params) => (await all(text, params))[0] || null;
  const PERIOD = `pr AS (SELECT f, t FROM businesses b, kiro_period(b.tz, $2) WHERE b.id = $1)`;
  return {
    createBusiness: (name, type, owner, login, hash) => one(`SELECT create_business($1,$2,$3,$4,$5) AS r`, [name, type, owner, login, hash]).then((x) => x.r),
    getBusiness: (id) => one(`SELECT id, name, biz_type, gstin, upi_vpa, invoice_prefix, tz FROM businesses WHERE id=$1`, [id]),
    updateBusiness: (id, f) => one(
      `UPDATE businesses SET name=COALESCE($2,name), gstin=COALESCE($3,gstin), upi_vpa=COALESCE($4,upi_vpa)
       WHERE id=$1 RETURNING id`, [id, f.name ?? null, f.gstin ?? null, f.upiVpa ?? null]),

    // ---- nightly owner report ----
    setNightly: (id, { ownerWa, on }) => one(
      `UPDATE businesses SET owner_wa=COALESCE($2,owner_wa), nightly_report=COALESCE($3,nightly_report) WHERE id=$1 RETURNING id`, [id, ownerWa ?? null, on ?? null]),
    getNightly: (id) => one(`SELECT owner_wa, nightly_report, nightly_last FROM businesses WHERE id=$1`, [id]),
    // Businesses that have it on, have a number, and have not been sent today's report yet (local date in their own time zone).
    nightlyDue: () => all(
      `SELECT id, name, owner_wa, tz, extract(hour FROM (now() AT TIME ZONE tz))::int AS local_hour
       FROM businesses WHERE nightly_report AND owner_wa IS NOT NULL AND nightly_last IS DISTINCT FROM (now() AT TIME ZONE tz)::date`),
    // Claim today's slot BEFORE sending (atomic, so two server copies cannot both send). Returns null if already claimed.
    nightlyClaim: (id) => one(
      `UPDATE businesses SET nightly_last=(now() AT TIME ZONE tz)::date
       WHERE id=$1 AND nightly_report AND nightly_last IS DISTINCT FROM (now() AT TIME ZONE tz)::date RETURNING id, nightly_last`, [id]),
    nightlyRelease: (id) => one(`UPDATE businesses SET nightly_last=NULL WHERE id=$1 RETURNING id`, [id]),

    // ---- users ----
    getUserByLogin: (login) => one(`SELECT id, business_id, name, role, pw_hash, active, failed_attempts, locked_until FROM users WHERE lower(login)=lower($1)`, [login]),
    getUserById: (businessId, id) => one(`SELECT id, business_id, login, name, role, active, pw_hash FROM users WHERE business_id=$1 AND id=$2`, [businessId, id]),
    loginFailed: (id, lockAfter, lockMinutes) => one(
      `UPDATE users SET failed_attempts=failed_attempts+1,
         locked_until=CASE WHEN failed_attempts+1>=$2 THEN now()+make_interval(mins => $3) ELSE locked_until END
       WHERE id=$1 RETURNING failed_attempts`, [id, lockAfter, lockMinutes]),
    loginOk: (id) => one(`UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=now() WHERE id=$1 RETURNING last_login_at`, [id]),
    setPassword: (businessId, id, hash) => one(
      `UPDATE users SET pw_hash=$3, failed_attempts=0, locked_until=NULL WHERE business_id=$1 AND id=$2 RETURNING id`, [businessId, id, hash]),
    listStaff: (businessId) => all(
      `WITH pr AS (SELECT f, t FROM businesses b, kiro_period(b.tz,'today') WHERE b.id=$1)
       SELECT u.id, u.login, u.name, u.role, u.active, u.last_login_at,
              COALESCE(s.bills,0) AS bills_today, COALESCE(s.total,0) AS total_today
       FROM users u LEFT JOIN (
         SELECT user_id, count(*) AS bills, sum(total_paise) AS total FROM sales, pr
         WHERE business_id=$1 AND status='paid' AND created_at>=pr.f AND created_at<pr.t GROUP BY user_id) s ON s.user_id=u.id
       WHERE u.business_id=$1 ORDER BY (u.role='owner') DESC, lower(u.name)`, [businessId])
      .then((r) => r.map((x) => ({ ...x, id: String(x.id), bills_today: num(x.bills_today), total_today: num(x.total_today) }))),
    createStaff: (businessId, login, name, role, hash) => one(
      `INSERT INTO users (business_id, login, name, role, pw_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [businessId, login, name, role, hash]),
    updateStaff: (businessId, id, f) => one(
      `UPDATE users SET name=COALESCE($3,name), role=COALESCE($4,role), active=COALESCE($5,active)
       WHERE business_id=$1 AND id=$2 RETURNING id`, [businessId, id, f.name ?? null, f.role ?? null, f.active ?? null]),

    // ---- items & stock ----
    listItems: (businessId, { q, barcode, lowOnly, limit }) => all(
      `SELECT i.id, i.name, i.category, i.barcode, i.price_paise, i.cost_paise, i.gst_pct, i.track_stock, i.min_stock, i.active,
              COALESCE(l.stock,0) AS stock, l.oldest
       FROM items i LEFT JOIN (
         SELECT item_id, sum(qty_left) AS stock, min(received_at) FILTER (WHERE qty_left>0) AS oldest
         FROM stock_lots WHERE business_id=$1 AND status='active' GROUP BY item_id) l ON l.item_id=i.id
       WHERE i.business_id=$1 AND i.active
         AND ($2::text IS NULL OR i.name ILIKE '%'||$2||'%' ESCAPE '\\' OR i.category ILIKE '%'||$2||'%' ESCAPE '\\')
         AND ($3::text IS NULL OR i.barcode=$3)
         AND (NOT $4::boolean OR (i.track_stock AND COALESCE(l.stock,0)<=i.min_stock))
       ORDER BY lower(i.name) LIMIT $5`, [businessId, q ? esc(q) : null, barcode || null, !!lowOnly, limit])
      .then((r) => r.map((x) => ({ ...x, id: String(x.id), price_paise: num(x.price_paise), cost_paise: num(x.cost_paise), gst_pct: num(x.gst_pct), stock: num(x.stock) }))),
    createItem: (businessId, item) => one(`SELECT create_item($1,$2::jsonb) AS r`, [businessId, JSON.stringify(item)]).then((x) => x.r),
    updateItem: (businessId, id, f) => one(
      `UPDATE items SET name=COALESCE($3,name), category=COALESCE($4,category), price_paise=COALESCE($5,price_paise),
         cost_paise=COALESCE($6,cost_paise), gst_pct=COALESCE($7,gst_pct), min_stock=COALESCE($8,min_stock), active=COALESCE($9,active)
       WHERE business_id=$1 AND id=$2 RETURNING id`,
      [businessId, id, f.name ?? null, f.category ?? null, f.pricePaise ?? null, f.costPaise ?? null, f.gstPct ?? null, f.minStock ?? null, f.active ?? null]),
    receiveStock: (businessId, itemId, qty, costPaise, batchNo, expiry) => one(
      `INSERT INTO stock_lots (business_id, item_id, batch_no, expiry, qty_in, qty_left, cost_paise)
       SELECT $1, i.id, $4, $5::date, $3, $3, $6 FROM items i WHERE i.id=$2 AND i.business_id=$1 AND i.track_stock
       RETURNING id`, [businessId, itemId, qty, batchNo || null, expiry || null, costPaise]),

    // ---- sales ----
    createSale: (businessId, userId, payload) => one(`SELECT create_sale($1,$2,$3::jsonb) AS r`, [businessId, userId, JSON.stringify(payload)]).then((x) => x.r),
    listSales: (businessId, { period, userId, q, beforeSeq, limit }) => all(
      `WITH ${PERIOD}
       SELECT s.id, s.seq, s.invoice_no, s.user_id, s.user_name, s.customer_name, s.customer_phone, s.total_paise, s.payments, s.status, s.created_at
       FROM sales s, pr
       WHERE s.business_id=$1 AND s.created_at>=pr.f AND s.created_at<pr.t
         AND ($3::bigint IS NULL OR s.user_id=$3)
         AND ($4::bigint IS NULL OR s.seq<$4)
         AND ($5::text IS NULL OR s.invoice_no ILIKE '%'||$5||'%' ESCAPE '\\' OR s.customer_name ILIKE '%'||$5||'%' ESCAPE '\\' OR s.customer_phone LIKE '%'||$5||'%' ESCAPE '\\')
       ORDER BY s.seq DESC LIMIT $6`, [businessId, period, userId ?? null, beforeSeq ?? null, q ? esc(q) : null, limit])
      .then((r) => r.map((x) => ({ ...x, id: String(x.id), user_id: String(x.user_id), total_paise: num(x.total_paise) }))),
    // exact invoice number, or just the number part ("12" finds INV/000012)
    lookupSale: (businessId, token) => one(
      `SELECT id FROM sales WHERE business_id=$1 AND (lower(invoice_no)=lower($2) OR ($3::int IS NOT NULL AND seq=$3::int)) ORDER BY seq DESC LIMIT 1`,
      [businessId, token, /^\d{1,9}$/.test(token) ? Number(token) : null]),
    getSale: async (businessId, id) => {
      const s = await one(`SELECT id, seq, invoice_no, user_id, user_name, customer_name, customer_phone, subtotal_paise, discount_paise,
          total_paise, cgst_paise, sgst_paise, payments, status, created_at FROM sales WHERE business_id=$1 AND id=$2`, [businessId, id]);
      if (!s) return null;
      const lines = await all(`SELECT item_id, name, category, qty, unit_price_paise, line_total_paise, gst_pct, tax_paise, cost_paise
          FROM sale_lines WHERE sale_id=$1 ORDER BY id`, [id]);
      return { ...s, id: String(s.id), user_id: String(s.user_id), subtotal_paise: num(s.subtotal_paise), discount_paise: num(s.discount_paise), total_paise: num(s.total_paise),
        cgst_paise: num(s.cgst_paise), sgst_paise: num(s.sgst_paise),
        lines: lines.map((l) => ({ ...l, item_id: String(l.item_id), unit_price_paise: num(l.unit_price_paise), line_total_paise: num(l.line_total_paise), tax_paise: num(l.tax_paise), gst_pct: num(l.gst_pct), cost_paise: num(l.cost_paise) })) };
    },

    // ---- reports ----
    // Raw material for the analytics engine: paid bills with their lines, last N days (paise). Capped so one request cannot pull the whole database.
    analyticsSales: (businessId, days, cap = 50000) => all(
      `SELECT s.id, s.invoice_no, s.user_name, s.customer_name, s.customer_phone, s.total_paise, s.discount_paise, s.created_at,
         COALESCE((SELECT json_agg(json_build_object('id', l.item_id, 'n', l.name, 'cat', l.category, 'q', l.qty, 'a', l.line_total_paise, 'c', l.cost_paise) ORDER BY l.id)
                   FROM sale_lines l WHERE l.sale_id = s.id), '[]'::json) AS lines
       FROM sales s WHERE s.business_id=$1 AND s.status='paid' AND s.created_at >= now() - make_interval(days => $2)
       ORDER BY s.created_at LIMIT $3`, [businessId, days, cap])
      .then((r) => r.map((x) => ({ no: x.invoice_no, t: new Date(x.created_at).getTime(), by: x.user_name, cust: (x.customer_phone || x.customer_name || '').trim(),
        total: num(x.total_paise), disc: num(x.discount_paise), lines: (typeof x.lines === 'string' ? JSON.parse(x.lines) : x.lines).map((l) => ({ id: l.id, n: l.n, cat: l.cat, q: Number(l.q), a: num(l.a), c: num(l.c) })) }))),
    topCustomers: (businessId, period, limit = 5) => all(
      `WITH ${PERIOD}
       SELECT COALESCE(NULLIF(s.customer_name,''), s.customer_phone) AS name, s.customer_phone AS phone, count(*) AS bills, sum(s.total_paise) AS total
       FROM sales s, pr WHERE s.business_id=$1 AND s.status='paid' AND s.created_at>=pr.f AND s.created_at<pr.t
         AND (COALESCE(s.customer_name,'')<>'' OR COALESCE(s.customer_phone,'')<>'')
       GROUP BY 1, 2 ORDER BY 4 DESC LIMIT $3`, [businessId, period, limit])
      .then((r) => r.map((x) => ({ name: x.name, phone: x.phone, bills: num(x.bills), totalPaise: num(x.total) }))),
    summary: async (businessId, period, userId) => {
      const base = `WITH ${PERIOD} SELECT`;
      const filt = `s.business_id=$1 AND s.status='paid' AND s.created_at>=pr.f AND s.created_at<pr.t AND ($3::bigint IS NULL OR s.user_id=$3)`;
      const args = [businessId, period, userId ?? null];
      const totals = await one(`${base} count(*) AS bills, COALESCE(sum(s.total_paise),0) AS total, COALESCE(sum(s.cgst_paise),0) AS cgst,
          COALESCE(sum(s.sgst_paise),0) AS sgst, COALESCE(sum(s.discount_paise),0) AS discount,
          (array_agg(s.invoice_no ORDER BY s.seq))[1] AS first_invoice, (array_agg(s.invoice_no ORDER BY s.seq DESC))[1] AS last_invoice
          FROM sales s, pr WHERE ${filt}`, args);
      const modes = await all(`${base} p->>'mode' AS mode, sum((p->>'amountPaise')::bigint) AS amount
          FROM sales s, pr, jsonb_array_elements(s.payments) p WHERE ${filt} GROUP BY 1 ORDER BY 2 DESC`, args);
      const staff = await all(`${base} s.user_id, s.user_name AS name, count(*) AS bills, sum(s.total_paise) AS total
          FROM sales s, pr WHERE ${filt} GROUP BY s.user_id, s.user_name ORDER BY 4 DESC`, args);
      const items = await all(`${base} l.name, sum(l.qty) AS qty, sum(l.line_total_paise) AS total
          FROM sale_lines l JOIN sales s ON s.id=l.sale_id, pr WHERE ${filt} GROUP BY l.name ORDER BY 2 DESC, 3 DESC LIMIT 10`, args);
      return {
        bills: num(totals.bills), totalPaise: num(totals.total), cgstPaise: num(totals.cgst), sgstPaise: num(totals.sgst), discountPaise: num(totals.discount),
        firstInvoice: totals.first_invoice, lastInvoice: totals.last_invoice,
        byMode: modes.map((m) => ({ mode: m.mode, amountPaise: num(m.amount) })),
        byStaff: staff.map((x) => ({ userId: String(x.user_id), name: x.name, bills: num(x.bills), totalPaise: num(x.total) })),
        topItems: items.map((x) => ({ name: x.name, qty: num(x.qty), totalPaise: num(x.total) })),
      };
    },
    insights: async (businessId) => {
      const kpi = await one(
        `SELECT COALESCE(sum(qty_left*cost_paise) FILTER (WHERE status='active'),0) AS inv,
                COALESCE(sum(qty_left*cost_paise) FILTER (WHERE status='active' AND expiry < (now() AT TIME ZONE b.tz)::date),0) AS expired
         FROM stock_lots l JOIN businesses b ON b.id=l.business_id WHERE l.business_id=$1 AND l.qty_left>0`, [businessId]);
      // Dead stock = lot older than 90 whole days AND that item has not sold in the last 90 days.
      const dead = await all(
        `SELECT i.id AS item_id, i.name, l.batch_no, l.qty_left, l.cost_paise, l.qty_left*l.cost_paise AS locked,
                floor(extract(epoch FROM now()-l.received_at)/86400)::int AS age_days
         FROM stock_lots l JOIN items i ON i.id=l.item_id
         WHERE l.business_id=$1 AND l.qty_left>0 AND l.status='active'
           AND floor(extract(epoch FROM now()-l.received_at)/86400) > 90
           AND NOT EXISTS (SELECT 1 FROM sale_lines sl JOIN sales s ON s.id=sl.sale_id
                           WHERE sl.item_id=i.id AND s.status='paid' AND s.created_at >= now()-interval '90 days')
         ORDER BY locked DESC LIMIT 50`, [businessId]);
      const fast = await all(
        `SELECT sl.category, sum(sl.qty) AS qty FROM sale_lines sl JOIN sales s ON s.id=sl.sale_id
         WHERE s.business_id=$1 AND s.status='paid' AND s.created_at >= now()-interval '14 days'
         GROUP BY sl.category ORDER BY 2 DESC, 1 LIMIT 5`, [businessId]);
      const expiring = await all(
        `SELECT i.id AS item_id, i.name, l.batch_no, l.expiry, l.qty_left, l.qty_left*l.cost_paise AS value,
                (l.expiry < (now() AT TIME ZONE b.tz)::date) AS expired
         FROM stock_lots l JOIN items i ON i.id=l.item_id JOIN businesses b ON b.id=l.business_id
         WHERE l.business_id=$1 AND l.qty_left>0 AND l.expiry IS NOT NULL AND l.expiry <= (now() AT TIME ZONE b.tz)::date + 90
         ORDER BY l.expiry LIMIT 50`, [businessId]);
      const low = await all(
        `SELECT i.id AS item_id, i.name, COALESCE(sum(l.qty_left) FILTER (WHERE l.status='active'),0) AS stock, i.min_stock
         FROM items i LEFT JOIN stock_lots l ON l.item_id=i.id
         WHERE i.business_id=$1 AND i.active AND i.track_stock GROUP BY i.id
         HAVING COALESCE(sum(l.qty_left) FILTER (WHERE l.status='active'),0) <= i.min_stock ORDER BY 3, lower(i.name) LIMIT 50`, [businessId]);
      return {
        inventoryPaise: num(kpi.inv), expiredPaise: num(kpi.expired),
        stuckPaise: dead.reduce((a, d) => a + num(d.locked), 0),
        dead: dead.map((d) => ({ itemId: String(d.item_id), name: d.name, batchNo: d.batch_no, qty: num(d.qty_left), costPaise: num(d.cost_paise), lockedPaise: num(d.locked), ageDays: d.age_days })),
        fastMovers: fast.map((f) => ({ category: f.category, qty: num(f.qty) })),
        expiring: expiring.map((e) => ({ itemId: String(e.item_id), name: e.name, batchNo: e.batch_no, expiry: String(e.expiry).slice(0, 10), qty: num(e.qty_left), valuePaise: num(e.value), expired: !!e.expired })),
        lowStock: low.map((l) => ({ itemId: String(l.item_id), name: l.name, stock: num(l.stock), min: l.min_stock })),
      };
    },
  };
};
