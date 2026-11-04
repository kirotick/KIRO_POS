-- FAST-MOVING fabrics: top 5 by pieces sold in the last 14 calendar days (today + previous 13). Net of returns.
-- Params: :today, :days_back (13 for 14 days, 6 for "this week"), :limit (5)
SELECT p.fabric,
       SUM(si.quantity - si.returned_qty)                            AS units_sold,
       SUM((si.quantity - si.returned_qty) * si.unit_price_paise)    AS revenue_paise
FROM sales_items si
JOIN sales_invoices i    ON i.id = si.invoice_id
JOIN product_variants v  ON v.id = si.variant_id
JOIN products p          ON p.id = v.product_id
WHERE i.status = 'paid'
  AND i.invoice_date >= date(:today, '-' || :days_back || ' days')
  AND i.invoice_date <  date(:today, '+1 day')
GROUP BY p.fabric
HAVING units_sold > 0
ORDER BY units_sold DESC, revenue_paise DESC, p.fabric
LIMIT :limit;
