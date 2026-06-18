// pipeline
// on schedule

// Second source of the pipeline: refreshed on a schedule, independent of
// order uploads. daily_revenue joins both sources, so the graph shows a
// proper multi-source DAG.
import * as wmill from "windmill-client";

export async function main() {
  // Demo rates with a little jitter — production would hit an FX API here.
  const base: Record<string, number> = { USD: 1.0, EUR: 1.09, GBP: 1.27, JPY: 0.0067 };
  const dt = wmill.datatable("main");
  await dt`CREATE TABLE IF NOT EXISTS fx_rates (
    currency text primary key,
    usd_rate double precision,
    fetched_at timestamp default now()
  )`.fetch();
  await dt`DELETE FROM fx_rates`.fetch();
  for (const [currency, rate] of Object.entries(base)) {
    const jittered = +(rate * (1 + (Math.random() - 0.5) * 0.01)).toFixed(6);
    await dt`INSERT INTO fx_rates (currency, usd_rate) VALUES (${currency}, ${jittered})`.fetch();
  }
  return { refreshed: Object.keys(base) };
}
