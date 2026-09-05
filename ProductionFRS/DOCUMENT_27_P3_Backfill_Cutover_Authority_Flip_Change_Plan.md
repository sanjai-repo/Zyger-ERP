# DOCUMENT_27 — P3 Backfill, Cutover & Authority-Flip Change Plan

**Phase:** P3 (additive normalized event projection) → review of subsequent gates
**Type:** **READ-ONLY CHANGE PLAN** — no source, migration, entity, API, or frontend modified by this document.
**Status:** Planning only. Nothing executed.
**Date:** 2026-09-03

> Governing rule: **No authority flip may occur unless reconciliation is 100% PASS with zero unexplained drift.** Backfill, cutover, and authority flip each remain separately gated on this document's review and **explicit approval**.

---

## 0. Context & Constraints (recap)

- `production_entry` remains the **sole authoritative business transaction** (P3-01).
- Normalized events (`prod_execution_session` → `prod_operation_event` → `prod_output_event`) are **derived projections only** (P3-01), gated by `production.normalized-ops.enabled` (default OFF, P3-07), emitted **in the same transaction** as the authoritative write (P3-02).
- Inventory authority is `ProductionStockBoundary → StockService` (Job Card completion FG receipt) + legacy Conversion/Return `stockService` calls. Event creation produces **zero** inventory postings (P3-05).
- Backfill was **NOT executed** (P3-08). `prod_backfill_progress` exists as a reserved additive marker table only.
- V4 is additive; validated on fresh DB and DB-with-existing-records (DOCUMENT_26 §3).
- Reconciliation formula (BR-PROD-ENTRY-001 / CLAR-PROD-002): `Processed = Accepted + Rejected + Rework + Scrap`; WIP and Pending are **derived read-only** values, never negative.

---

## 1. Backfill Architecture — Existing → Normalized Field Mapping

### 1.1 Legacy tables read by backfill (source of truth, read-only)

`production_entry`, `production_entry_material`, `production_entry_operator`, `production_entry_rejection`, `production_entry_rework`, `production_entry_batch`. The backfill **reads** these; it never writes them.

### 1.2 Mapping to `prod_execution_session` (aggregate root)

| Legacy Table | Legacy Field | Normalized Target | Transformation | Loss Risk |
|---|---|---|---|---|
| `production_entry` | `entry_number` | `prod_execution_session.entry_number` | direct (natural key, `UNIQUE`) | none |
| `production_entry` | `job_card_number` | `prod_execution_session.job_card_number` | direct | none |
| `production_entry` | `work_order_number` | `prod_execution_session.work_order_number` | direct | none |
| `production_entry` | `subjob_number` | `prod_execution_session.subjob_number` | direct | none |
| `production_entry` | `part_code` | `prod_execution_session.part_code` | direct | none |
| `production_entry` | `part_description` | `prod_execution_session.part_description` | direct | none |
| `production_entry` | `status` | `prod_execution_session.session_status` | **status mapping (§8)**. POSTED/COMPLETED→`COMPLETED`; REVERSED(original)→original stayed `COMPLETED` (mirror is separate); reversal row (`is_reversal`=true)→`CANCELLED`; DRAFT→`OPEN`; others→mapped per §8 | none (mapping preserved in §8) |
| `production_entry` | `process_qty` (≡ `produced_quantity`) | `prod_execution_session.available_input` | direct; may be negated for reversal rows (already stored negated in legacy) | none |
| `production_entry` | `good_quantity` | `prod_execution_session.accepted_output` | direct (may be negative for reversal) | none |
| `production_entry` | `rejected_quantity` | `prod_execution_session.rejected` | direct | none |
| `production_entry` | `rework_quantity` | `prod_execution_session.rework` | direct | none |
| `production_entry` | `scrap_quantity` | `prod_execution_session.scrap` | direct | none |
| `production_entry` | (derived) | `prod_execution_session.wip` | `max(available_input − (accepted+rejected+rework+scrap), 0)`; for reversal rows (negative input), WIP defines as 0 (no residual) | **LOW — reversal WIP is semantically null**; see §6 |
| `production_entry` | `start_time` | `prod_execution_session.started_at` | direct | none |
| `production_entry` | `end_time` | `prod_execution_session.completed_at` | direct | none |
| `production_entry` | `created_by` | `prod_execution_session.created_by` | direct | none |
| `production_entry` | `created_at` | `prod_execution_session.created_at` | direct; backfill assigns `now()` unless flag to preserve audit timestamps | LOW (audit-time fidelity) |
| `production_entry` | `entry_type`, `production_type` | (**no column**) | not represented; derivable via status/`is_reversal` | LOW — informational only |
| `production_entry` | `financial_year`, `route_sheet_*`, `shift_code`, `supervisor_*`, `machine_code`, `operator_code`, `uom`, `item_weight`, `mhr`, `process_rate`, `process_time`, `idle_*`, `pending_sequence_only`, `produced_quantity`, `quality_status`, `remarks`, `reversal_reason`, `reversed_from_entry_id` | (**no column on session**) | some fold into operation event (§1.3); others are legacy-informational | **see §1.3 / §1.5 loss ledger** |

### 1.3 Mapping to `prod_operation_event` (per entry/operation)

| Legacy Table | Legacy Field | Normalized Target | Transformation | Loss Risk |
|---|---|---|---|---|
| `production_entry` | `subjob_number` | `prod_operation_event.subjob_number` | direct | none |
| `production_entry` | `operation_code` | `prod_operation_event.operation_code` | direct | none |
| `production_entry` | `operation_sequence` | `prod_operation_event.seq` | direct; default 0 when null | none |
| `production_entry` | `machine_code` | `prod_operation_event.machine_code` | direct | none |
| `production_entry` | `operator_code` | `prod_operation_event.operator_code` | direct | none |
| `production_entry` | `start_time` | `prod_operation_event.start_time` | direct | none |
| `production_entry` | `end_time` | `prod_operation_event.end_time` | direct | none |
| `production_entry` | `status`/`is_reversal` | `prod_operation_event.operation_status` | mapping per §8 (IN_PROGRESS/COMPLETED/REVERSED) | none |
| `production_entry` | `idle_reason` | `prod_operation_event.hold_reason` | direct (when idle/not CHAR no legacy idle) | LOW semantic |
| `production_entry_operator` | `operator_code`, `hours_worked` | `prod_operation_event.operator_code` (+ derived) | operator_code folded to op event; **hours_worked has no event column** → retained in legacy only | **LOW/MED — hours_worked not projected** (see §1.5) |
| `production_entry` | `production_date` | (event has no explicit date column) | derivable from `start_time`/`created_at`; event keyed to session | none (derivable) |

### 1.4 Mapping to `prod_output_event` (per output category)

| Legacy Table | Legacy Field | Normalized Target | Transformation | Loss Risk |
|---|---|---|---|---|
| `production_entry` | `good_quantity` | `prod_output_event` (output_type=`ACCEPTED`) | row emitted only if quantity ≠ 0; item_code=`part_code`, location=`STORE` | none |
| `production_entry` | `rejected_quantity` | `prod_output_event` (output_type=`REJECTED`) | emitted if ≠ 0 | none |
| `production_entry_rejection` | `reason_code`/`reason_description` | `prod_output_event.reason_code` (REJECTED row) | first-child reason (service already does this) | LOW — only first reason retained |
| `production_entry` | `rework_quantity` | `prod_output_event` (output_type=`REWORK`) | emitted if ≠ 0 | none |
| `production_entry_rework` | `reason_code`/`reason_description` | `prod_output_event.reason_code` (REWORK row) | first-child reason | **LOW — additional rework reasons not all retained** |
| `production_entry` | `scrap_quantity` | `prod_output_event` (output_type=`SCRAP`) | emitted if ≠ 0 | none |
| `production_entry_batch` | `batch_number`, `allocated_qty`, `warehouse_code` | (**no output-event column**) | not projected; retained in legacy | MED — batch trace currently out of scope; documented as gap (§1.5) |
| `production_entry_material` | `rm_code`, `req_qty`, `consumed_qty`, `available_qty`, `return_qty`, `scrap_qty`, `deviation_qty`, etc. | (**no normalized equivalent**) | **not projected** — material consumption is legacy-inventory domain, out of normalized-execution scope | **MED** — material line data retained in legacy; normalized reporting cannot yet answer material consumption |

### 1.5 Explicit "loss ledger" (fields deliberately not projected)

The normalized event model is defined as **execution/output projection only**. Any field not projected remains 100% authoritative in `production_entry` and children (no data deleted anywhere). **Loss is of normalized-reporting surface, never of stored data.** Fields surfaced for tracking:

| Field | Why not projected today | Impact / owner |
|---|---|---|
| `production_entry_operator.hours_worked` | no event column; op event holds operator_code only | OEE labour calculations must read legacy until an event field is added |
| `production_entry_material.*` (all) | material consumption is inventory/Planning domain, not execution | material screens keep reading legacy |
| `production_entry_batch.*` | batch trace currently legacy-only | batch/warehouse reporting reads legacy |
| `production_entry_rejection`/`_rework` additional rows (reason per rejected unit) | event stores a single first-row reason_code | drill-down reason detail reads legacy |
| `entry_type`, `production_type`, `financial_year`, `route_sheet_*`, `quality_status`, `remarks`, `supervisor_*`, `uom`, `mhr`, `process_*`, `idle_time`, `item_weight`, `pending_sequence_only`, `reversal_reason` | legacy-informational/metadata; not needed for execution WIP/output reconciliation | unchanged; legacy authoritative |

**Conclusion:** no *data-bearing* business field silently disappears. A controlled loss ledger is maintained (§1.5) and would be reviewed with stakeholders before cutover, because normalized-reporting completeness depends on it.

---

## 2. Backfill Idempotency

### 2.1 Natural keys (deterministic, reuse V4 constraints)
- Session natural key = `entry_number` (`uq_prod_execution_session_entry`).
- Operation natural key = `(session_id, subjob_number, operation_code, seq)` (`uq_prod_operation_event_session_key`).
- Output natural key = `(session_id, operation_event_id, output_type, item_code, location)` (`uq_prod_output_event_key`).

These are already enforced by hard DB UNIQUE constraints (both entity `@Table` for dev/test `ddl-auto` and V4 migration for Flyway prod/staging). **Re-running any batch against an already-projected entry is a no-op** by natural key.

### 2.2 Checkpoint / marker — `prod_backfill_progress`
Additive table (already in V4, currently empty, reserved):

| Column | Use |
|---|---|
| `job_card_number` | backfill batch scope unit (UNIQUE per job card) |
| `last_entry_id` | high-water mark of the last `production_entry.id` processed within the job card |
| `processed` | count of entries projected for this job card |
| `status` | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` / `PARTIAL` |
| `updated_at` | last progress heartbeat |

- **Ordering/watermark:** process `production_entry` rows ordered by `id ASC` within a job card. Store `last_entry_id`; a restart re-reads from `last_entry_id + 1` (resume). Because it's per-`job_card_number` and rows are emitted by natural key, **resume can never duplicate** (natural-key upsert is idempotent).
- **Multi-instance safety:** claim a `RUNNING` row with a `SELECT ... FOR UPDATE` (or advisory lock) per job card; only one worker proceeds at a time.

### 2.3 Batch size strategy
- Batch unit = **one job card** (bounded, meaningful for reconciliation, matches `uq_prod_backfill_progress_job`).
- Within a card, process entries in chunks (e.g., 100) wrapped in independent transactions (one per chunk). This bounds rollback scope and memory.

### 2.4 Failure handling & retry
- **Per-chunk transaction:** a failed chunk rolls back only that chunk; job-card marker stays `RUNNING`/`PARTIAL` with `last_entry_id` at the last committed cursor.
- **Retry:** exponential backoff, max N attempts; after N, mark job card `FAILED` and record error. No partial duplicates are possible (natural keys).
- **Stragglers:** a re-run only processes entry ids > last committed watermark.

### 2.5 Duplicate prevention summary
1. Natural-key UNIQUE constraints (DB-level, authoritative backstop).
2. Idempotent upsert service (query-by-natural-key then insert; `DataIntegrityViolationException` absorbed → re-find).
3. `prod_backfill_progress` watermark to skip already-done entries even before hitting a DB constraint.
4. Job-card `FOR UPDATE` claim to prevent two workers racing the same card.

**The backfill aggregates `INSERT ... ON CONFLICT DO NOTHING`-style semantics via the service; it can never create duplicate normalized events.**

---

## 3. Quantity Reconciliation (executable, multi-level)

All checks compare **legacy `production_entry` (authority)** against **derived normalized events**. Reconciliation runs at five levels, aggregating by (respectively) entry, job card, work order, item (`part_code`), and date range (`production_date` / `started_at`).

### Unified delta expression per entry
```
Δ_input  = legacy.process_qty                 − Σ(session.available_input   for that entry)       == 0
Δ_acc    = legacy.good_quantity               − Σ(session.accepted_output   for that entry)       == 0
Δ_rej    = legacy.rejected_quantity           − Σ(session.rejected          for that entry)       == 0
Δ_rew    = legacy.rework_quantity             − Σ(session.rework            for that entry)       == 0
Δ_scr    = legacy.scrap_quantity              − Σ(session.scrap             for that entry)       == 0
Δ_wip    = derivedLegacyWip − session.wip [legacy WIP = max(process_qty − (good+rej+rew+scr),0)]  == 0
```

### Detect protocol (all levels)
| Check | Rule | Failure signal |
|---|---|---|
| Missing events | every POSTED/REVERSED/CANCELLED entry backfilled has ≥1 session row; DRAFT optional | missing-session count > 0 |
| Duplicate events | session count per `entry_number` ≤ 1; op ≤ 1 per natural key; output ≤ 1 per natural key | duplicate natural-key count > 0 |
| Quantity drift | Δ_input, Δ_acc, Δ_rej, Δ_rew, Δ_scr, Δ_wip all == 0 (with configurable epsilon, default 0 due to NUMERIC(18,4)) | any |Δ| > 0 |
| Negative WIP | session.wip ≥ 0 and legacy-relational WIP ≥ 0 | any wip < 0 |
| Reversal mismatch | reversal entry's mirror session exists with `session_status=CANCELLED`; original session still exists (status `COMPLETED`), quantities mirror the negative of the reversal's own quantities; net (original + mirror) == 0 for the reversed lineage | mismatch count > 0 |

### PASS criteria (all must hold; "100% PASS with zero unexplained drift")
- **Per Entry:** for every POSTED/REVERSED/CANCELLED `production_entry`, `missing=0`, `duplicates=0`, all six deltas = 0, `wip ≥ 0`, reversal pairs balance to 0.
- **Per Job Card:** the sum of all valid child-entry reconciliations holds; card's completed-qty cross-check vs `JobCardSubjob.completed_quantity` shows no event-implied contradiction.
- **Per Work Order / Per Item / Per Date Range:** aggregate sums reconcile to the sum of their constituent entries (no double-count, no omission). Any unexplained drift at a higher level is categorized (entry-level itemization) before acceptance.
- **Zero unexplained drift:** any detected delta must be fully explained by a documented data-quality exception (e.g., pre-existing reversed-then-reversed-by-hand, deleted DRAFT) with a recorded reason; otherwise the batch is FAILED and the run halts.

**Guard:** successful full reconciliation is a **hard prerequisite** to any Stage D read or Stage E authority-flip (see §5). No flip without it.

---

## 4. Reversal Mapping

### 4.1 Reversal facts in the live code (ProductionController `reverse`)
- Only `POSTED` (or `COMPLETED`) entries can be reversed.
- A **new reversal entry** is created: `entry_number = PE-REV-…`, `entry_type="Reversal Entry"`, `is_reversal=true`, all quantities **negated** (`negProcess`, `negGood`, …), `status="POSTED"`, `quality_status="REVERSED"`, `reversed_from_entry_id=<original>`, `reversal_reason`.
- The **original** entry's `status` becomes `REVERSED` (it is NOT deleted).
- The current projection (`EventKind.REVERSE`) creates a **mirror** session keyed to the reversal's own `entry_number` with `session_status=CANCELLED`, operation `REVERSED`, negated outputs. The original historical projection stays `COMPLETED` untouched (P3-06).
- Legacy does **not** post inventory at Entry reverse (FG posting is Job-Card-completion only). So reversal creates no duplicate inventory posting today.

### 4.2 Status-card → normalized-event behavior (exact mapping)

| Legacy entry state | Event session/op/output | Normalized action | Duplicate inventory? | Replay prevention |
|---|---|---|---|---|
| `POSTED` (or `COMPLETED`) | session `COMPLETED`, op `COMPLETED`, outputs ACCEPTED/REJECTED/REWORK/SCRAP | projected at POST | no (events post nothing) | natural-key constraint on op/output |
| `REVERSED` (reactivity: this is the **original** after a reversal) | original session remains `COMPLETED` (unchanged) | **never** create a new/reversed session for the original | no | original natural key immutable |
| `REVERSED` (the reversal row: `is_reversal=true`, negated) | **mirror** session `CANCELLED`, op `REVERSED`, negated outputs | projected at REVERSE; auditable link via `reversed_from_entry_id` | no (events post nothing) | reversal mirror uses its own natural key; the original's key can never be reused |
| `CANCELLED` (`cancel` action) | session `OPEN`→ remains `OPEN` **unless a post ever finalized it**; in backfill, CANCELLED-before-post → `OPEN` with no finalized outputs | session state reflects never-finalized; outputs absent | no | open session keyed to entry number |
| `REJECTED` (`reject` action) | session `OPEN` (never finalized); no output events | as above | no | n/a |
| `SUBMITTED` / `APPROVED` | session `OPEN` (not yet posted); no outputs | projected at CREATE | no | n/a |
| `DRAFT` | session `OPEN` (backfill may project or skip — see 2.3/§3 missing-rule options) | optional projection | no | n/a |

### 4.3 Rules (hard)
1. **Historical events are never deleted** — no `DELETE`/`UPDATE` of a finalized normalized path; reversal is additive mirror, never in-place.
2. **Auditable reversal relationship** — the reversal lineage is recoverable via `is_reversal`, `reversed_from_entry_id`, and the CANCELLED mirror keyed to the reversal entry. Reversal must not wipe the original's `COMPLETED` history.
3. **No duplicate inventory posting** — events project nothing; reversal triggers no stock writes (authority unchanged). Confirmed in §7.
4. **No replay duplication** — the reversal mirror uses its own deterministic natural key (`reversal.entry_number`), and the original key is consumed; re-running reverse (or backfill) can never emit a second original or a second mirror for the same reversal entry.

---

## 5. Feature Flag & Cutover Strategy

Flag: `production.normalized-ops.enabled`. Default OFF. **Never two competing authoritative writers** — legacy is the writer authority until Stage E is *explicitly* approved.

| Stage | Writer | Reader | Source of truth | Rollback method | Compatibility |
|---|---|---|---|---|---|
| **A — OFF** (today) | legacy only | legacy | legacy `production_entry` | n/a (baseline) | current behavior; events empty |
| **B — Projection Mode** (DONE) | legacy authoritative; projection emits events in same tx | legacy (+ optional read of events) | legacy | flag back to OFF; events are additive and orphaned-harmless; delete new rows if desired | fully compatible (P3 tests prove) |
| **C — Reconciliation Mode** | legacy authoritative | legacy; reconciliation jobs read BOTH | legacy | disable reconciliation job; no data impact | events never change legacy; read-only comparisons |
| **D — Candidate Read Mode** | legacy authoritative | selected **read-only** reporting may source normalized events | legacy (still authority) | switch reader back to legacy; events unchanged | additive read; no API shape change to POST/REVERSE |
| **E — Authority-Flip Candidate** (PLANNED ONLY) | *defined in §6*, NOT active | normalized (as canonical) | could transition to normalized | **not implemented**; requires explicit approval + full §6 impact sign-off | incompatible-by-design; gated |

Each transition is a separate gate with entry criteria, verification, and rollback per §10. Promotion B→C→D→E is never automatic.

---

## 6. Authority-Flip Architecture (design only, NOT implemented)

> Question: *If normalized events eventually became authoritative, which exact component becomes the authoritative writer?*

### 6.1 Candidate authoritative writer
The **single** authoritative writer must be an aggregate-owning service that owns the `prod_*` aggregate and its invariants:
- **`ProductionExecutionService`** (new; does not exist yet) would own `prod_execution_session`/`prod_operation_event`/`prod_output_event` as the aggregate root, enforcing natural-key idempotency, WIP invariants, and reversal-relationship invariants in one place.
- Today, `ProductionNormalizedEventService` is a **derived projector** (reads `ProductionEntry`, writes events) — suitable for projection and reconciliation, but by design it is not an authority: it performs no validation of legacy business rules and posts no inventory. **It must NOT be promoted to authority**; a new owning service is required so the two responsibilities (derive vs. own) never collide.
- Under authority flip, `ProductionExecutionService` would become the **write path** that persisted the entry into `production_entry` (retained as the durable business record) **and** established the normalized event state, with `production_entry` promotion to the durable ledger kept in the same transaction. This keeps a single writer while normalizing reads.

### 6.2 Impact analysis (per domain)
| Domain | Impact of normalized-as-authority |
|---|---|
| **Production Entry (lifecycle)** | entry creation/action endpoints must route through `ProductionExecutionService`; status transitions driven by event lifecycle; audit preserved in both. All `ProductionController` write endpoints affected. |
| **Production Job Card** | Job-card completion currently posts FG via `ProductionStockBoundary`. Authority goes only to Entry/planning; card-completion must source net accepted-good from normalized events (reconciliation-gated) and keep posting via `ProductionStockBoundary` (unchanged inventory gateway). |
| **Inventory posting** | Unchanged gateway `ProductionStockBoundary → StockService`. Events never post; authority flip re-sources the *amount* fed to the boundary from accepted outputs, but the posting mechanism and its idempotency guard stay in `StockService`. |
| **Quality integration** | `quality_status` sourced from `production_entry` today; if normalized events become authoritative, rules must read execution outcomes (accepted/rejected/rework/scrap) from events; NCR linkage semantics need mapping. |
| **OEE** | operator hours/machine idle currently live in `production_entry_operator`/`production_entry`; OEE must read from events **plus** the hours_worked gap (§1.5) — a real blocker to flip until the event model gains labour fields. |
| **Planning** | `work_order`/`route_sheet` consumption and material availability are Planning-owned; normalized events provide actuals input but planning still writes its own tables. Events must not become planning authority. |
| **Reports** | all `findByStatus("POSTED")` style reports (controller §4.9, BR-12) would re-source from events; report parity must be proven before switching. Numerous endpoints affected. |
| **WIP / Rejection / Scrap / Rework** | all derive from events under flip; invariants (never-negative WIP, rejected≤input, reconciliation formula) enforced in `ProductionExecutionService`. |

### 6.3 Legacy API/services affected (identification only)
- `ProductionController` (all entry create/action endpoints, §4.9 reports).
- `ProductionJobCardService` (reads entry outputs at completion).
- `ProductionNormalizedEventService` (repurposed from projector → reconciler/read helper only).
- `ProductionStockBoundary`/`StockService` (unchanged mechanism; input source changes).
- Frontend `ProductionEntryScreen` / `JobCardScreen` (presentation sourcing).
- Quality/OEE/Planning services that currently read `production_entry` directly.

This is **design only** — none of it is implemented, and it must NOT begin without separate approval (§ Mandatory Stop Gate).

---

## 7. Inventory Safety Gate

The normalized event model is confirmed **execution/event tracking only**:

- `ProductionNormalizedEventService` imports **no** `StockService` and has **0** `stockService.` invocations (verified: `<import>` list has no StockService; the only `stock_balance` text is a javadoc note). It never:
  - writes `stock_balance`,
  - writes `stock_ledger`,
  - invoked duplicate stock posting,
  - bypasses `ProductionStockBoundary`,
  - bypasses `StockService`.
- The only Production→inventory gateway is `ProductionStockBoundary.recordJobCardCompleteGood → StockService.recordStockIn` (Job Card completion) and legacy Conversion/Return `stockService` calls in `ProductionController`. Events are orthogonal.

### Exact transaction sequence (POST)
```
BEGIN (existing @Transactional on productionEntryAction/controller)
  1. validate entry status == POSTED/COMPLETED-eligible
  2. update job-card subjob completed-quantity/status            (JobCardSubjob)
  3. pe.setStatus("POSTED"); save production_entry               (authoritative)
  4. save PostingIdempotencyKey (idempotency)                   (reused guard)
  5. normalizedEvents.project(pe, POST)   // derived events ONLY  —
         upsert session COMPLETED, op COMPLETED, 4 outputs;
         NEVER calls StockService / StockBalanceRepository; NO stock write
  6. save audit log POST
COMMIT   // production_entry + events + audit commit together or not at all (P3-02)
// NO inventory posting occurs in this whole sequence for a pure Entry POST.
```

### Exact transaction sequence (REVERSE)
```
BEGIN (existing @Transactional)
  1. validate original status == POSTED/COMPLETED
  2. build reversal entry (negated qty, is_reversal=true, reversed_from_entry_id, status=POSTED)
  3. adjust job-card subjob completed-quantity (assert >=0)      (JobCardSubjob)
  4. original.setStatus(REVERSED); save original                 (history preserved)
  5. savedRev = save reversal entry                              (authoritative mirror)
  6. save audit log REVERSE
  7. normalizedEvents.project(savedRev, REVERSE)  // derived events ONLY —
         upsert mirror session CANCELLED, op REVERSED, negated outputs;
         original COMPLETED session untouched; NO stock write
COMMIT
// REVERSE also emits NO inventory posting (FG receipt is Job-Card-completion only).
```

**Guarantee:** POST and REVERSE add zero `stock_*` activity; the projection neither duplicates nor bypasses the inventory boundary.

---

## 8. Production Status Vocabulary (single vocabulary)

**No new status vocabulary is introduced.** Legacy statuses remain authoritative business states. Normalized `session_status` / `operation_status` are **presentation states of a derived projection**, and are mapped 1:1 deterministically; they never hold a conflicting business meaning.

## Legacy status → normalized (exact, deterministic)
| Legacy `production_entry.status` (+ `is_reversal`) | normalized `session_status` | normalized `operation_status` | notes |
|---|---|---|---|
| `DRAFT` | `OPEN` | `IN_PROGRESS` | not finalized; no outputs |
| `SUBMITTED` | `OPEN` | `IN_PROGRESS` | awaiting approval |
| `APPROVED` | `OPEN` | `IN_PROGRESS` | ready to execute |
| `POSTED` (normal, `is_reversal=false`) | `COMPLETED` | `COMPLETED` | finalized; outputs present |
| `COMPLETED` (event-projection synonym for POSTED job effects) | `COMPLETED` | `COMPLETED` | treated same as POSTED |
| `REVERSED` (the **original** after reversal) | `COMPLETED` (kept) | `COMPLETED` (kept) | history preserved; never overwritten to CANCELLED |
| **reversal row** (`is_reversal=true`, status `POSTED`) | `CANCELLED` | `REVERSED` | compensating mirror; negated outputs |
| `REJECTED` | `OPEN` | `IN_PROGRESS` | not finalized; no outputs |
| `CANCELLED` (before post) | `OPEN` | `IN_PROGRESS` | not finalized; no outputs |

Normalized `OPEN/COMPLETED/CANCELLED` and `IN_PROGRESS/COMPLETED/REVERSED` are **derived display states**, invertible back to the single legacy business status. No normalized-only business state can exist that isn't traceable to a legacy status; the "lifecycle" is a projection facet, not a competing workflow. (The authoritative state machine, `WorkflowStateMachine`, is unchanged and unaffected.)

---

## 9. Backfill Dry-Run Plan

### 9.1 Dry-run pipeline (read-only; writes NOTHING)
1. **Read legacy** `production_entry` (+ children) for the selected scope (filter POSTED/REVERSED/CANCELLED, optional date/item/card).
2. **Generate expected normalized counts** — purely in-memory/SQL projection: per entry → sessions=1 (if finalized), operations=1, outputs = number of nonzero {acc,rej,rew,scr}.
3. **Perform reconciliation** using §3 delta expressions against (empty) current event tables → baseline expectation.
4. **Detect duplicates** — any entry already having an event row (should be zero pre-backfill) or any natural-key collision within the expectation.
5. **Detect quantity drift** — all six deltas must be 0; any nonzero delta is a blocker unless root-caused (§3).
6. **Produce a report** below.
7. **Write no production data** — strictly no `prod_*` inserts, no `production_entry` writes, no `prod_backfill_progress` writes, no trigger/listeners. Only a dry-run report file/log.

### 9.2 Report structure
```
BACKFILL DRY-RUN REPORT — scope: <jobCard | workOrder | item | dateRange ...>
Run ID, timestamp, scope filter, operator, version

1. SOURCE COUNTS
   total entries           : N
   by status               : {POSTED:n, REVERSED:n(orig), reversalRows:m, CANCELLED:n, ...}
   children                : {material:n, operator:n, rejection:n, rework:n, batch:n}

2. EXPECTED NORMALIZED COUNTS
   sessions  (expected)    : X   (already-present: Y)
   operations (expected)   : X
   outputs    (expected)   : X   (acc:a, rej:r, rew:w, scr:s)

3. RECONCILIATION (entry, job card, work order, item, date)
   missing-session       : 0
   duplicate-natural-key  : 0
   Δ_input / Δ_acc / Δ_rej / Δ_rew / Δ_scr / Δ_wip : all 0
   negative-wip          : 0
   reversal-mismatch     : 0

4. DETECTED ANOMALIES
   [list of any non-zero deltas, duplicates, drift or data-quality exceptions
    with entry_number, category, expected vs actual, root cause or "UNEXPLAINED"]

5. VERDICT
   PASS  — if all counts match, all deltas 0, zero unexplained drift
   FAIL  — otherwise (hard blocker; no real backfill)
```
A real backfill is **prohibited** until a dry-run reports **PASS with zero unexplained drift**.

---

## 10. Production Deployment Strategy

| Step | Entry criteria | Execution | Verification | Rollback |
|---|---|---|---|---|
| **Backup** | schema drift known; snapshot plan | pg_dump of legacy + (empty/flat) `prod_*` + Flyway history | restore test on a scratch DB; checksums | restore dump |
| **Deploy additive schema** | backup verified | apply `V4` (UUID `IF NOT EXISTS`) | V4 objects + constraints present; legacy columns intact | drop only additive `prod_*` + V4 history row |
| **Deploy application with flag OFF** | V4 applied | deploy build; flag stays OFF | smoke POST/REVERSE/report; 0 events written | redeploy prior / flag OFF |
| **Regression tests** | app up (OFF) | run backend 211 + FE; manual Production flow | all green; behavior identical to pre-P3 | fix/revert as needed |
| **Projection verification** | regression green | enable flag (`PROD_NORMALIZED_OPS_ENABLED=true`), low traffic; run new writes | POST/REVERSE write events; rollback/idempotency/concurrency probes pass; inventory unchanged (stock tables null-diff) | flag OFF (events additive/orphaned-harmless) |
| **Dry-run backfill** | projection verified | run §9 dry-run, read-only | §9 verdict PASS, zero unexplained drift | n/a (writes nothing) |
| **Reconciliation** | dry-run PASS | run §3 reconciliations per entry/card/order/item/date | all PASS criteria true | re-run; no data impact |
| **Controlled backfill** | reconciliation baseline PASS | backfill job card-by-card (idempotent, `prod_backfill_progress`) | each card COMPLETED + follow-up reconciliation PASS; duplicate count 0 | re-run or drop additive rows (legacy untouched) |
| **Reconciliation (post-backfill)** | backfill done | §3 full reconciliation of backfilled set | 100% PASS zero unexplained drift | fix any anomaly; no authority change |
| **Read-only normalized reporting** | post-backfill reconcile PASS | enable Stage D read endpoints | report parity legacy vs normalized | switch readers back to legacy |
| **Authority-flip review** | read-mode parity proven | §6 design review + sign-off | explicit approval gate | **not staged without approval** |

Each step halts on verification failure; no step auto-promotes to the next; Stage E is reachable only by explicit approval.

---

## Required Recommendation (choose exactly one)

### Option A — Approve Backfill Implementation
> Design proven safe (idempotency, dry-run, reconciliation, reversal mapping, inventory safety all defined and dependency-free of cutover). If you are satisfied the §1–§10 design is complete, approve **backfill implementation only** (still gated on dry-run PASS + zero-drift reconciliation before real execution). Cutover/authority flip remain separate future gates.

### Option B — Approve Dry-Run Only **(Recommended)**
> Recommend **Option B** unless you have no residual questions: residual uncertainty exists and should not be waived — specifically (a) the §1.5 loss ledger (operator `hours_worked`, material/batch/reason-detail not projected) must be accepted before any read/ownership movement; (b) reversal-original `REVERSED`→normalized `COMPLETED` semantics (§8) should be confirmed by stakeholders; (c) backfill ordering by `entry_number` vs `id` and date-scoped correctness need a live dry run. Approve the **dry-run tooling + dry-run execution only**, then require a fresh approval to implement the controlled backfill.

### Option C — Hold
> Select **Hold** if data semantics (esp. §8 REVERSED↔COMPLETED, §1.5 loss ledger, or §3 negative-WIP on reversal rows) remain unresolved. No backfill or tooling is started until those reconciliations/rules are closed.

---

## Mandatory Stop Gate

**STOP.** This document is a **read-only plan**. Do **not** until explicit approval:

- execute backfill,
- create backfill code,
- change the authority model,
- change feature flag behavior,
- modify legacy Production Entry,
- modify inventory logic,
- modify Production APIs.

**Recommendation requested from reviewer: Option A / B / C.**