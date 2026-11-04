-- Barcode scan or typed/spoken design code. Spaces and dashes are ignored: "ks 101" matches "KS-101".
-- Params: :q (raw text), :qn (same text, upper-cased, spaces/dashes removed by the app), :limit
SELECT v.id AS variant_id, p.name, p.fabric, v.color, v.design_code, v.barcode,
       v.selling_price_paise, v.current_stock, p.gst_percent
FROM product_variants v JOIN products p ON p.id = v.product_id
WHERE p.is_active = 1
  AND ( v.barcode = :q
     OR REPLACE(REPLACE(UPPER(v.design_code), '-', ''), ' ', '') = :qn
     OR REPLACE(REPLACE(UPPER(v.design_code), '-', ''), ' ', '') LIKE :qn || '%'
     OR UPPER(p.name) LIKE '%' || UPPER(:q) || '%'
     OR UPPER(p.fabric) = UPPER(:q) )
ORDER BY (v.barcode = :q) DESC, v.current_stock > 0 DESC, p.name
LIMIT :limit;
