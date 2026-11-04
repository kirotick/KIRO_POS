-- :today is a YYYY-MM-DD parameter (pass it in so tests are repeatable).

-- Q1 DEAD STOCK: batch older than 90 days, pieces left, and the variant has not sold in 90 days.
-- name: dead_stock
SELECT p.name, v.design_code, v.color, b.id AS batch_id, b.purchase_date,
       CAST(julianday(:today) - julianday(b.purchase_date) AS INTEGER) AS days_on_shelf,
       b.remaining_qty,
       b.remaining_qty * COALESCE(b.unit_cost, v.purchase_price) AS locked_paise
FROM stock_batches b
JOIN product_variants v ON v.id = b.variant_id
JOIN products p         ON p.id = v.product_id
WHERE b.remaining_qty > 0
  AND julianday(:today) - julianday(b.purchase_date) > 90
  AND NOT EXISTS (
        SELECT 1 FROM sales_items si JOIN sales_invoices i ON i.id = si.invoice_id
        WHERE si.variant_id = b.variant_id AND i.status = 'paid'
          AND i.invoice_date >= date(:today, '-90 days'))
ORDER BY locked_paise DESC;

-- Q1b total capital stuck in dead stock
-- name: stuck_capital
SELECT COALESCE(SUM(locked_paise), 0) AS stuck_paise FROM (
  SELECT b.remaining_qty * COALESCE(b.unit_cost, v.purchase_price) AS locked_paise
  FROM stock_batches b JOIN product_variants v ON v.id = b.variant_id
  WHERE b.remaining_qty > 0 AND julianday(:today) - julianday(b.purchase_date) > 90
    AND NOT EXISTS (SELECT 1 FROM sales_items si JOIN sales_invoices i ON i.id = si.invoice_id
                    WHERE si.variant_id = b.variant_id AND i.status = 'paid'
                      AND i.invoice_date >= date(:today, '-90 days')));

-- Q2 FAST-MOVING: top 5 fabric types by pieces sold in the last 14 days
-- name: fast_movers
SELECT p.fabric_type, SUM(si.quantity) AS pieces_sold
FROM sales_items si
JOIN sales_invoices i    ON i.id = si.invoice_id
JOIN product_variants v  ON v.id = si.variant_id
JOIN products p          ON p.id = v.product_id
WHERE i.status = 'paid' AND i.invoice_date >= date(:today, '-14 days')
GROUP BY p.fabric_type
ORDER BY pieces_sold DESC, p.fabric_type
LIMIT 5;

-- Q3 total inventory value at cost
-- name: inventory_value
SELECT COALESCE(SUM(b.remaining_qty * COALESCE(b.unit_cost, v.purchase_price)), 0) AS value_paise
FROM stock_batches b JOIN product_variants v ON v.id = b.variant_id WHERE b.remaining_qty > 0;

-- Q4 inclusive GST split for a bill total (5% textiles): run in app code, shown here for reference
-- tax = total - total/1.05 ; CGST = tax/2 ; SGST = tax - CGST
