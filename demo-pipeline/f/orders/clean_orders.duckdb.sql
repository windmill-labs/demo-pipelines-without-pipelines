-- pipeline
-- on datatable://main/orders_raw

-- Dedup + typing layer: keeps the latest row per order_id and drops junk.
ATTACH 'datatable://main' AS pg;

DROP TABLE IF EXISTS pg.orders_clean;
CREATE TABLE pg.orders_clean AS
SELECT
  order_id,
  product,
  category,
  qty,
  unit_price,
  upper(currency) AS currency,
  qty * unit_price AS amount,
  CAST(ordered_at AS DATE) AS order_date
FROM pg.orders_raw
WHERE qty > 0 AND unit_price > 0
QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY ordered_at DESC) = 1;
