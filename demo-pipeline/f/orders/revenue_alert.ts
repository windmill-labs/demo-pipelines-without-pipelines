// pipeline
// on datatable://main/daily_revenue

// Terminal consumer: fires after every daily_revenue refresh and flags days
// above the threshold. No output asset — pure side effect (think Slack ping).
import * as wmill from "windmill-client";

export async function main(threshold_usd: number = 1000) {
  const dt = wmill.datatable("main");
  const rows: any[] =
    await dt`SELECT order_date, revenue_usd, orders FROM daily_revenue ORDER BY order_date DESC`.fetch();
  const hot = rows.filter((r) => Number(r.revenue_usd) >= threshold_usd);
  return {
    days: rows.length,
    above_threshold: hot,
    message: `${hot.length} day(s) above $${threshold_usd}`,
  };
}
