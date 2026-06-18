-- pipeline
-- on datatable://main/orders_clean

-- Fan-out branch: product leaderboard recomputed on every orders_clean write.
ATTACH 'datatable://main' AS pg;

DROP TABLE IF EXISTS pg.top_products;
CREATE TABLE pg.top_products AS
SELECT
  product,
  category,
  sum(qty) AS units,
  round(sum(amount), 2) AS revenue
FROM pg.orders_clean
GROUP BY product, category
ORDER BY revenue DESC
LIMIT 10;
