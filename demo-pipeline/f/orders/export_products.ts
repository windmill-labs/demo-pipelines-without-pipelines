// pipeline
// on datatable://main/top_products
// partitioned daily

// Partitioned export branch 2/2 of the AND-join showcase. Snapshots the
// top_products table to object storage; same daily partition scheme as
// export_revenue so the downstream join can match the two slots.
import * as wmill from "windmill-client";

export async function main(partition?: string) {
  const dt = wmill.datatable("main");
  const rows = await dt`SELECT product, category, units, revenue FROM top_products ORDER BY revenue DESC`.fetch();
  const written = await wmill.writeS3File(
    { s3: "exports/{partition}/products.json" },
    JSON.stringify({ partition, rows }, null, 2)
  );
  return { partition, rows: rows.length, file: written.s3 };
}
