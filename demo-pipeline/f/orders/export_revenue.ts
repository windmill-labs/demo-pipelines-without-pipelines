// pipeline
// on datatable://main/daily_revenue
// partitioned daily

// Partitioned export branch 1/2 of the AND-join showcase. Snapshots the
// daily_revenue table to object storage. `// partitioned daily` makes each
// run carry a concrete partition (today's date, injected as the `partition`
// arg); the `{partition}` token in the literal S3 key below is what the
// lineage parser keys the downstream `// trigger all` join on.
import * as wmill from "windmill-client";

export async function main(partition?: string) {
  const dt = wmill.datatable("main");
  const rows = await dt`SELECT order_date, revenue_usd, orders FROM daily_revenue ORDER BY order_date`.fetch();
  const written = await wmill.writeS3File(
    { s3: "exports/{partition}/revenue.json" },
    JSON.stringify({ partition, rows }, null, 2)
  );
  return { partition, rows: rows.length, file: written.s3 };
}
