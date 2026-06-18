-- pipeline
-- on datatable://main/orders_clean
-- on datatable://main/fx_rates

-- Fan-in: joins the cleaned orders with the scheduled FX snapshot and
-- aggregates revenue in USD per day. Subscribed to BOTH upstream tables.
ATTACH 'datatable://main' AS pg;

DROP TABLE IF EXISTS pg.daily_revenue;
CREATE TABLE pg.daily_revenue AS
SELECT
  o.order_date,
  round(sum(o.amount * fx.usd_rate), 2) AS revenue_usd,
  count(DISTINCT o.order_id) AS orders
FROM pg.orders_clean o
JOIN pg.fx_rates fx USING (currency)
GROUP BY o.order_date
ORDER BY o.order_date;
