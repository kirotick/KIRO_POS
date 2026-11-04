-- Total money locked in dead stock (same rule as dead_stock.sql).
SELECT COALESCE(SUM(b.remaining_qty * b.unit_cost_paise), 0) AS stuck_paise,
       COUNT(*) AS lots
FROM stock_batches b
WHERE b.remaining_qty > 0
  AND b.purchase_date < date(:today, '-90 days')
  AND NOT EXISTS (
    SELECT 1 FROM sales_items si JOIN sales_invoices i ON i.id = si.invoice_id
    WHERE si.variant_id = b.variant_id AND i.status = 'paid'
      AND i.invoice_date >= date(:today, '-90 days') AND si.quantity > si.returned_qty);
