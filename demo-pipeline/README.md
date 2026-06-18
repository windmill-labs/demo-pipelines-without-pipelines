# Data Pipelines demo — `f/orders`

A polyglot, asset-driven pipeline managed entirely from this repo with
`wmill sync push`. Everything on the canvas — membership, lineage edges,
triggers, cascade subscriptions — is derived from the script bodies at
deploy time; there is no separate pipeline definition file.

## The DAG

```
 DATA UPLOAD                      SCHEDULE (every 6h)
      │                                │
 ingest_orders (Bun)            fetch_fx_rates (Bun)
      │                                │
 orders_raw ──► clean_orders (DuckDB)  │
                     │                 │
                orders_clean ──────┐   │
                  │       │        ▼   ▼
                  │       │     daily_revenue (DuckDB, fan-in + retry)
                  │       ▼        │
                  │  top_products  ▼
                  │   (DuckDB)   daily_revenue ──► revenue_alert (Python)
                  │       │        │
                  │       ▼        ▼
                  │  export_products   export_revenue    (Bun, partitioned daily)
                  │       │        │
                  │       ▼        ▼
                  │  …/{partition}/products.json  …/{partition}/revenue.json
                  │           ╲      ╱
                  │            ▼    ▼
                  │     daily_digest (Bun, AND-join: `// trigger all`)
                  │            │
                  │            ▼
                  │     daily_digest table
```

- **`ingest_orders.ts`** — `// on data_upload`: UI-first entry point. In the
  pipeline View, clicking the Data upload node opens a run form (sample
  payload pre-filled); Run is a *legitimate* execution — the backend
  dispatcher cascades through the whole DAG.
- **`fetch_fx_rates.ts`** — `// on schedule`: second, independent source
  (schedule pushed from `refresh_fx_rates.schedule.yaml`).
- **`clean_orders.sql`** — `// on datatable://main/orders_raw`: DuckDB
  dedup/typing layer.
- **`daily_revenue.sql`** — fan-in, subscribed to **both** `orders_clean`
  and `fx_rates`, with `-- retry 2 30s`.
- **`top_products.sql`** — fan-out branch of `orders_clean`.
- **`revenue_alert.py`** — terminal Python consumer of `daily_revenue`, no
  output asset.
- **`export_revenue.ts` / `export_products.ts`** — `// partitioned daily`:
  each run resolves a concrete partition (today, injected as the `partition`
  arg) and snapshots its table to `s3:///exports/{partition}/….json`. The
  `{partition}` token in the literal S3 key is what makes the write
  partition-bearing in the lineage.
- **`daily_digest.ts`** — **AND-join showcase**: `// trigger all` turns its
  two `// on s3:///exports/{partition}/….json` subscriptions into a join
  barrier keyed by partition. One export alone shows as **JoinPending (1/2)**
  in Activity — e.g. an fx-schedule refresh only feeds the revenue branch and
  the digest waits. A data upload completes both branches for the day and the
  digest fires exactly once, upserting `datatable://main/daily_digest`.

## How the annotations work

- `// pipeline` (alone on a line) marks a script as a pipeline member.
- `// on <asset-uri>` subscribes the script to writes of that asset
  (`datatable://`, `ducklake://`, `s3://`…) — this is what drives the
  cascade at runtime.
- `// on data_upload | schedule | webhook | kafka | …` declares a
  source-trigger marker rendered on the canvas.
- `// trigger all` turns a script's `// on` asset subscriptions into an
  AND-join barrier: it fires once per partition, when *every*
  partition-bearing input (`{partition}` in the asset path) has arrived for
  that partition. Default (`any`) fires on each input write.
- `// retry <n> [delay]`, `// tag <worker-tag>`, `// partitioned daily`,
  `// freshness 1h` tune the cascade behavior.
- Reads/writes (lineage edges) are inferred from the code itself
  (`wmill.datatable("main")` calls, `ATTACH 'datatable://main'` + `pg.<table>`
  references, `wmill.loadS3File`, …).

## Sample input

[`sample-data/orders.json`](sample-data/orders.json) is the order-export file the
pipeline expects — a JSON array matching `ingest_orders`'s schema (`order_id`,
`product`, `category`, `qty`, `unit_price`, `currency`, `ordered_at`). Upload it in
the **Data upload** run form to drive the whole cascade. It spans three days and all
four FX currencies (USD/EUR/GBP/JPY), and deliberately includes one duplicate
`order_id` (dedup keeps the latest) and one zero-qty junk row (dropped by
`clean_orders`), so the cleaning layer visibly does something.

## Demo flow

```bash
wmill sync push                 # deploy the whole pipeline from this repo
```

1. Open **Pipeline** (`/pipeline/orders` in the data-pipelines workspace) —
   lands in **View** mode: deployed DAG + Activity pane preloaded with the
   last 30 days of runs.
2. Click the **Data upload** node → run form opens (upload the order export
   JSON file) → **Run**. Watch the cascade light up node by node, and the
   runs stream into Activity (expand a row for args/logs/result inline).
   Both export branches land and the **daily_digest AND-join** fires once.
3. Join barrier in isolation: run **fetch_fx_rates** alone — the revenue
   branch refreshes, but daily_digest shows **JoinPending (1/2)** in
   Activity and waits until the products export for the same day arrives
   (next data upload).
4. Toggle **Edit**, tweak a script (e.g. change the `LIMIT` in
   top_products), **Save all** — or edit the file here and `wmill sync push`
   again: same result.
5. With unsaved drafts, the **Show N drafts** chip in View previews the
   future DAG without leaving the deployed truth.
