-- Where the money sits, by age of stock (value at cost).
SELECT CASE
         WHEN age <= 30 THEN '0-30 days'
         WHEN age <= 60 THEN '31-60 days'
         WHEN age <= 90 THEN '61-90 days'
         ELSE 'Over 90 days' END AS bucket,
       SUM(value_paise) AS value_paise
FROM (SELECT CAST(julianday(:today) - julianday(purchase_date) AS INTEGER) AS age,
             remaining_qty * unit_cost_paise AS value_paise
      FROM stock_batches WHERE remaining_qty > 0)
GROUP BY bucket
ORDER BY MIN(age);
