// pipeline
// on data_upload

// Entry point of the orders pipeline. Upload an order export file (JSON
// array) in the run form and hit Run — every downstream script cascades
// automatically through its `// on datatable://…` subscription. This is the
// production dispatch, not a simulation.
import * as wmill from "windmill-client";
import type { S3Object } from "windmill-client";

export async function main(orders_file: S3Object) {
  const raw = await wmill.loadS3File(orders_file);
  if (!raw) {
    throw new Error(`could not read uploaded file ${orders_file?.s3}`);
  }
  const orders = JSON.parse(new TextDecoder().decode(raw));
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new Error("expected a non-empty JSON array of orders");
  }
  const dt = wmill.datatable("main");
  await dt`CREATE TABLE IF NOT EXISTS orders_raw (
    order_id text,
    product text,
    category text,
    qty int,
    unit_price double precision,
    currency text,
    ordered_at timestamp
  )`.fetch();
  await dt`DELETE FROM orders_raw`.fetch();
  for (const r of orders) {
    await dt`INSERT INTO orders_raw (order_id, product, category, qty, unit_price, currency, ordered_at)
      VALUES (${r.order_id}, ${r.product}, ${r.category}, ${r.qty}, ${r.unit_price}, ${r.currency}, CAST(${r.ordered_at} AS timestamp))`.fetch();
  }
  return { ingested: orders.length };
}
