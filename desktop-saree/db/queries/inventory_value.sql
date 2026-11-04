-- Total inventory value at cost (what you paid for the pieces still on the shelf).
SELECT COALESCE(SUM(remaining_qty * unit_cost_paise), 0) AS inventory_paise,
       COALESCE(SUM(remaining_qty), 0)                   AS pieces
FROM stock_batches WHERE remaining_qty > 0;
