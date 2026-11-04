-- KIRO Smart Inventory Insights: SQLite schema (for the future server or desktop build).
-- The browser app computes the same numbers from its own data; this is the relational version.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  fabric_type TEXT NOT NULL            -- Cotton, Banarasi, Silk ... (the "category" used for trends)
);
CREATE TABLE IF NOT EXISTS product_variants (
  id             INTEGER PRIMARY KEY,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  color          TEXT,
  design_code    TEXT,
  barcode        TEXT UNIQUE,
  purchase_price INTEGER NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),  -- paise
  selling_price  INTEGER NOT NULL CHECK (selling_price >= 0),             -- paise, GST included
  current_stock  INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0)
);
CREATE TABLE IF NOT EXISTS stock_batches (          -- one row per purchase lot: gives the AGE of stock
  id                INTEGER PRIMARY KEY,
  variant_id        INTEGER NOT NULL REFERENCES product_variants(id),
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  purchase_date     TEXT NOT NULL,                  -- YYYY-MM-DD
  remaining_qty     INTEGER NOT NULL CHECK (remaining_qty >= 0),
  unit_cost         INTEGER                         -- paise; NULL = use variant purchase_price
);
CREATE TABLE IF NOT EXISTS sales_invoices (
  id           INTEGER PRIMARY KEY,
  invoice_date TEXT NOT NULL,                       -- YYYY-MM-DD
  status       TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded')),
  discount     INTEGER NOT NULL DEFAULT 0,          -- paise
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash','UPI','Card')),
  total        INTEGER NOT NULL                     -- paise, GST included
);
CREATE TABLE IF NOT EXISTS sales_items (
  id         INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL                       -- paise
);
CREATE INDEX IF NOT EXISTS idx_batches_variant ON stock_batches(variant_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_items_variant   ON sales_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_date        ON sales_invoices(invoice_date, status);
