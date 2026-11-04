-- DEAD STOCK: lots older than 90 days that still hold pieces AND whose design has had no (net) sale in the last 90 days.
-- Params: :today ('YYYY-MM-DD')
SELECT
  b.id                                                        AS batch_id,
  v.id                                                        AS variant_id,
  p.name, p.fabric, v.color, v.design_code,
  b.purchase_date,
  CAST(julianday(:today) - julianday(b.purchase_date) AS INTEGER) AS days_on_shelf,
  b.remaining_qty,
  b.remaining_qty * b.unit_cost_paise                         AS locked_paise,
  v.selling_price_paise
FROM stock_batches b
JOIN product_variants v ON v.id = b.variant_id
JOIN products p         ON p.id = v.product_id
WHERE b.remaining_qty > 0
  AND b.purchase_date < date(:today, '-90 days')
  AND NOT EXISTS (
    SELECT 1
    FROM sales_items si
    JOIN sales_invoices i ON i.id = si.invoice_id
    WHERE si.variant_id = b.variant_id
      AND i.status = 'paid'
      AND i.invoice_date >= date(:today, '-90 days')
      AND si.quantity > si.returned_qty          -- a fully returned sale does not count as a sale
  )
ORDER BY locked_paise DESC, days_on_shelf DESC;
