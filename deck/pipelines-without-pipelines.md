---
marp: true
theme: default
paginate: true
title: Pipelines Without Pipelines
---

<style>
:root {
  --bg1:#16263f; --bg2:#0b1220; --bg3:#06090f;
  --panel:#0f1b30; --fg:#e6edf6; --muted:#93a3bd;
  --accent:#3B82F6; --accent2:#7cb0ff; --border:#26344e;
}
section {
  background: radial-gradient(125% 130% at 84% 8%, var(--bg1) 0%, var(--bg2) 52%, var(--bg3) 100%);
  color: var(--fg);
  font-family: -apple-system, "Segoe UI", Inter, Roboto, system-ui, sans-serif;
  font-size: 25px; line-height: 1.48; letter-spacing: -0.003em;
  padding: 52px 66px;
  justify-content: flex-start;
}
/* faint grid texture */
section::before {
  content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(148,163,184,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,.05) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(120% 100% at 75% 20%, #000 35%, transparent 88%);
          mask-image: radial-gradient(120% 100% at 75% 20%, #000 35%, transparent 88%);
}
section > * { position: relative; z-index: 1; }

h2 {
  font-size: 38px; font-weight: 800; color:#fff; letter-spacing:-0.02em;
  margin: 0 0 22px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
  position: relative;
}
h2::after { content:""; position:absolute; left:0; bottom:-1px; width:62px; height:3px;
  background: linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:3px; }
h3 { font-size: 27px; font-weight: 700; color: var(--accent2); margin: 4px 0 10px; }

strong { color:#fff; font-weight: 700; }
em { color: var(--accent2); font-style: italic; }
a { color: var(--accent2); text-decoration: none; }
p { margin: 12px 0; }

ul, ol { margin: 8px 0; padding-left: 30px; }
li { margin: 7px 0; }
li::marker { color: var(--accent); }

/* inline + block code */
code { font-family:"SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace; }
:not(pre) > code {
  background: rgba(59,130,246,.15); color:#9ec5ff;
  padding: 1px 7px; border-radius: 6px; font-size: 0.85em;
}
pre {
  background: var(--panel); border:1px solid var(--border); border-left:3px solid var(--accent);
  border-radius: 10px; padding: 16px 20px; margin: 14px 0;
  font-size: 16px; line-height: 1.5; overflow: hidden;
  box-shadow: 0 10px 28px rgba(0,0,0,.38);
}
pre code { font-size: 16px; color:#d6e2f5; }
/* dark syntax palette (Night-Owl-ish) */
.hljs-keyword,.hljs-built_in { color:#82aaff; }
.hljs-string { color:#9be7a6; }
.hljs-comment { color:#6c7c9c; font-style: italic; }
.hljs-number,.hljs-literal { color:#f3a563; }
.hljs-title,.hljs-title.function_,.hljs-section { color:#9ec5ff; }
.hljs-meta { color:#c792ea; }
.hljs-attr,.hljs-attribute,.hljs-name { color:#addb67; }
.hljs-type,.hljs-class .hljs-title { color:#7fdbca; }
.hljs-punctuation,.hljs-operator { color:#c5cee0; }

/* kill the default theme's light table/row backgrounds first */
section table, section table thead, section table tbody,
section table tr, section table td, section table th {
  background: transparent !important; background-color: transparent !important;
}
section table { border-collapse: collapse; width: 100%; font-size: 22px; margin: 12px 0; }
section table thead tr th {
  background: rgba(59,130,246,.20) !important;
  color:#ffffff !important; text-align:left; font-weight: 700;
  padding: 9px 16px; border: none; border-bottom: 2px solid var(--accent); }
section table tbody tr td {
  color: #eef4ff !important; font-weight: 600;
  padding: 10px 16px; border: none; border-bottom: 1px solid var(--border); }
section table tbody tr td code { color:#9ec5ff !important; font-weight: 600; }

blockquote {
  border-left: 4px solid var(--accent); background: rgba(59,130,246,.08);
  margin: 16px 0; padding: 12px 22px; border-radius: 0 9px 9px 0;
  font-size: 25px; color:#f1f6ff;
}
blockquote p { margin: 0; }

section::after { color: var(--muted); font-size: 15px; }  /* page number */

/* lead / title / divider slides */
section.lead { justify-content: center; align-items: center; text-align: center; }
section.lead h1 { font-size: 78px; font-weight: 800; color:#fff; letter-spacing:-0.03em;
  margin: 0 0 18px; line-height: 1.04; }
section.lead h1 strong, section.lead .accent { color: var(--accent2); }
section.lead h2 { border:none; font-size: 34px; color: var(--accent2); }
section.lead h2::after { display:none; }
section.lead h3 { font-size: 30px; color:#cdd8ea; font-weight:600; }
section.lead em { color: var(--muted); }
section.lead p { font-size: 26px; color:#c4d0e4; }
</style>

<!--
================================================================================
SPEAKER DECK — "Pipelines Without Pipelines"
15 minutes, technical-engineer / Hacker News audience.
Render as slides with Marp (`marp this-file.md`), or read top-to-bottom as a
blog draft. Each slide has SPEAKER NOTES in HTML comments + a [~time] budget.
Total budget: ~14 min talk + ~1 min buffer.
================================================================================
-->

<!-- _class: lead -->

# Pipelines Without Pipelines

### How we built a data-pipeline engine with **no pipeline object**

*A finite state machine you never wrote, implemented by the scripts themselves*

<!--
[0:00–0:45] (45s)

Hook, say it out loud:

"Every workflow engine you've used — Airflow, Temporal, Step Functions, our own
flows — has a thing that *is* the graph. A DAG file, a state machine definition,
a YAML. You write the graph, the engine runs the graph.

Today I want to show you the opposite. A pipeline engine where there is no
pipeline. No DAG file. Nothing that says 'A then B then C.' You write scripts.
The graph is an emergent property of what those scripts read and write. And the
whole thing is held together by one parser we compile twice — once to native
Rust, once to WASM — so the same code that *runs* the graph in the backend also
*draws* it in your browser as you type.

Let me earn that claim."

Tone: confident, a little cheeky. This is an HN crowd — they'll poke holes, so
flag the tradeoffs yourself before they do (slide 11).
-->

---

## First, the thing we're contrasting against

**Windmill** = run scripts (TS/Python/Go/SQL/…) as jobs.
**Flows** = wire scripts into a workflow.

A flow is a **declarative DAG**, fully defined upfront:

```
FlowValue {
  modules: [ FlowModule, FlowModule, ... ]   // the whole graph, as data
}
```

Branches, loops, retries, suspends, sub-flows — all just **data** in that tree.
`backend/windmill-types/src/flows.rs`

<!--
[0:45–2:15] (90s)

Set the baseline everyone knows.

"Windmill's core unit is a script as a job. Flows stitch scripts together.

A flow is NOT code. It's a FlowValue — a tree of modules. Each module is a
tagged union: it's a Script, or a ForloopFlow, or a BranchOne, a BranchAll, a
sub-Flow, even an AIAgent. Control flow — retries, suspend-for-approval,
stop-after-if — is just more fields on the struct.

The entire shape of the workflow is known before a single job runs. This is the
classic, correct, boring-in-a-good-way design. Hold onto it, because the new
thing is the photographic negative of it."

If asked "why declarative?" → introspectable, resumable, distributable. That's
literally the next slide.
-->

---

## Flows are a finite state machine

Two structures, mirror images:

| Definition (static) | State (dynamic) |
|---|---|
| `FlowValue.modules[]` | `FlowStatus.modules[]` |
| the graph | a cursor + per-step status |
| `flows.rs` | `flow_status.rs` |

```rust
enum FlowStatusModule {
  WaitingForPriorSteps, WaitingForExecutor,
  InProgress, Success, Failure, WaitingForEvents,
}
```

`FlowStatus { step: i32, modules: [...] }` → **persisted as JSONB after every step.**

<!--
[2:15–4:00] (105s)

The mechanism. This is the "it's literally an FSM" beat.

"Execution is a second structure that mirrors the first. FlowValue is the
program; FlowStatus is the program counter plus per-step state.

FlowStatus is almost insultingly simple: an integer `step`, and for each module
one of six states — waiting, queued, in-progress, success, failure, waiting-for-
event. That's the whole state machine.

And here's the part that makes it robust: after every step it's serialized to
JSONB in Postgres (v2_job_status). So the engine is stateless. The interpreter —
handle_flow / push_next_flow_job in worker_flow.rs — loads the definition, loads
the status, looks at the current module, dispatches the next job, writes the new
status back, and forgets everything.

Any worker can pick up any flow mid-execution, because the entire machine state
lives in a row. Crash a worker, another resumes. The graph is data, the position
is data, the engine is a pure function of the two."

Key phrase to land: "The engine is a generic interpreter. The graph lives in the
definition." Because next we throw the definition away.
-->

---

<!-- _class: lead -->

## The question

The engine is **generic**. The graph lives in the **definition**.

> So what if there were **no definition**?

What if the graph were an **emergent property** of the scripts —
never written down anywhere?

<!--
[4:00–4:45] (45s)

The pivot. Slow down. Let it breathe.

"So flows give us a generic interpreter walking an explicit graph. Every
workflow engine works this way. The graph is the source of truth.

Here's the heretical question we asked for data pipelines: what if there's no
graph to write? What if I just write a script that reads a table and writes
another table — and the pipeline is whatever falls out of a hundred scripts each
declaring what they touch? Nobody draws the DAG. The DAG is discovered.

That sounds like a parlor trick. Let me show you it's not."

Pause after "no definition." This is the thesis slide.
-->

---

## Data pipelines: there is no pipeline

No `PipelineValue`. No DAG file. No orchestrator.

Just scripts that declare what they **touch**:

```sql
-- producer.sql                    -- consumer.sql
ATTACH 'datatable://main' AS db;   ATTACH 'datatable://main' AS db;
CREATE TABLE db.orders AS          -- on datatable://main/orders
  SELECT ... ;                     CREATE TABLE db.report AS
                                     SELECT ... FROM db.orders;
```

`producer` **writes** `orders`. `consumer` **reads** `orders`.
That edge is never declared. It's **parsed out of the SQL.**

<!--
[4:45–6:30] (105s)

The concrete reveal.

"There is no pipeline entity in the schema. Search for it, it's not there. There
are scripts, and there's an `asset` table.

An asset is just a data product with a URI scheme: s3://, datatable://,
ducklake://, $res: for a resource, volume://. A script reads assets and writes
assets.

Look at these two scripts. The left one does CREATE TABLE orders — it WRITES the
orders asset. The right one SELECTs FROM orders — it READS it. I never wrote
'producer → consumer' anywhere. I never opened a pipeline editor and dragged a
line. The edge exists because one script's write matches another script's read,
and we know that because we *parsed the SQL* and saw the table names.

The `// on datatable://main/orders` comment on the right is the only explicit
bit — it's the script subscribing: 'wake me when orders changes.' Even that
references the asset, not the upstream script. The consumer doesn't know the
producer exists."

Land it: "The graph is the union of every script's reads and writes. Nobody owns
it. It's emergent."
-->

---

## The graph emerges from reads & writes

At deploy, we parse each script and write rows:

```
asset(path, kind, access_type, usage_path)
  orders   datatable   W   f/producer
  orders   datatable   R   f/consumer
```

The graph endpoint just **`SELECT`s and joins these back together.**
No compile step. Rename a script → graph updates instantly.

```
   [trigger] → producer ─writes─▶ (orders) ─reads─▶ consumer ─▶ (report)
```

<!--
[6:30–7:45] (75s)

Make "emergent" concrete and cheap.

"Mechanically: at deploy time we parse the script body, extract its assets, and
write asset rows — (asset, kind, access-type, which-script). Writes and reads,
one row each.

The 'asset graph' is then not a stored object — it's a QUERY. The
/assets/graph endpoint selects all asset usages, all triggers, groups them, and
hands back nodes and edges. It's reconstructed on every call.

That has a delightful consequence: there's nothing to keep in sync. No compiled
DAG artifact that can drift from the code. Rename a script, change a table it
writes — the next graph fetch just reflects reality. The map can't be stale
because there is no map, only the territory."

Contrast callback: "Flows: graph is the source of truth. Pipelines: the scripts
are the source of truth, the graph is a derived view."
-->

---

## Execution: dispatch, not orchestration

A flow has a conductor stepping `i → i+1`.
A pipeline has **none.** It's a chain reaction:

```rust
// after ANY top-level script succeeds:
dispatch_asset_triggers(job)
  → for each asset the script WROTE
      → find scripts subscribed to it (// on <asset>)
        → push a job for each
```
`backend/windmill-queue/src/asset_dispatch.rs`

> Producer doesn't know its consumers. Consumers don't know each other.
> **Subscriptions alone define the graph.**

<!--
[7:45–9:15] (90s)

The execution model. This is the second big idea after "no definition."

"Flows have a conductor — push_next_flow_job literally increments the step
counter and decides what's next. Centralized.

Pipelines have no conductor. When ANY top-level script finishes successfully, we
run dispatch_asset_triggers. It asks: what assets did this job write? For each,
who subscribed via `// on`? Push them a job. Those jobs finish, write their own
assets, dispatch again. It's a chain reaction propagating through the asset
graph. Pub/sub, where the 'topics' are tables and files.

Nobody is orchestrating. The producer emits a write and moves on — it has never
heard of its consumers. Two consumers of the same asset don't know about each
other. The graph isn't executed from a definition; it *happens*, edge by edge,
as writes match subscriptions.

This is the same inversion as callbacks vs. a main loop, or actors vs. a
scheduler. We just made the messages be 'a table changed.'"

Note for Q&A: there's a per-workspace producer cache so non-producer scripts pay
~zero overhead; runaway cascades are stopped by cycle detection (a write that
loops back to its own producer is caught and broken).
-->

---

## How is this even safe to do?

Both halves need to agree on "what does this script read/write":

- **Backend**, at deploy → must be **authoritative** (it drives real job dispatch)
- **Frontend**, as you type → must be **instant** (live graph in the editor)
- **Testing a draft** → there are no asset rows yet, so the **frontend orchestrates the dev-run** — it's *authoritative* too, before anything is deployed

Two implementations = two sources of truth = drift = your **test ≠ prod**.

**So we don't have two implementations.**

<!--
[9:15–10:00] (45s)

Set up the keystone by stating the problem sharply.

"Now the obvious objection. This whole thing rests on correctly knowing what
each script reads and writes. And we need that answer in two very different
places.

The backend needs it, authoritatively, at deploy — because it literally decides
which jobs fire. Get it wrong and the wrong things run.

The frontend needs it instantly, on every keystroke — because the pitch is you
watch the graph grow as you type.

And here's the kicker: when you *test* a draft pipeline — dev-run it before
deploying — there are no asset rows on the backend yet, nothing for the dispatcher
to cascade off. So the FRONTEND orchestrates that test run, off its own parse. It's
not just drawing the graph, it's executing it. Which means if the two parsers
disagreed, your test run wouldn't match production. Test ≠ prod is the worst kind
of bug.

The naive move is two parsers: a real one in Rust, a 'good enough' one in JS for
the editor. That's two sources of truth. They WILL drift. Your editor will draw
an edge that doesn't fire, or miss one that does — or worse, your test passes and
prod doesn't. Credibility-killing for a tool like this."

Beat. Then: "So we didn't do that — because we'd already built it."
-->

---

## We were already parsing every script

Every Windmill script is **already parsed** to derive its `main` signature — which powers the **input form** (params → JSON Schema → UI) and the **dependencies** (imports → lockfile). That parser already runs **native** (backend) + **WASM** (editor).

```ts
export async function main(
  name: string,
  count = 3,
  db: Postgresql,          // a Windmill resource type
) { /* ... */ }
```
↳ a JSON Schema → an auto-form: text field · number (default `3`) · resource picker.

> **The eureka:** assets are just *one more visitor* on the same AST — no new infrastructure, just a parser we'd already shipped, hardened, and dual-compiled for years.

<!--
[9:55–10:40] (45s)

The eureka — and it lands harder because it's not a new trick, it's reuse.

"Here's the thing: we weren't starting from zero. Windmill has *always* parsed
every script. The moment you write a main function, we parse its signature and
turn the parameters into a JSON Schema — that's how the auto-generated input form
appears, the text box, the number with its default, the resource picker. Same
parse resolves your imports to pin the lockfile.

And critically, that parser already lived in both worlds: native in the backend,
compiled to WASM for the editor. We'd been running it on every keystroke for
years to give you instant arg forms and type errors.

So when we needed to know what each script reads and writes, the eureka wasn't
'build a parser in two languages.' It was: that's just *one more visitor on the
same AST we already walk.* Assets fell out of infrastructure we'd already shipped
and hardened. That's why this was even tractable."
-->

---

## One parser, compiled twice

```
        backend/parsers/windmill-parser-{sql,ts,py}-asset   (Rust)
                              │
              ┌───────────────┴────────────────┐
       native build                       wasm-pack build
              │                                 │
     Backend (deploy):                  Frontend (editor):
     authoritative asset rows           parse_assets_sql/ts/py()
     → drives dispatch                  → live graph, every keystroke
```

Same parser, one more visitor. SQL via a real DuckDB-dialect parser; TS/Python via
real ASTs (track `ATTACH ... AS db` / `wmill.datatable('main')`, then resolve usages).

<!--
[10:00–11:30] (90s)

The payoff slide. This is the engineering flex — sell it.

"The parsers live in backend/parsers — windmill-parser-sql-asset, -ts-asset,
-py-asset. Real parsers: the SQL one runs the actual DuckDB-dialect parser and
walks the AST, tracking `ATTACH 'datatable://main' AS db` bindings, then
resolving every table reference in SELECT/INSERT/CREATE/DROP to a read or write.
The TS one parses a real TypeScript AST, finds `wmill.datatable('main')`, follows
the variable, parses the embedded SQL templates. Not regexes. ASTs.

That code is Rust. We compile it two ways. Native, it links into the backend and
produces the authoritative asset rows at deploy. Through wasm-pack, the exact
same crate becomes a WASM module — parse_assets_sql, parse_assets_ts,
parse_assets_py — that the Svelte editor calls on every change.

One codebase. Two runtimes. No drift between them. The graph the editor draws is
computed by literally the same instructions that will decide what runs in
production. The backend even re-parses at deploy so server stays authoritative if
the browser is lying or outdated."
-->

---

<!-- _class: lead -->

## That's the whole trick

The WASM parser is what makes "no pipeline object" *viable*:

- It can **implement** the graph — backend dispatch off parsed assets
- It can **represent** the graph — frontend draws it live from the same parse

The script definitions *are* the pipeline.
The parser is the bridge that lets one artifact be both **executable** and **drawable**.

<!--
[11:30–12:15] (45s)

Tie the three threads together. Don't introduce anything new.

"Step back. Three ideas, one knot.

No definition: the graph is emergent from reads and writes.
No orchestrator: execution is dispatch, a chain reaction over asset writes.
One parser: the same Rust, native and WASM, decides both what runs and what you
see.

The parser is the keystone. Because it runs in both worlds, the script
definitions can be the only artifact — and that single artifact is both the
executable thing (backend dispatches off the parse) and the drawable thing (the
editor renders off the same parse). You never maintain a graph, because the graph
was never a separate thing to maintain."
-->

---

## Demo: watch the graph build itself

1. Open a pipeline folder → **graph reconstructed from a SQL query**
2. Type `CREATE TABLE clean AS SELECT … FROM orders`
   → WASM parses → **new node + edge appear, live**
3. Add `// on datatable://main/orders` → **subscription edge wires up**
4. **Deploy** → asset rows written → **run the source**
5. Watch the **cascade animate** down the graph (Activity feed groups the run)
6. Same DAG in the terminal: `wmill pipeline show f/orders`

<!--
[12:15–13:30] (75s)

Live demo if at all possible — this is the money shot. If no live demo, screen-
record it beforehand. Narrate while doing:

"Empty-ish pipeline. This graph is a SQL query result, nothing more.

I start typing in a new DuckDB script — CREATE TABLE clean AS SELECT from orders.
Watch the canvas, not my code. There — a node and an edge just appeared. That's
the WASM parser firing on my keystrokes, seeing I read orders and write clean,
and the same resolveGraph merge that the backend uses placing it.

I add `// on datatable://main/orders` — now it's subscribed, the trigger edge
lights up. Note it's dashed/gray: unsaved.

Deploy. Now the asset rows are real, the subscription is real. I run the source
script... and watch it cascade — producer fires, its write dispatches the
consumer, that fires, animating down the graph. The Activity panel groups the
whole cascade as one run.

And because it's all just queries over asset rows — same DAG, in my terminal,
wmill pipeline show. ASCII art, same graph."

If demo gods are angry: fall back to the recorded clip, keep narrating.
-->

---

## The honest tradeoffs

Emergent graphs are great until they're spooky. So we made the implicit **visible**:

- **Cycle detection** — a write that loops back to its own producer is caught and broken, so cascades can't run away
- **AND-joins**: a script can wait for *all* inputs (partitions via `{partition}` token)
- **`dispatch_event` table** logs every decision: *dispatched / join-pending / skipped (why)* — surfaced on the job UI
- Backend re-parses at deploy → **server is authoritative**, browser can't lie
- Self-loops, debounce windows, retries — all declared in-script

<!--
[13:30–14:30] (60s)

CRUCIAL for an HN crowd. Pre-empt the pushback. Be the skeptic first.

"Now — emergent behavior is a great way to build a system you can't debug. 'Why
did this run?!' is the nightmare. So most of the real engineering here is making
the implicit legible.

Runaway cascades? Cycle detection — a write that loops back to its own producer
is caught and the cycle is broken. Fan-in? A consumer can AND-join — wait for all
its inputs, including specific time partitions via a {partition} token in the path.

The big one: every dispatch decision is logged to a dispatch_event table —
dispatched, join-pending, or skipped with a reason — and shown on the job page.
So 'why did this run' and 'why DIDN'T this run' are both answerable. The graph is
emergent but never invisible.

And the backend re-parses on deploy, so even if your browser's WASM is stale or
someone hand-crafts an API call, the asset rows that actually drive dispatch come
from the server. Editor is for speed; server is for truth."

This slide is what turns 'cute idea' into 'I'd trust this in prod' for engineers.
-->

---

## Takeaways

**Flows** → explicit FSM. You write the graph; a generic interpreter walks it.
**Pipelines** → emergent graph. You write scripts; the graph *falls out* of them.

The unlock: **one parser, native + WASM**, so the script definitions are
simultaneously what **runs** and what you **see**.

> 🚀 **We're hiring** — Rust / TypeScript / systems engineers → **windmill.dev/careers**

*Code:* `windmill-queue/src/asset_dispatch.rs` · `parsers/windmill-parser-*-asset` · `frontend/.../AssetGraph` — all on `main`.

<!--
[14:30–15:00] (30s)

Close clean and quotable.

"Two engines under one roof. Flows, when you want to author a graph explicitly —
the right tool when the shape is the point. Pipelines, when the graph is just a
consequence of your data dependencies and writing it twice is busywork.

What makes the second one honest rather than magical is a single parser we
refused to write twice. Native in the backend, WASM in the browser, so your
scripts are at once the program and the picture.

That's the talk. And we're hiring — Rust, TypeScript, and systems folks; come
talk to me or hit windmill.dev/careers. Happy to go deep on the dispatch
internals or the parser in Q&A."

Thanks + Q&A. Likely questions: cycles? (cycle detection breaks them), exactly-once?
(dispatch is at-least-once-ish, idempotency on you), why not Temporal? (this is the
opposite axis — emergent vs authored), language coverage? (SQL/TS/Py have body
parsers; others get comment annotations).
-->

---

<!-- _class: lead -->

# Appendix A — The real code

*The actual source behind each claim. Excerpts are verbatim, lightly trimmed where noted.*

<!--
Reference slides: each maps a claim from the talk to the real source.
-->

---

## A1 · "Subscriptions alone define the graph"

Straight from the dispatch module's own doc comment — **verbatim**:

```rust
//! When a script writes an asset and a downstream script subscribes to
//! that asset via `// on s3://...`, this module pushes a job for each
//! subscriber after the producer's job completes successfully. Any
//! asset-writing top-level script cascades — there is no `// pipeline`
//! gate on the producer side; subscriptions alone define the graph.
```
`backend/windmill-queue/src/asset_dispatch.rs:11`

<!--
"I'm not paraphrasing the thesis — this is the doc comment at the top of the
dispatch module. 'There is no pipeline gate on the producer side; subscriptions
alone define the graph.' The producer just writes; subscribers opt in."
-->

---

## A2 · The dispatch loop (lightly trimmed)

```rust
let producers = workspace_producer_writes(db, &job.workspace_id).await?;   // cached
let Some(writes) = producers.get(runnable_path).cloned() else { return Ok(..) };

for (asset_kind, asset_path) in writes {
    let trigger_ref = format!("{}{}", prefix, asset_path);
    let subs = fetch_subscribers(db, &job.workspace_id, &trigger_ref).await?;
    for sub in subs {
        if sub.path == runnable_path { continue; }          // skip self-loops
        if sub.join_all { /* AND-join: wait for all inputs */ }
        push_subscriber(db, job, &sub.path, asset_kind, &asset_path,
                        runnable_path, depth + 1, /* partition, debounce, retry */).await?;
    }
}
```
`asset_dispatch.rs::try_dispatch` (273). Non-producers cost **one in-memory lookup, zero queries.**

<!--
"The whole engine is this loop. What did I write? Who subscribed? Push them. The
producer-writes map is cached per workspace and invalidated by a Postgres trigger
on the asset table, so the 99% case — a script that writes nothing — is a hashmap
miss and we're done. The self-loop skip is the first line of cycle detection that
keeps runaways from propagating; join_all is fan-in. That's it."
-->

---

## A3 · One function, native AND wasm

The **WASM export** is a four-line shim — it forwards to the same crate the backend links natively:

```rust
#[cfg(feature = "asset-parser")]
#[wasm_bindgen]
pub fn parse_assets_sql(code: &str) -> String {
    match windmill_parser_sql_asset::parse_assets(code) {   // ← same fn the backend calls
        Ok(r)  => serde_json::to_string(&r).unwrap(),
        Err(e) => format!("err: {:?}", e),
    }
}
```

> `windmill-parser-wasm/src/lib.rs` — same pattern for `parse_assets_ts` / `parse_assets_py`.

<!--
"This is the keystone in code. The WASM export is a four-line shim — it forwards
to windmill_parser_sql_asset::parse_assets, the exact crate the backend links
natively. Same for ts and py. One crate, two compile targets, identical answer."
-->

---

## A4 · …and it's a real parser

`parse_assets` isn't a regex — it runs the **actual DuckDB-dialect parser** and walks the AST:

```rust
pub fn parse_assets(input: &str) -> anyhow::Result<ParseAssetsOutput> {
    let statements = Parser::parse_sql(&DuckDbDialect, input)?;
    let mut collector = AssetCollector::new();
    for statement in statements {
        let _ = statement.visit(&mut collector);
    }
    // → reads/writes resolved from ATTACH bindings + table refs
}
```
`backend/parsers/windmill-parser-sql-asset/src/asset_parser.rs`

<!--
"And the crate it forwards to is the real thing: it runs the DuckDB-dialect SQL
parser and walks the AST with a visitor, tracking ATTACH bindings and resolving
every table reference to a read or a write. Native in the backend, WASM in the
browser — byte-for-byte the same logic."
-->

---

## A5 · The hard case: data tables in TypeScript

A TS script reaches a data table through the SDK — the parser reads the **TypeScript** *and* the **SQL embedded inside it**:

```ts
import * as wmill from "windmill-client"
export async function main(since: string) {
  const sql = wmill.datatable("main")        // bind: sql → datatable "main"
  await sql`
    SELECT * FROM orders WHERE created_at > ${since}
  `.fetch()                                  // READ   main/orders
  await sql`
    CREATE TABLE daily_revenue AS
    SELECT day, sum(total) FROM orders GROUP BY day
  `.fetch()                                  // WRITE  main/daily_revenue
}
```

**Inferred:** `datatable://main/orders` **R** · `datatable://main/daily_revenue` **W** — the TS AST resolves the `sql` binding, lifts each template's SQL, and runs it through the **same SQL parser**. *A parser inside a parser.*

<!--
"This is the case that proves the design. In TypeScript you talk to a data table
through the SDK: const sql = wmill.datatable('main'), then tagged-template
queries. To know what it reads and writes, the parser walks the TS AST, finds
that `sql` is bound to datatable 'main', then for every tagged template lifts the
SQL string out and runs it through the *same* SQL asset parser from the previous
slide. SELECT FROM orders → read main/orders; CREATE TABLE daily_revenue AS … →
write main/daily_revenue. A parser inside a parser, and the inner one is the
exact crate we already saw. That's the leverage of one hardened parser."
-->

---

## A6 · The browser side calls it on every keystroke

```ts
import initAssetParser, {
  parse_assets_ts, parse_assets_py, parse_assets_sql
} from 'windmill-parser-wasm-asset'

export async function inferAssets(language, code) {
  if (language === 'duckdb')       { await initWasmAsset(); return wrap(parse_assets_sql(code)) }
  if (language === 'bun' || 'deno'){ await initWasmAsset(); return wrap(parse_assets_ts(code))  }
  if (language === 'python3')      { await initWasmAsset(); return wrap(parse_assets_py(code))  }
}
```
`frontend/src/lib/infer.ts` — wired into `ScriptEditor.svelte` as a reactive `resource([lang, code])`.

<!--
"And here's the consumer: the Svelte editor imports the WASM module and calls
parse_assets_sql/ts/py directly. It's hung off a reactive resource keyed on
(language, code), so every keystroke re-parses and the graph overlay updates.
The backend re-parses the same content at deploy — so the editor is fast, the
server is authoritative, and they never disagree because it's the same code."
-->

---

<!-- _class: lead -->

# Appendix B — Drawing the emergent graph

*The graph has no stored layout either — it's computed every render.*

---

## B1 · Band-reserving tidy-tree layout

The graph is **reconstructed from a SQL query**, so it also has to be **laid out from scratch** each time. Naive layered (Sugiyama) layout let unrelated edges fight for columns. The fix, **verbatim from the source**:

```
// Each node reserves a horizontal band at least as wide as the sum of its
// children's bands (W(n) = max(NODE_WIDTH, Σ W(children) + gaps)) ...
// Bands are exclusive, so two nodes with different parents can never
// interleave horizontally — the failure mode of the previous Sugiyama layout.
//
// The band recursion stops at *join points*: a node with two or more parents
// belongs to no single parent's band ... Joins instead root their own subtree.
```
`frontend/.../AssetGraph/assetGraphLayout.ts` · falls back to a grid on cyclic input.

<!--
"Quick frontend aside for the rendering nerds. Because the graph is a query
result, nothing about its drawing is persisted — we lay it out fresh every time.
Classic layered layout had unrelated parallel edges fighting over columns. The
fix is band reservation: each subtree owns an exclusive horizontal band, so nodes
under different parents physically can't interleave. Fan-in joins root their own
subtree. Cyclic input falls back to a deterministic grid. Long edges then route
around any node box they'd otherwise cross."
-->

---

## B2 · Edges route around obstacles

A long edge that skips layers would draw **through** unrelated node boxes. So we detour:

- sample the straight line at each intervening row
- if a node sits under it (within `½·width + 8px`), it's a crossing
- route to the side the edge is already heading, outermost lane clears all crossings — **one detour, no box crossings**

`AssetGraphCanvas.svelte::detourForEdge` — computed **once per layout** (`$derived`), not per frame.

<!--
"And lineage has to be unambiguous, so edges never cut through a node they're not
connected to. detourForEdge samples the straight path, finds any node box under
it, and bends the edge into a clear gutter lane. It's O(nodes) per edge but runs
once per layout via a derived value — zero per-frame cost. Small thing, but it's
the difference between 'I trust this diagram' and 'wait, does that line connect?'"
-->

---

## B3 · The live graph is a layered merge

What you see while editing = deployed graph **+** your unsaved reality, merged by precedence:

```ts
export function resolveGraph(input) {
  const acc = seedAccumulator(input, ctx)   // 1. base: /assets/graph (deployed)
  seedDraftOverlays(acc, input)             // 2. per-draft seeded triggers & outputs
  applyLiveBufferOverlay(acc, input, ctx)   // 3. the open script's live // on annotations
  crossCheckSweptScripts(acc, input)        // 4. reconcile renamed/removed
  overlayInferredLineage(acc, input)        // 5. WASM-inferred reads/writes (this keystroke)
}
```
`resolveGraph.ts` — base < session-inferred < draft < **live annotations** (highest wins).

<!--
"Last one. The graph you edit against isn't just the deployed graph — it's the
deployed graph with your unsaved work layered on top, in precedence order: the
persisted base, then draft overlays, then the live // on annotations and the
WASM-inferred reads/writes from the script you're typing in *right now*, which
win. That's why a brand-new edge shows up dashed-and-gray the instant you type
the SQL, before anything is saved. Drafts sync per-user to the DB; deploy
collapses the overlay into the new base."
-->
