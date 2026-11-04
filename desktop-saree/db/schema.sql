-- KIRO Saree & Boutique: SQLite schema. Money is stored as INTEGER paise (never floats).
-- Dates: purchase_date = 'YYYY-MM-DD', invoice_date = 'YYYY-MM-DD HH:MM:SS' (shop local time).
-- Run with: PRAGMA foreign_keys = ON; (src/db.js does this on every connection)

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,                      -- "Banarasi Silk Saree"
  fabric       TEXT NOT NULL,                      -- Cotton, Banarasi, Silk, Georgette ...  (the "type" the dashboard groups by)
  hsn_code     TEXT,
  gst_percent  REAL NOT NULL DEFAULT 5 CHECK (gst_percent BETWEEN 0 AND 28),  -- set per product; confirm rates with your CA
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_variants (
  id                    INTEGER PRIMARY KEY,
  product_id            INTEGER NOT NULL REFERENCES products(id),
  color                 TEXT NOT NULL DEFAULT '',
  design_code           TEXT NOT NULL,
  barcode               TEXT UNIQUE,
  purchase_price_paise  INTEGER NOT NULL CHECK (purchase_price_paise >= 0),   -- latest cost, default for new batches
  selling_price_paise   INTEGER NOT NULL CHECK (selling_price_paise >= 0),   -- GST-inclusive shelf price
  current_stock         INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0), -- kept equal to SUM(batch remaining) by triggers
  UNIQUE (product_id, design_code, color)
);
CREATE INDEX IF NOT EXISTS idx_variants_design ON product_variants (design_code);

-- One row per purchase lot. This is what makes "age of stock" possible.
CREATE TABLE IF NOT EXISTS stock_batches (
  id                INTEGER PRIMARY KEY,
  variant_id        INTEGER NOT NULL REFERENCES product_variants(id),
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  remaining_qty     INTEGER NOT NULL CHECK (remaining_qty >= 0 AND remaining_qty <= quantity_received),
  purchase_date     TEXT NOT NULL,
  unit_cost_paise   INTEGER NOT NULL CHECK (unit_cost_paise >= 0),           -- cost of THIS lot (can differ between lots)
  supplier          TEXT
);
-- Only lots that still hold stock are ever queried for age/FIFO, so index just those.
CREATE INDEX IF NOT EXISTS idx_batches_open_fifo ON stock_batches (variant_id, purchase_date, id) WHERE remaining_qty > 0;
CREATE INDEX IF NOT EXISTS idx_batches_open_age  ON stock_batches (purchase_date) WHERE remaining_qty > 0;

CREATE TRIGGER IF NOT EXISTS trg_batch_ai AFTER INSERT ON stock_batches BEGIN
  UPDATE product_variants SET current_stock = current_stock + NEW.remaining_qty WHERE id = NEW.variant_id;
END;
CREATE TRIGGER IF NOT EXISTS trg_batch_au AFTER UPDATE OF remaining_qty ON stock_batches BEGIN
  UPDATE product_variants SET current_stock = current_stock + (NEW.remaining_qty - OLD.remaining_qty) WHERE id = NEW.variant_id;
END;
CREATE TRIGGER IF NOT EXISTS trg_batch_ad AFTER DELETE ON stock_batches BEGIN
  UPDATE product_variants SET current_stock = current_stock - OLD.remaining_qty WHERE id = OLD.variant_id;
END;

CREATE TABLE IF NOT EXISTS sales_invoices (
  id              INTEGER PRIMARY KEY,
  invoice_no      TEXT NOT NULL UNIQUE,
  invoice_date    TEXT NOT NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  subtotal_paise  INTEGER NOT NULL,
  discount_paise  INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  taxable_paise   INTEGER NOT NULL,
  cgst_paise      INTEGER NOT NULL,
  sgst_paise      INTEGER NOT NULL,
  total_paise     INTEGER NOT NULL,
  payment_mode    TEXT NOT NULL CHECK (payment_mode IN ('Cash','UPI','Card','Credit')),
  status          TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON sales_invoices (invoice_date, status);

CREATE TABLE IF NOT EXISTS sales_items (
  id                 INTEGER PRIMARY KEY,
  invoice_id         INTEGER NOT NULL REFERENCES sales_invoices(id),
  variant_id         INTEGER NOT NULL REFERENCES product_variants(id),
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  returned_qty       INTEGER NOT NULL DEFAULT 0 CHECK (returned_qty >= 0 AND returned_qty <= quantity),
  unit_price_paise   INTEGER NOT NULL,
  discount_paise     INTEGER NOT NULL DEFAULT 0,
  gst_percent        REAL NOT NULL,
  taxable_paise      INTEGER NOT NULL,
  cgst_paise         INTEGER NOT NULL,
  sgst_paise         INTEGER NOT NULL,
  line_total_paise   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_variant ON sales_items (variant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON sales_items (invoice_id);

-- Which lots each sold piece came from (FIFO), so returns go back to the right lot.
CREATE TABLE IF NOT EXISTS sale_item_batches (
  sale_item_id  INTEGER NOT NULL REFERENCES sales_items(id),
  batch_id      INTEGER NOT NULL REFERENCES stock_batches(id),
  qty           INTEGER NOT NULL CHECK (qty > 0),
  returned_qty  INTEGER NOT NULL DEFAULT 0 CHECK (returned_qty >= 0 AND returned_qty <= qty),
  PRIMARY KEY (sale_item_id, batch_id)
);

CREATE TABLE IF NOT EXISTS discount_alerts (
  id          INTEGER PRIMARY KEY,
  variant_id  INTEGER NOT NULL REFERENCES product_variants(id),
  percent     INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 90),
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
