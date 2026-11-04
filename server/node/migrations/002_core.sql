-- KIRO core: businesses, staff logins, items, stock lots, sales and invoices. PostgreSQL 13+.
-- Money is always integer paise. Every tenant table carries business_id and every query filters on it.

CREATE TABLE IF NOT EXISTS businesses (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(120) NOT NULL,
  biz_type         VARCHAR(30)  NOT NULL DEFAULT 'general',   -- pharmacy | grocery | saree | ... (app decides the screens)
  gstin            VARCHAR(15),
  upi_vpa          VARCHAR(100),                              -- shown as the UPI QR payee in the app
  tz               VARCHAR(40)  NOT NULL DEFAULT 'Asia/Kolkata',
  invoice_prefix   VARCHAR(10)  NOT NULL DEFAULT 'INV',
  last_invoice_no  INT          NOT NULL DEFAULT 0,           -- locked + incremented inside create_sale()
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id               BIGSERIAL PRIMARY KEY,
  business_id      INT NOT NULL REFERENCES businesses(id),
  login            VARCHAR(60)  NOT NULL,                     -- phone number or staff id, globally unique (case-insensitive)
  name             VARCHAR(80)  NOT NULL,
  role             VARCHAR(12)  NOT NULL CHECK (role IN ('owner','manager','accounts','pos')),
  pw_hash          TEXT NOT NULL,                             -- "scrypt$N$r$p$salt$hash" (see src/password.js); never plaintext
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts  INT NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_login_uq ON users (lower(login));
CREATE INDEX IF NOT EXISTS users_business_idx ON users (business_id);

CREATE TABLE IF NOT EXISTS items (
  id            BIGSERIAL PRIMARY KEY,
  business_id   INT NOT NULL REFERENCES businesses(id),
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(60)  NOT NULL DEFAULT 'General',
  barcode       VARCHAR(40),
  price_paise   BIGINT NOT NULL CHECK (price_paise >= 0),     -- selling price, GST INCLUDED (matches the web app)
  cost_paise    BIGINT NOT NULL DEFAULT 0 CHECK (cost_paise >= 0),
  gst_pct       NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (gst_pct >= 0 AND gst_pct <= 28),
  track_stock   BOOLEAN NOT NULL DEFAULT TRUE,                -- FALSE for services
  min_stock     INT NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS items_barcode_uq ON items (business_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_business_idx ON items (business_id, active);

-- One row per purchase/receipt. Sales consume lots oldest-expiry first, then oldest received first.
CREATE TABLE IF NOT EXISTS stock_lots (
  id            BIGSERIAL PRIMARY KEY,
  business_id   INT NOT NULL REFERENCES businesses(id),
  item_id       BIGINT NOT NULL REFERENCES items(id),
  batch_no      VARCHAR(40),
  expiry        DATE,                                          -- pharmacy batches; NULL otherwise
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  qty_in        INT NOT NULL CHECK (qty_in > 0),
  qty_left      INT NOT NULL CHECK (qty_left >= 0),
  cost_paise    BIGINT NOT NULL DEFAULT 0 CHECK (cost_paise >= 0),   -- per unit
  status        VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','quarantine'))
);
CREATE INDEX IF NOT EXISTS lots_item_idx ON stock_lots (item_id, received_at);
CREATE INDEX IF NOT EXISTS lots_business_idx ON stock_lots (business_id) WHERE qty_left > 0;

CREATE TABLE IF NOT EXISTS sales (
  id               BIGSERIAL PRIMARY KEY,
  business_id      INT NOT NULL REFERENCES businesses(id),
  seq              INT NOT NULL,                               -- gapless per business
  invoice_no       VARCHAR(40) NOT NULL,                       -- e.g. INV/000012
  user_id          BIGINT NOT NULL REFERENCES users(id),
  user_name        VARCHAR(80) NOT NULL,                       -- snapshot: stays correct if the staff member is renamed
  customer_name    VARCHAR(80),
  customer_phone   VARCHAR(15),
  subtotal_paise   BIGINT NOT NULL,
  discount_paise   BIGINT NOT NULL DEFAULT 0,
  total_paise      BIGINT NOT NULL CHECK (total_paise >= 0),
  cgst_paise       BIGINT NOT NULL DEFAULT 0,
  sgst_paise       BIGINT NOT NULL DEFAULT 0,
  payments         JSONB  NOT NULL,                            -- [{"mode":"CASH","amountPaise":12300}, ...]
  status           VARCHAR(8) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','void')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_no),
  UNIQUE (business_id, seq)
);
CREATE INDEX IF NOT EXISTS sales_business_time_idx ON sales (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_user_idx ON sales (business_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sale_lines (
  id                 BIGSERIAL PRIMARY KEY,
  sale_id            BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id            BIGINT NOT NULL REFERENCES items(id),
  name               VARCHAR(120) NOT NULL,                    -- snapshot
  category           VARCHAR(60)  NOT NULL,                    -- snapshot (fast-mover report groups by this)
  qty                INT NOT NULL CHECK (qty > 0),
  unit_price_paise   BIGINT NOT NULL,
  line_total_paise   BIGINT NOT NULL,                          -- after this line's share of the bill discount
  gst_pct            NUMERIC(4,1) NOT NULL,
  tax_paise          BIGINT NOT NULL,                          -- GST contained in line_total_paise
  cost_paise         BIGINT NOT NULL DEFAULT 0                 -- cost of the lots consumed (for margin)
);
CREATE INDEX IF NOT EXISTS sale_lines_sale_idx ON sale_lines (sale_id);
CREATE INDEX IF NOT EXISTS sale_lines_item_idx ON sale_lines (item_id);

CREATE TABLE IF NOT EXISTS sale_line_lots (                    -- which lots each line consumed (needed for returns later)
  sale_line_id  BIGINT NOT NULL REFERENCES sale_lines(id) ON DELETE CASCADE,
  lot_id        BIGINT NOT NULL REFERENCES stock_lots(id),
  qty           INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (sale_line_id, lot_id)
);

-- Start/end of a reporting period in the business's own time zone.
CREATE OR REPLACE FUNCTION kiro_period(p_tz text, p_period text)
RETURNS TABLE (f timestamptz, t timestamptz) LANGUAGE sql STABLE AS $$
  WITH d AS (SELECT date_trunc('day', now() AT TIME ZONE p_tz) AS today)
  SELECT CASE p_period
           WHEN 'yesterday' THEN (today - interval '1 day') AT TIME ZONE p_tz
           WHEN 'week'      THEN (today - interval '6 days') AT TIME ZONE p_tz
           WHEN 'month'     THEN date_trunc('month', today) AT TIME ZONE p_tz
           WHEN 'year'      THEN date_trunc('year', today) AT TIME ZONE p_tz
           WHEN 'all'       THEN '-infinity'::timestamptz
           ELSE today AT TIME ZONE p_tz END,
         CASE p_period
           WHEN 'yesterday' THEN today AT TIME ZONE p_tz
           ELSE 'infinity'::timestamptz END
  FROM d
$$;

-- Atomic bill creation. Either everything below happens (invoice number, stock deduction, lines,
-- payments) or nothing does. Raises SQLSTATE KS001 (bad input), KS404 (unknown item), KS409 (not enough stock).
-- p_payload: {"customer":{"name","phone"}, "discountPaise":0,
--             "lines":[{"itemId":1,"qty":2,"unitPricePaise":optional}],
--             "payments":[{"mode":"CASH|UPI|CARD|CREDIT","amountPaise":n}]}
CREATE OR REPLACE FUNCTION create_sale(p_business int, p_user bigint, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_user      users%ROWTYPE;
  v_biz       businesses%ROWTYPE;
  v_line      jsonb;
  v_item      items%ROWTYPE;
  v_lot       RECORD;
  v_qty       int;
  v_need      int;
  v_take      int;
  v_cost      bigint;
  v_lots      jsonb;
  v_lines     jsonb := '[]'::jsonb;
  v_before    bigint := 0;
  v_disc      bigint := COALESCE((p_payload->>'discountPaise')::bigint, 0);
  v_total     bigint;
  v_paid      bigint := 0;
  v_pay       jsonb;
  v_alloc     bigint;
  v_given     bigint := 0;
  v_eff       bigint;
  v_tax       bigint;
  v_taxsum    bigint := 0;
  v_cgst      bigint;
  v_n         int;
  v_i         int := 0;
  v_unit      bigint;
  v_sale_id   bigint;
  v_line_id   bigint;
  v_invoice   text;
  v_seq       int;
  v_out       jsonb;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user AND business_id = p_business AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown user' USING ERRCODE = 'KS001'; END IF;
  IF jsonb_typeof(p_payload->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'lines') = 0 THEN
    RAISE EXCEPTION 'a bill needs at least one line' USING ERRCODE = 'KS001';
  END IF;
  IF jsonb_array_length(p_payload->'lines') > 200 THEN RAISE EXCEPTION 'too many lines' USING ERRCODE = 'KS001'; END IF;
  IF v_disc < 0 THEN RAISE EXCEPTION 'discount cannot be negative' USING ERRCODE = 'KS001'; END IF;

  -- Serialise bills per business: this row lock is what makes invoice numbers gapless and race-free.
  UPDATE businesses SET last_invoice_no = last_invoice_no + 1 WHERE id = p_business
    RETURNING * INTO v_biz;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown business' USING ERRCODE = 'KS001'; END IF;
  v_seq := v_biz.last_invoice_no;
  v_invoice := v_biz.invoice_prefix || '/' || lpad(v_seq::text, 6, '0');

  -- Pass 1: price lines and take stock (FEFO, then FIFO).
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_payload->'lines') LOOP
    v_qty := (v_line->>'qty')::int;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 100000 THEN RAISE EXCEPTION 'invalid quantity' USING ERRCODE = 'KS001'; END IF;
    SELECT * INTO v_item FROM items
      WHERE id = (v_line->>'itemId')::bigint AND business_id = p_business AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'item % not found', v_line->>'itemId' USING ERRCODE = 'KS404'; END IF;
    v_unit := COALESCE((v_line->>'unitPricePaise')::bigint, v_item.price_paise);
    IF v_unit < 0 THEN RAISE EXCEPTION 'invalid price' USING ERRCODE = 'KS001'; END IF;
    v_cost := 0; v_lots := '[]'::jsonb;
    IF v_item.track_stock THEN
      v_need := v_qty;
      FOR v_lot IN
        SELECT id, qty_left, cost_paise FROM stock_lots
        WHERE item_id = v_item.id AND business_id = p_business AND qty_left > 0 AND status = 'active'
          AND (expiry IS NULL OR expiry >= (now() AT TIME ZONE v_biz.tz)::date)
        ORDER BY expiry NULLS LAST, received_at, id FOR UPDATE
      LOOP
        EXIT WHEN v_need = 0;
        v_take := LEAST(v_need, v_lot.qty_left);
        UPDATE stock_lots SET qty_left = qty_left - v_take WHERE id = v_lot.id;
        v_cost := v_cost + v_take * v_lot.cost_paise;
        v_lots := v_lots || jsonb_build_array(jsonb_build_object('lot', v_lot.id, 'qty', v_take));
        v_need := v_need - v_take;
      END LOOP;
      IF v_need > 0 THEN
        RAISE EXCEPTION 'not enough stock for %', v_item.name USING ERRCODE = 'KS409';
      END IF;
    END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'item', v_item.id, 'name', v_item.name, 'category', v_item.category, 'qty', v_qty,
      'unit', v_unit, 'gross', v_unit * v_qty, 'gst', v_item.gst_pct, 'cost', v_cost, 'lots', v_lots));
    v_before := v_before + v_unit * v_qty;
  END LOOP;

  IF v_disc > v_before THEN RAISE EXCEPTION 'discount is more than the bill' USING ERRCODE = 'KS001'; END IF;
  -- Server-set cap (never from the client): cashiers may discount at most this % of the bill.
  IF p_payload->>'maxDiscountPct' IS NOT NULL AND v_disc * 100 > v_before * (p_payload->>'maxDiscountPct')::numeric THEN
    RAISE EXCEPTION 'discount is more than you are allowed to give (% percent)', p_payload->>'maxDiscountPct' USING ERRCODE = 'KS001';
  END IF;
  v_total := v_before - v_disc;

  -- Payments must add up to the bill exactly.
  IF jsonb_typeof(p_payload->'payments') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'payments') = 0 THEN
    RAISE EXCEPTION 'payment is required' USING ERRCODE = 'KS001';
  END IF;
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payload->'payments') LOOP
    IF (v_pay->>'mode') NOT IN ('CASH','UPI','CARD','CREDIT') THEN RAISE EXCEPTION 'invalid payment mode' USING ERRCODE = 'KS001'; END IF;
    IF (v_pay->>'amountPaise')::bigint <= 0 THEN RAISE EXCEPTION 'invalid payment amount' USING ERRCODE = 'KS001'; END IF;
    v_paid := v_paid + (v_pay->>'amountPaise')::bigint;
  END LOOP;
  IF v_paid <> v_total THEN RAISE EXCEPTION 'payments (%) do not match the bill total (%)', v_paid, v_total USING ERRCODE = 'KS001'; END IF;

  -- Pass 2: share the discount across lines, split out the GST that is inside each price, write rows.
  v_n := jsonb_array_length(v_lines);
  INSERT INTO sales (business_id, seq, invoice_no, user_id, user_name, customer_name, customer_phone,
                     subtotal_paise, discount_paise, total_paise, payments)
  VALUES (p_business, v_seq, v_invoice, v_user.id, v_user.name,
          NULLIF(left(p_payload#>>'{customer,name}', 80), ''), NULLIF(left(p_payload#>>'{customer,phone}', 15), ''),
          v_before, v_disc, v_total, p_payload->'payments')
  RETURNING id INTO v_sale_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
    v_i := v_i + 1;
    IF v_i = v_n THEN v_alloc := v_disc - v_given;                       -- last line absorbs the rounding remainder
    ELSIF v_before = 0 THEN v_alloc := 0;
    ELSE v_alloc := round(v_disc::numeric * (v_line->>'gross')::bigint / v_before);
    END IF;
    v_given := v_given + v_alloc;
    v_eff := (v_line->>'gross')::bigint - v_alloc;
    v_tax := round(v_eff::numeric * (v_line->>'gst')::numeric / (100 + (v_line->>'gst')::numeric));
    v_taxsum := v_taxsum + v_tax;
    INSERT INTO sale_lines (sale_id, item_id, name, category, qty, unit_price_paise, line_total_paise, gst_pct, tax_paise, cost_paise)
    VALUES (v_sale_id, (v_line->>'item')::bigint, v_line->>'name', v_line->>'category', (v_line->>'qty')::int,
            (v_line->>'unit')::bigint, v_eff, (v_line->>'gst')::numeric, v_tax, (v_line->>'cost')::bigint)
    RETURNING id INTO v_line_id;
    INSERT INTO sale_line_lots (sale_line_id, lot_id, qty)
      SELECT v_line_id, (x->>'lot')::bigint, (x->>'qty')::int FROM jsonb_array_elements(v_line->'lots') x;
  END LOOP;

  v_cgst := v_taxsum / 2;
  UPDATE sales SET cgst_paise = v_cgst, sgst_paise = v_taxsum - v_cgst WHERE id = v_sale_id;

  SELECT jsonb_build_object('id', id, 'invoiceNo', invoice_no, 'totalPaise', total_paise,
                            'cgstPaise', cgst_paise, 'sgstPaise', sgst_paise, 'createdAt', created_at)
    INTO v_out FROM sales WHERE id = v_sale_id;
  RETURN v_out;
END $$;

-- Business signup: business + owner login in one transaction. Unique login violation surfaces as 23505.
CREATE OR REPLACE FUNCTION create_business(p_name text, p_type text, p_owner text, p_login text, p_hash text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_biz int; v_user bigint;
BEGIN
  INSERT INTO businesses (name, biz_type) VALUES (p_name, p_type) RETURNING id INTO v_biz;
  INSERT INTO users (business_id, login, name, role, pw_hash) VALUES (v_biz, p_login, p_owner, 'owner', p_hash) RETURNING id INTO v_user;
  RETURN jsonb_build_object('businessId', v_biz, 'userId', v_user);
END $$;

-- New item with an optional opening stock lot, atomically.
CREATE OR REPLACE FUNCTION create_item(p_business int, p_item jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_id bigint; v_qty int := COALESCE((p_item#>>'{stock,qty}')::int, 0);
BEGIN
  INSERT INTO items (business_id, name, category, barcode, price_paise, cost_paise, gst_pct, track_stock, min_stock)
  VALUES (p_business, p_item->>'name', COALESCE(p_item->>'category', 'General'), NULLIF(p_item->>'barcode', ''),
          (p_item->>'pricePaise')::bigint, COALESCE((p_item->>'costPaise')::bigint, 0), COALESCE((p_item->>'gstPct')::numeric, 0),
          COALESCE((p_item->>'trackStock')::boolean, TRUE), COALESCE((p_item->>'minStock')::int, 0))
  RETURNING id INTO v_id;
  IF v_qty > 0 THEN
    INSERT INTO stock_lots (business_id, item_id, batch_no, expiry, qty_in, qty_left, cost_paise)
    VALUES (p_business, v_id, NULLIF(p_item#>>'{stock,batchNo}', ''), NULLIF(p_item#>>'{stock,expiry}', '')::date,
            v_qty, v_qty, COALESCE((p_item->>'costPaise')::bigint, 0));
  END IF;
  RETURN jsonb_build_object('id', v_id);
END $$;
