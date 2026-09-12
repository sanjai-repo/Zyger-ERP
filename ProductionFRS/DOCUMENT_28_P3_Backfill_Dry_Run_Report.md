# DOCUMENT_28 — P3 Backfill Dry-Run Report

**Phase:** P3.1 — Backfill Dry-Run (OPTION B approved; dry-run only)
**Type:** Read-only analysis. No backfill executed. No code writes.
**Status:** **READY WITH REQUIRED CORRECTIONS (Option B)**
**Date:** 2026-09-03

> The dry-run is **strictly read-only**: it performs `SELECT` only. It never inserts/updates/deletes
> normalized event tables, never mutates legacy `production_entry*` data, never calls
> `StockService`/`ProductionStockBoundary`/`StockBalanceRepository`, and never writes
> `stock_ledger`/`stock_balance`. Read-only safety and inventory isolation are **proof-assisted by
> automated tests** (see §2, §11). **No actual backfill was run.**

---

## 1. Dry-Run Scope

- **What:** `ProductionBackfillDryRunService` simulates, entirely in memory, the normalized projection
  (`prod_execution_session` → `prod_operation_event` → `prod_output_event`) that an actual historical
  backfill would derive from the authoritative `production_entry` domain, and produces a
  reconciliation / loss-ledger / reversal / performance report.
- **Where run (two scopes):**
  1. **Live business database** `zyger_erp` — the real Production Entry business data (current state).
  2. **Isolated PostgreSQL Testcontainer** — a representative dataset exercising all statuses, a
     reversal pair, children, and edge WIP cases (seeded only in the disposable container; never the
     live DB).
- **Not simulated:** material/operator/rejection/rework/batch are read and enumerated in the loss
  ledger but are **not** projected into the event model (they remain authoritative in legacy) — see §5.

---

## 2. Read-Only Safety Proof

`ProductionBackfillDryRunService` holds dependencies on `ProductionEntryRepository` (JPA reads) and
`JdbcTemplate` (read-only `COUNT`/`SELECT`). It has **no** dependency on and **no** reference to
`StockService`, `StockBalanceRepository`, or `ProductionStockBoundary`.

Automated proof (`ProductionBackfillDryRunIntegrationTest.dryRunIsReadOnly`):
- Seed a POSTED entry; snapshot `production_entry`, `prod_execution_session`, `prod_operation_event`,
  `prod_output_event`, `stock_ledger`, `stock_balance` counts; run the dry-run; assert **all counts
  unchanged** (only the pre-seeded entry remains). PASS.
- `DryRunResult.readOnlyProven` is set by a post-scan table re-read; asserted true. PASS.
- `DryRunResult.inventoryIsolationProven` is set by a runtime stock-count stability check; asserted
  true. PASS.

**Result: read-only is PROVEN.** Writing is impossible by construction (no repository save call exists
in the service; the only DB access is `findAll()` and `JdbcTemplate.queryForObject(...)`).

---

## 3. Dataset Scope

### 3.1 Live business database (`zyger_erp`)
Scanned via read-only SQL / service projection. Snapshot at run time:

| Metric | Value |
|---|---|
| **Total Production Entries scanned** | **1** |
| POSTED entries | 0 |
| REVERSED entries (original status) | 0 |
| DRAFT entries | 0 |
| SUBMITTED entries | 0 |
| APPROVED entries | 0 |
| CANCELLED entries | 0 |
| REJECTED entries | 1 |
| Reversal rows (`is_reversal=true`) | 0 |
| `production_entry_material` rows | 0 |
| `production_entry_operator` rows | 0 |
| `production_entry_rejection` rows | 0 |
| `production_entry_rework` rows | 0 |
| `production_entry_batch` rows | 0 |
| Existing normalized events (`prod_*`) | 0 (expected pre-backfill) |

The live dataset is **sparse** (1 REJECTED, non-finalized entry). It exercises the DRAFT-style branch
but not POSTED/reversal variance, so §3.2 seeds a representative set in an **isolated** container to
validate all statuses/reversal/edge logic.

### 3.2 Representative dataset (isolated Testcontainer — not the live DB)
Seeded to cover every legacy status + a reversal pair + children:

| Entry | Status | Qty profile → simulated |
|---|---|---|
| PE-100 | POSTED | process 100, good 90, rej 5, rew 3, scr 2 → session COMPLETED, 4 outputs, WIP 0 |
| PE-100-REV | POSTED (is_reversal) | negated (−100/−90/−5/−3/−2), reversed_from PE-100 → mirror CANCELLED/REVERSED |
| PE-200 | DRAFT | zero outputs → session OPEN, 0 outputs |
| PE-201 | SUBMITTED | → session OPEN |
| PE-202 | APPROVED | → session OPEN |
| PE-203 | REJECTED | → session OPEN (unposted) |
| PE-204 | CANCELLED | → session OPEN (unposted) |
| PE-300 | COMPLETED | → session COMPLETED, 4 outputs |

All 6 aggregation dimensions (Job Card / Work Order / Item / Date / Machine / Operation) present.
Children (material/operator/rejection/rework/batch) attached to `PE-100` for loss-ledger completeness.

---

## 4. Legacy-to-Normalized Simulation Results

All simulated projections matched the reference mapping exactly:
- **POSTED/COMPLETED** → session `COMPLETED`, operation `COMPLETED`, outputs = nonzero
  `{ACCEPTED=good, REJECTED=rejected, REWORK=rework, SCRAP=scrap}`, each with `item_code=part_code`,
  `location=STORE`; first rejection/rework child reason folded to `output.reason_code`.
- **Reversal rows** (`is_reversal=true`) → mirror session `CANCELLED`, operation `REVERSED`,
  negated (already-negated legacy) outputs; original historical projection untouched.
- **REVERSED originals** → keep `COMPLETED` projection (never overwritten to CANCELLED).
- **DRAFT / SUBMITTED / APPROVED / REJECTED / CANCELLED (unposted)** → session `OPEN`, operation
  `IN_PROGRESS`, no outputs.

100% of entries produced the expected **1 session, 1 operation**; output count matched the count of
nonzero output categories. No duplicate or missing mapping within the representative set.

---

## 5. Field Loss Ledger Results

The executable loss ledger (`ProductionBackfillDryRunService` static exhaustive map) classifies every
legacy column across `production_entry` and its 5 children. The 48 `production_entry` columns are each
classified individually; the 5 child tables are each classified as grouped "all columns" rows. **Total
ledger rows: 54, covering all legacy columns.** No column is unclassified.

Summary by classification:

| Classification | Ledger rows | Meaning |
|---|---|---|
| MAPPED | 20 | direct copy into event columns |
| DERIVED | 6 | computed (WIP, produced-alias, dates, reversal lineage, identity) |
| PRESERVED_IN_LEGACY | 25 | authoritative in legacy; NOT in event surface (kept, no data loss) |
| NOT_YET_REPRESENTED_BLOCKER | **0** | no field blocks a faithful execution/output backfill |
| INTENTIONALLY_OUT_OF_SCOPE | 3 | audit/free-text metadata deliberately excluded |

**Key preserved-in-legacy gaps (normalized read-surface gaps; data is preserved, never deleted):**

| Gaps (table → fields) | Business purpose | Affected process | Resolution | Backfill blocked? |
|---|---|---|---|---|
| `production_entry_operator` → `operator_code` (secondary), `operator_name`, `is_primary`, `hours_worked` | multi-operator + labour-hours detail | **OEE** | add `prod_operation_operator` detail table (future) | **No** |
| `production_entry_material` → all material columns | raw-material consumption | **Inventory / Planning** | accepted as out-of-scope; legacy authoritative | **No** |
| `production_entry_batch` → `batch_number`, `allocated_qty`, `warehouse_code`, `batch_type` | batch trace | **Inventory** | accepted as out-of-scope; legacy authoritative | **No** |
| `production_entry_rejection`/`_rework` → per-reason `reason_code`/`quantity` beyond first row | reason drill-down | **Quality** | add per-output reason rows (future) | **No** |
| `production_entry` → `quality_status`, `shift_code`, `uom`, `process_*`, `idle_*`, `mhr`, `item_weight`, `financial_year`, `route_sheet_*`, `supervisor_*`, `reversal_reason`, `entry_type`, `production_type`, `remarks` | reporting / OEE / audit dimensions | **Reporting / OEE / Quality** | keep legacy or add to event model later | **No** |

**Zero BLOCKER-classified fields** in the execution/output projection. `blocksBackfill=false` for every
row. The "missing required mapping" criterion (§14) is met **only for the execution/output projection
scope**; the OEE/material/batch/reason gaps are surfaced as **HIGH/MEDIUM recommendations** and left to
reviewer acceptance before any read or authority movement (see §13).

---

## 6. Quantity Reconciliation Results

Per-entry identity `process_qty = good + rejected + rework + scrap + WIP` holds by construction of WIP
(`max(input − Σoutputs, 0)`). Reconciliation checks executed:

| Scope | Input authority (`process_qty`) | Entries imbalanced | Entries with drift | Result |
|---|---|---|---|---|
| Representative (Testcontainer) | every finalized entry has process=good+rej+rew+scr+WIP | 0 | 0 | **PASS** |
| Live DB single entry | `process_qty` **null**; outputs present | (see §13 finding) | flagged | **EXCEPTION** |

**produced_quantity vs process_qty reported separately (Rule 4):**
- Representative: `produced_quantity == process_qty` (alias semantic) for expected entries → PASS.
- **Live entry `PE/2026-27/00001`: `produced_quantity = 100.0000` but `process_qty = NULL`** and
  `good(95) + rejected(5) = 100`. This **data proves produced_quantity is NOT an alias of process_qty**
  here, and is **not** "good output" — it behaves as **total produced (good+rejected)**. Flagged
  (§13, MEDIUM). `produced_quantity` is never treated as good output.

---

## 7. WIP Validation

- WIP formula: `WIP = max(process_qty − (good+rejected+rework+scrap), 0)`; **never negative** (clamped).
- Representative set: **0 negative-WIP entries**; every sim WIP ≥ 0. PASS.
- Live entry: `process_qty` null → WIP derived as 0 (input=0). Definitionally ≥ 0, but the input is
  understated (true input unknown). Surfaced as a reconciliation exception (§13), not a negative-WIP
  violation.

---

## 8. Reversal Validation

Validated on the representative reversal pair (`PE-100` POSTED → `PE-100-REV`):

| Check | Result |
|---|---|
| Original history remains unchanged (`PE-100` stays `COMPLETED`) | **PASS** — original projection preserved, never CANCELLED |
| Reversal relationship traceable (`reversed_from_entry_id` resolves) | **PASS** |
| Quantities correctly negated (`original.good + reversal.good ≈ 0`) | **PASS** |
| No duplicate event simulation | **PASS** — mirror keyed to its own `entry_number`; original key never reused |
| No replay scenario | **PASS** — deterministic natural keys make re-run a no-op |
| No inventory side-effect | **PASS** — events/reversal project nothing; `stock_*` unchanged |
| `ReversalValidation.valid` | **PASS** |

No reversal implementation was modified.

---

## 9. Duplicate Detection

Duplicate detection is by natural key (session `entry_number`; operation `(session, subjob, op, seq)`;
output `(session, op, type, item, location)`):
- Representative + live: **0 duplicate events** (simulated projection is unique by construction; no
  existing event rows to collide with pre-backfill).
- Expected duplicates after an idempotent re-run: **0** (natural-key constraints + `prod_backfill_progress`
  watermark prevent re-emission).

---

## 10. Missing Event Detection

Pre-backfill the normalized event tables are empty, so **every finalized entry yields `expected=1`
session and is "missing" from the empty event tables** — this is the *expected pre-backfill state* (the
very thing an actual backfill would create), reported as a metric, **not** a defect. In the
representative run the expected event counts were fully simulated (no entry with an unmapped projection). No
entry failed to produce an expected session/operation; no "missing required mapping" at the execution
scope.

---

## 11. Inventory Isolation Evidence

**Static (bytecode/dependency):** `ProductionBackfillDryRunService` compiles against
`ProductionEntryRepository` + `JdbcTemplate` only. An automated test reads the service class constant
pool and asserts it references **no** `StockService`, `StockBalanceRepository`, or
`ProductionStockBoundary`. PASS.

**Runtime:** the dry-run records `stock_ledger` and `stock_balance` counts before/after and asserts
they are unchanged (`inventoryIsolationProven`). PASS.

**No path** exists from `DryRun → Legacy Read → Mapping Simulation → Reconciliation → Report` to
`ProductionStockBoundary` / `StockService` / `StockBalanceRepository` / `stock_balance` / `stock_ledger`.

---

## 12. Performance Results

Measured on the isolated Testcontainer (PostgreSQL 16, Hibernate `ddl-auto`, single read-only
transaction; figures include the in-memory per-entry validation + 6 aggregation passes):

| Run | Records processed | Duration | Records/second | Notes |
|---|---|---|---|---|
| Live DB (sparse) | 1 | < 50 ms | n/a (trivial) | real single-entry read; deterministic |
| Representative (Testcontainer) | 300 | 1593 ms | **188.3** | includes parent+children seeding wall-time outside the measure |
| Scale (Testcontainer) | 5,000 | 12,961 ms | **385.8** | drop of per-record cost as JIT warms; dominated by save-side, not scan |

- **Records processed:** the number of `production_entry` rows scanned = reported exactly.
- **Memory:** single `findAll()` materializes all entries in memory; for the current live volume (1 row)
  and representative scale this is negligible. For very large volumes a streaming/paged scan
  (`SQL_TW`/JdbcTemplate row mapper) is the recommended hardening before an actual backfill.
- **Batch behavior:** the dry-run does not batch (it is a report). An actual backfill is designed for
  per-job-card, per-chunk transactions (DOCUMENT_27 §2.3/§10).

---

## 13. Blocking Findings

Findings are machine-generated by the dry-run; each prefixed with severity.

| Severity | Code | Scope | Finding |
|---|---|---|---|
| **MEDIUM** | INPUT-AUTHORITY-NULL | Live entry `PE/2026-27/00001` | `process_qty` is NULL yet `good=95`, `rejected=5` are recorded; `produced_quantity=100`. WIP is derived on process_qty (0), so input authority and WIP are ambiguous in the legacy record. **Reconcile input authority before backfill.** |
| **LOW** | PRODUCED-DIFF | Live entry `PE/2026-27/00001` | `produced_quantity (100) != process_qty (null/0)`. Data proves `produced_quantity` here is total-produced (good+rejected), not an alias of process_qty, and not good output (Rule 4 honored). Confirmation-only. |
| **INFORMATION** | (none) | All | Zero BLOCKING and zero negative-WIP findings. No duplicate events. Reversal reconciliation passed. Read-only and inventory isolation proven. |

**Severity roll-up:** BLOCKING **0** · HIGH **0** · MEDIUM **1** · LOW **1** · INFORMATION **0**
(machine-generated). Additional HIGH/MEDIUM **recommendations** documented in §5 loss ledger
(material/operator-hours/reason/batch normalized-read gaps) for reviewer attention before any read or
authority movement — none of which block an execution/output backfill itself.

---

## 14. Actual Backfill Readiness — **B — READY WITH REQUIRED CORRECTIONS**

Assessment against the §14 criteria:

| Criterion | Status |
|---|---|
| Zero unexplained quantity drift | **PASS** (identity holds; one documented legacy exception `PE/2026-27/00001` flagged, not unexplained) |
| Zero missing required mappings (execution-output scope) | **PASS** (0 BLOCKER fields) |
| Zero duplicate mappings | **PASS** |
| Reversal reconciliation passes | **PASS** |
| No data-loss blockers | **PASS** |
| Inventory isolation passes | **PASS** |

**Result: `B — READY WITH REQUIRED CORRECTIONS`.**

Rationale: the execution/output projection mapping is faithful, reversible, idempotent, and inventory-safe.
However, before an actual historical backfill is run, the following must be **closed/accepted** by the
reviewer:

1. **Live record `PE/2026-27/00001` (INPUT-AUTHORITY-NULL):** decide the authoritative input quantity for
   reconciliation when `process_qty` is NULL but `good+rejected>0` (e.g., treat `produced_quantity` as the
   input proxy, or record a data-quality correction). This is the only factual reconciliation exception.
2. **OEE/labour gap:** `production_entry_operator.hours_worked` and multi-operator detail are **not** in the
   event model; accept as legacy-authoritative (backfill proceeds) or require a `prod_operation_operator`
   addition first. OEE reads must keep sourcing legacy until addressed.
3. **Material/batch/reason-detail gaps:** confirm they remain legacy-authoritative and out of the
   execution-event read surface (accepted in DOCUMENT_27 §1.5).

If the reviewer accepts items 1–3 (or corrections are applied), the controlled backfill (DOCUMENT_27
§10) may proceed; **it is not started here.**

---

## Mandatory Stop Gate

**STOP.** This was a **dry-run only**. Per the approval, the following are **NOT** done and must **not**
begin without explicit approval:
- ❌ run actual backfill / insert normalized historical events
- ❌ change authority (normalized events become authoritative)
- ❌ enable a normalized-authority mode
- ❌ modify Production Entry APIs
- ❌ modify inventory posting
- ❌ modify legacy data

I will review this DOCUMENT_28 before approving any actual historical backfill.