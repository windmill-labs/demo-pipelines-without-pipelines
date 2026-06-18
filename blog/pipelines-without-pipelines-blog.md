# Pipelines Without Pipelines

### How we built a data-pipeline engine with no pipeline object — a finite state machine you never wrote, implemented by the scripts themselves

Every workflow engine you've used has a *thing that is the graph*. Airflow has a DAG file. Temporal has a workflow function. Step Functions has a state-machine JSON. Our own product, Windmill, has flows. You write the graph; the engine runs the graph. The graph is the source of truth.

This post is about the opposite idea. We built a data-pipeline engine for Windmill where there is **no pipeline** — no DAG file, no orchestrator, nothing that says "A then B then C." You write scripts. The pipeline is an *emergent property* of what those scripts read and write. Nobody draws it; it's discovered.

That sounds like a parlor trick, and the rest of this post is me trying to convince you it isn't. The short version: the whole thing is held together by one parser we compile twice — once to native Rust, once to WebAssembly — so the exact same code that *executes* the graph in the backend also *draws* it in your browser as you type. Zero drift, by construction rather than by discipline.

To explain why that's load-bearing, I have to start with the thing we're contrasting against.

---

## The baseline: a flow is a finite state machine

Windmill's atomic unit is a script run as a job (TypeScript, Python, Go, SQL, Bash, and friends). *Flows* stitch scripts into a workflow.

A flow is not code. It's data — a `FlowValue`:

```rust
// backend/windmill-types/src/flows.rs
struct FlowValue {
    modules: Vec<FlowModule>,   // the whole graph, as data
    ...
}
```

Each `FlowModule` is a tagged union: it's a `Script`, or a `ForloopFlow`, a `WhileloopFlow`, a `BranchOne`, a `BranchAll`, a nested `Flow`, even an `AIAgent`. Control flow — retries, suspend-for-approval, stop-after-if, skip-if — is just more fields on the struct. The entire *shape* of the workflow is known before a single job runs.

Execution is a second structure that mirrors the first. `FlowValue` is the program; `FlowStatus` is the program counter plus per-step state:

```rust
// backend/windmill-types/src/flow_status.rs
struct FlowStatus {
    step: i32,                       // the cursor
    modules: Vec<FlowStatusModule>,  // per-step state
    ...
}

enum FlowStatusModule {
    WaitingForPriorSteps, WaitingForExecutor,
    InProgress, Success, Failure, WaitingForEvents,
}
```

That's the whole state machine: an integer `step`, and for each module one of six states. After every step, `FlowStatus` is serialized to JSONB in Postgres. So the engine itself is stateless — `handle_flow` / `push_next_flow_job` in `worker_flow.rs` loads the definition, loads the status, looks at the current module, dispatches the next job, writes the new status back, and forgets everything.

This buys you a lot. The graph is data, so the UI can render it and introspect it. The position is data, so any worker can resume any flow mid-execution — crash a worker and another picks up from the row. The engine is a pure function of `(definition, status)`. This is the correct, boring-in-a-good-way design that essentially every workflow engine converges on.

The key property to hold onto: **the engine is generic, and the graph lives in the definition.**

---

## The heretical question

So what if there were *no definition*?

What if the graph were an emergent property of the scripts — never written down anywhere? You write a script that reads a table and writes another table. I write a script that reads *your* table. The pipeline is just… whatever falls out of a hundred such scripts, each declaring what it touches. Nobody opens a pipeline editor. Nobody drags a line from A to B. The DAG is discovered, not authored.

For data pipelines specifically, this is a real ergonomic win. The "graph" of a data platform is usually *already implied* by your data dependencies — this query reads `orders`, that one writes it. Forcing an engineer to *also* maintain a separate DAG file that restates those dependencies is busywork, and busywork that drifts.

Here's how we made it real.

---

## There is no pipeline

Search the schema for a pipeline entity. It isn't there. There are scripts, and there's an `asset` table.

An **asset** is a data product with a URI scheme: `s3://`, `datatable://` (DuckDB tables), `ducklake://`, `$res:` (a Windmill resource like a DB connection), `volume://`. A script *reads* assets and *writes* assets.

Look at two DuckDB scripts:

```sql
-- producer.sql
ATTACH 'datatable://main' AS db;
CREATE TABLE db.orders AS SELECT ... ;       -- WRITES orders

-- consumer.sql
ATTACH 'datatable://main' AS db;
-- on datatable://main/orders                -- subscribes to orders
CREATE TABLE db.report AS SELECT ... FROM db.orders;   -- READS orders
```

`producer` writes `orders`. `consumer` reads `orders`. I never wrote "producer → consumer" anywhere. The edge exists because one script's write matches another script's read — and we know that because we **parsed the SQL** and saw the table names.

The one explicit bit is the `// on datatable://main/orders` comment: the consumer subscribing — "wake me when `orders` changes." Even that references the *asset*, not the upstream script. The consumer has never heard of the producer.

The graph is the union of every script's reads and writes. Nobody owns it. It's emergent.

---

## The graph is a query, not an artifact

At deploy time, we parse each script's body and write rows:

```
asset(path, kind, access_type, usage_path)
  orders   datatable   W   f/producer
  orders   datatable   R   f/consumer
```

The "asset graph" is then not a stored object — it's a `SELECT`. The `/assets/graph` endpoint selects all asset usages and all triggers, joins them back into nodes and edges, and returns them. It's reconstructed on every call.

That has a delightful consequence: there's nothing to keep in sync. No compiled DAG artifact that can drift from the code. Rename a script, change a table it writes, and the next graph fetch just reflects reality. The map can't be stale because there is no map — only the territory.

Where flows make the graph the source of truth, pipelines make the *scripts* the source of truth and the graph a derived view.

---

## Execution: dispatch, not orchestration

A flow has a conductor — `push_next_flow_job` literally increments `step` and decides what runs next. Centralized.

A pipeline has no conductor. It's a chain reaction. When *any* top-level script finishes successfully, we run `dispatch_asset_triggers`. The module's own doc comment says it best:

```rust
// backend/windmill-queue/src/asset_dispatch.rs
//! When a script writes an asset and a downstream script subscribes to
//! that asset via `// on s3://...`, this module pushes a job for each
//! subscriber after the producer's job completes successfully. Any
//! asset-writing top-level script cascades — there is no `// pipeline`
//! gate on the producer side; subscriptions alone define the graph.
```

The core is one loop:

```rust
let producers = workspace_producer_writes(db, &job.workspace_id).await?;   // cached
let Some(writes) = producers.get(runnable_path).cloned() else { return Ok(..) };

for (asset_kind, asset_path) in writes {
    let subs = fetch_subscribers(db, &job.workspace_id, &trigger_ref).await?;
    for sub in subs {
        if sub.path == runnable_path { continue; }   // skip self-loops
        if sub.join_all { /* AND-join: wait for all inputs */ }
        push_subscriber(db, job, &sub.path, ..., depth + 1, ...).await?;
    }
}
```

What did this job write? Who subscribed? Push them a job. Those jobs finish, write *their* assets, dispatch again. It's pub/sub where the topics are tables and files. The producer emits a write and moves on — it has never heard of its consumers; two consumers of the same asset don't know about each other.

This is the same inversion as callbacks vs. a main loop, or actors vs. a scheduler. We just made the messages be "a table changed." And it's cheap: this hook fires on *every* top-level completion, but the producer-writes map is cached per workspace and invalidated by a Postgres trigger on the `asset` table, so a script that writes nothing costs one in-memory hashmap lookup and zero queries.

---

## The part that makes it safe: one parser, compiled twice

Here's the obvious objection. This whole design rests on correctly knowing what each script reads and writes — and we need that answer in two very different places:

- The **backend** needs it, *authoritatively*, at deploy — because it literally decides which jobs fire. Get it wrong and the wrong things run.
- The **frontend** needs it, *instantly*, on every keystroke — because the entire pitch is that you watch the graph grow as you type.

The naive move is two parsers: a real one in Rust, a "good enough" one in JavaScript for the editor. That's two sources of truth, and they *will* drift. Your editor draws an edge that doesn't fire, or misses one that does. For a tool whose whole value proposition is "trust this emergent graph," that's a credibility-killing class of bug.

So we don't have two implementations.

The asset parsers live in `backend/parsers/windmill-parser-{sql,ts,py}-asset`. They're real parsers, not regexes — the SQL one runs the actual DuckDB-dialect parser and walks the AST:

```rust
// windmill-parser-sql-asset/src/asset_parser.rs
pub fn parse_assets(input: &str) -> anyhow::Result<ParseAssetsOutput> {
    let statements = Parser::parse_sql(&DuckDbDialect, input)?;
    let mut collector = AssetCollector::new();
    for statement in statements { let _ = statement.visit(&mut collector); }
    // reads/writes resolved from ATTACH bindings + table references
}
```

That code is Rust, and we compile it two ways.

**Native**, it links into the backend and produces the authoritative asset rows at deploy.

**Through `wasm-pack`**, the *same crate* becomes a WASM module. The export is a four-line shim that forwards to the identical function:

```rust
// backend/parsers/windmill-parser-wasm/src/lib.rs
#[cfg(feature = "asset-parser")]
#[wasm_bindgen]
pub fn parse_assets_sql(code: &str) -> String {
    match windmill_parser_sql_asset::parse_assets(code) {   // same fn the backend calls
        Ok(r)  => serde_json::to_string(&r).unwrap(),
        Err(e) => format!("err: {:?}", e),
    }
}
```

And the Svelte editor imports it and calls it on every change:

```ts
// frontend/src/lib/infer.ts
import initAssetParser, {
  parse_assets_ts, parse_assets_py, parse_assets_sql
} from 'windmill-parser-wasm-asset'

export async function inferAssets(language, code) {
  if (language === 'duckdb')  { await initWasmAsset(); return wrap(parse_assets_sql(code)) }
  if (language === 'bun')     { await initWasmAsset(); return wrap(parse_assets_ts(code))  }
  if (language === 'python3') { await initWasmAsset(); return wrap(parse_assets_py(code))  }
}
```

One codebase, two runtimes, zero drift. The graph the editor draws is computed by *literally the same instructions* that decide what runs in production. And because the backend re-parses on deploy, the server stays authoritative even if the browser's WASM is stale or someone hand-crafts an API call — the editor is for speed, the server is for truth.

---

## That's the whole trick

Step back. Three ideas, one knot:

- **No definition** — the graph is emergent from reads and writes.
- **No orchestrator** — execution is dispatch, a chain reaction over asset writes.
- **One parser** — the same Rust, native and WASM, decides both *what runs* and *what you see*.

The parser is the keystone. Because it runs in both worlds, the script definitions can be the *only* artifact — and that single artifact is simultaneously the **executable** thing (the backend dispatches off the parse) and the **drawable** thing (the editor renders off the same parse). You never maintain a graph, because the graph was never a separate thing to maintain.

In the editor this is visceral: start typing `CREATE TABLE clean AS SELECT ... FROM orders` and a node and an edge appear on the canvas as you type — the WASM parser firing on your keystrokes. Add `// on datatable://main/orders` and the subscription edge wires up (dashed and gray, because it's unsaved). Deploy, run the source script, and watch the cascade animate down the graph as each write dispatches the next consumer. The same DAG renders in your terminal via `wmill pipeline show` — because it's all just queries over asset rows.

---

## The honest tradeoffs

Emergent behavior is a great way to build a system you can't debug. "Why did this run?!" is the nightmare scenario, so most of the actual engineering here went into making the implicit *legible*.

- **Cycle detection** catches a write that loops back to its own producer and breaks the cycle, so cascades can't run away.
- **Fan-in is explicit**: a consumer can AND-join — wait for *all* its inputs before firing, including specific time partitions via a `{partition}` token in the asset path. This is what makes daily/hourly pipelines correct.
- **Every dispatch decision is logged** to a `dispatch_event` table — `dispatched`, `join-pending`, or `skipped` with a reason — and surfaced on the job page. So both "why did this run" and "why *didn't* this run" are answerable. The graph is emergent but never invisible.
- **The backend re-parses at deploy**, so the asset rows that actually drive dispatch come from the server, not the browser. The editor is allowed to be fast and occasionally wrong; the server is the authority.
- Self-loops, debounce windows, and retry policies are all declared in-script via annotations, parsed by the same machinery.

And a frontend detail worth calling out, because it's the same philosophy applied to rendering: the graph has no stored layout either. It's laid out from scratch on every render with a band-reserving tidy-tree algorithm (each subtree owns an exclusive horizontal column-band, so nodes under different parents can't visually interleave — the failure mode of naive layered layout), edges route around any node box they'd otherwise cross, and the *live* graph you edit against is a precedence merge of the deployed base, your drafts, and the WASM-inferred reads/writes from the script you're typing in right now. Nothing about the picture is persisted, because nothing about the pipeline is.

---

## Two engines under one roof

We didn't replace flows. We have both, on purpose, because they sit on opposite ends of one axis:

- **Flows** — an explicit FSM. You author the graph; a generic interpreter walks it. The right tool when the *shape is the point* — approvals, branches, retries, human-in-the-loop.
- **Pipelines** — an emergent graph. You write scripts; the graph falls out of their data dependencies. The right tool when the graph is just a *consequence* of what reads and writes what, and restating it would be busywork that drifts.

What makes the second one honest rather than magical is a single parser we refused to write twice — native in the backend, WASM in the browser — so your scripts are at once the program and the picture.

Zero drift by construction, not by discipline.

---

*Code pointers (branch `feat/asset-graph-view`):*
*dispatch — `backend/windmill-queue/src/asset_dispatch.rs` · parsers — `backend/parsers/windmill-parser-*-asset` and `.../windmill-parser-wasm/src/lib.rs` · frontend inference — `frontend/src/lib/infer.ts` · graph rendering — `frontend/src/lib/components/assets/AssetGraph/`.*
