// pipeline
// trigger all
// on s3:///exports/{partition}/revenue.json
// on s3:///exports/{partition}/products.json

// AND-join showcase: `// trigger all` turns the two `// on` subscriptions
// into a join barrier. A single export arriving opens the day's slot and
// shows up as JoinPending (1/2) in Activity; the digest runs exactly once
// per partition, when BOTH exports for the same day have landed. An
// fx-schedule refresh alone (revenue branch only) leaves it waiting — a
// data upload completes both branches and releases the barrier.
import * as wmill from "windmill-client";

export async function main(partition?: string) {
  const revenue = JSON.parse(
    new TextDecoder().decode(
      await wmill.loadS3File({ s3: "exports/{partition}/revenue.json" })
    )
  );
  const products = JSON.parse(
    new TextDecoder().decode(
      await wmill.loadS3File({ s3: "exports/{partition}/products.json" })
    )
  );

  const revenueTotal = revenue.rows.reduce(
    (acc: number, r: any) => acc + Number(r.revenue_usd),
    0
  );
  const orders = revenue.rows.reduce(
    (acc: number, r: any) => acc + Number(r.orders),
    0
  );
  const topProduct = products.rows[0]?.product ?? null;

  const dt = wmill.datatable("main");
  await dt`CREATE TABLE IF NOT EXISTS daily_digest (
    day text PRIMARY KEY,
    revenue_usd_total double precision,
    orders int,
    top_product text
  )`.fetch();
  await dt`INSERT INTO daily_digest (day, revenue_usd_total, orders, top_product)
    VALUES (${partition}, ${Math.round(revenueTotal * 100) / 100}, ${orders}, ${topProduct})
    ON CONFLICT (day) DO UPDATE SET
      revenue_usd_total = EXCLUDED.revenue_usd_total,
      orders = EXCLUDED.orders,
      top_product = EXCLUDED.top_product`.fetch();

  return { partition, revenue_usd_total: revenueTotal, orders, top_product: topProduct };
}
