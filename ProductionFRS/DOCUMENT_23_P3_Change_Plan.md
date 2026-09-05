# DOCUMENT_23 — P3 CHANGE PLAN (READ-ONLY)

**Status:** READ-ONLY PLAN ONLY — NO SOURCE MODIFIED, NO MIGRATIONS, NO NEW TABLES, NO `production_entry` CHANGES.
**Prerequisite:** P2 formally approved (DOCUMENT_22). P3 remains **UNAUTHORIZED** until this plan is reviewed and approved.
**Date:** 2026-09-03

---

## Purpose

P3 introduces a **normalized operation-level event model** for Production while preserving DEC-PROD-001 (final-part single-entry UX) and the P2 inventory boundary. This document is the authoritative implementation plan for scope approval. It does **not** create `prod_execution_session`, `prod_operation_event`, or `prod_output_event`.

---

## A. AUTHORITATIVE EXECUTION MODEL

**Decision (to confirm at P3 approval):**

| Artifact | Role | Authoritative? | Ownership |
|---|---|---|---|
| `prod_execution_session` | Session/execution aggregate (one per Production Entry / job-card execution) | **Authoritative execution container** | Owned by Production domain |
| `prod_operation_event` | Normalized per-operation event (operation begin/end, qty, machine, operator, timestamps) | **Authoritative operation-level transaction source** | Owned by Production domain |
| `prod_output_event` | Normalized output/outcome event (good/reject/rework/scrap produced quantities) | **Authoritative output/quantity source** | Owned by Production domain |

**Proposed relationship (single root):**
```text
Execution Aggregate  (prod_execution_session)  — 1 → N
    ├── prod_operation_event   (one per operation execution)
    └── prod_output_event      (one per output x location/status)
```
`prod_execution_session` is the **aggregate root** keyed to the Job Card (`job_card_id`) and Work Order (`work_order_id`); operation/output events hang off the session. The **authoritative** quantity/operation truth for P3 becomes the normalized event streams, **mirror-fed** from the existing legacy write path (see B/C).

**Rules:**
- `prod_operation_event` is authoritative for *operations* (machine, operator, timing, status).
- `prod_output_event` is authoritative for *output quantities* (distributed yields).
- `prod_execution_session` is authoritative for *execution identity/lifecycle* (open/complete/cancel).
- The **legacy `production_entry*` tables remain the transactional write target** during a coexistence window (see B); events are the *canonical read/analytics/reporting model* and the forward target.

---

## B. LEGACY COEXISTENCE

**No deletion, no destructive migration.** The legacy tables:
```text
production_entry
production_entry_material
production_entry_operator
production_entry_rejection
production_entry_rework
production_entry_batch
```
continue to exist **for the full coexistence period** and remain the source that StockService posting consumes today.

**Coexistence model — "dual-write, legacy-anchored, event-derived":**
1. **Legacy = transaction of record (unchanged).** The existing Production Entry write path keeps writing to the 6 legacy tables exactly as today. Existing reads/postings/reports that depend on them keep working.
2. **Events = derived projection.** On each successful legacy write, the Production domain emits normalized events (insert into `prod_execution_session` / `prod_operation_event` / `prod_output_event`) **derived from the same in-memory data already used for the legacy write** — not a re-parse of legacy rows. This is a forward projection, not a destructive consolidation.
3. **Single source of truth during coexistence:** `job_card` (identity) + legacy tables (transactional detail) remain authoritative for inventory; events are authoritative for the new operation-level UX/reporting and eventually become the single source after cutover.
4. **No re-parenting of BaseDoc** (D4, C4) — `production_entry` keeps its inheritance; events are a separate additive model.
5. **Idempotency:** event projection keyed by a natural key (e.g. `session.doc_type+doc_no` and per-operation key) so replay is idempotent; no duplicate events on retry.

---

## C. CUTOVER STRATEGY

1. **Old write path (unchanged):** Production Entry → legacy `production_entry*` → `ProductionEntryValidationService` → inventory boundary → `StockService` → `stock_ledger/stock_balance`. Kept for the whole compatibility period.
2. **New write path (additive, behind flag):** same Entry submission → validate → **emit P3 events** (`prod_execution_session` + `prod_operation_event` + `prod_output_event`) **in the same transaction** → then existing inventory posting. The event projection is additive and does not alter stock behavior.
3. **Compatibility period:** both paths active together for at least one release cycle (recommend ≥ 1 sprint, 2 weeks, or until reconciliation §D passes 100% for ≥1 week of live data).
4. **Feature flag strategy:** a config flag, e.g. `production.normalized-ops.enabled` (default `false` during coexistence → `true` at cutover). When `false`: events not emitted (behavior identical to today). When `true`: events emitted (read path + new UX enabled). **No runtime behavior change when flag off** — the legacy path remains the transaction of record either way.
5. **Read strategy:** during coexistence, new operation-level dashboards/UX read from **events**; legacy screens continue reading legacy tables. After cutover, legacy tables become read-for-migration/reporting only, and normalized events become the primary read.
6. **Backfill strategy (no destructive change):** for **existing** already-posted entries, backfill events with a re-runnable, idempotent job that reconstructs `prod_execution_session`/`prod_operation_event`/`prod_output_event` from legacy rows, guarded by the same natural key so it can be re-run. Runs during the coexistence window; markers track backfill progress per `job_card`.
7. **Rollback strategy:**
   - Flip flag off → events no longer emitted; system returns to pure legacy behavior instantly (legacy writer untouched throughout).
   - Event tables are additive; dropping them (if ever) does not affect legacy data or stock.
   - No destructive migration is ever applied in P3; rollback is a config flip + (optional) delete of event rows.

---

## D. QUANTITY RECONCILIATION (operation level)

**Required invariant — must be formally tested at P3:**
```text
Available Input = Accepted Output + Rejected + Rework + Scrap + Remaining/WIP
```
P3 will add a **quantity reconciliation engine + tests** enforcing, per session and per operation:

| Term | Source |
|---|---|
| Available Input | planned/issued input to the operation (from session + material events) |
| Accepted Output | `prod_output_event` status=ACCEPTED sums |
| Rejected | status=REJECTED sums (+ rejection reason/location) |
| Rework | status=REWORK sums (+ rework target operation) |
| Scrap | status=SCRAP sums |
| Remaining / WIP | current open quantity at the operation (session not complete) |

**Explicitly addressed scenarios:**
| Scenario | Reconciliation handling |
|---|---|
| Multiple output | `prod_output_event` is per output × (item × location × status); sums across all outputs reconcile to input |
| Conversion | input item → output item; reconcile on **converted equivalents** (UoM factor) with a stated conversion ratio |
| Disassembly | one input → N component outputs; outputs reconcile against bil/multiplicity factors |
| Rework | reworked qty tracked as its own output category and re-entered to a rework operation; re-opens the target operation's WIP for a re-run |
| Partial operations | WIP = input − (sum of all accepted/rejected/rework/scrap) remains open on the session; session not closed until WIP=0 or short-close documented |
| Reversal/correction | negative compensating `prod_output_event`/operation reversal with audit reason; reconciliation engine re-runs and recomputes (no in-place edit of historic aggregate) |

Reconciliation is enforced with a **blocking gate** at session close (a session cannot be closed with a non-zero imbalance unless an authorized short-close reason is recorded) — consistent with existing complete-guard behavior.

---

## E. FINAL-PART UX vs OPERATION EVENTS (DEC-PROD-001 PRESERVED)

```text
FINAL PART
Single Production Entry UX      ← unchanged frontend entry point
        ↓
Execution Aggregate            (prod_execution_session, auto-created)
        ↓
Multiple Operation Events      (prod_operation_event + prod_output_event, auto-derived)
        ↓
Normalized Transaction Data
```
- The frontend keeps the **single Production Entry** form (final-part UX). Users do **not** create operation documents manually.
- P3 only derives the multi-operation event projection **behind the aggregate** from the single entry. No new user-facing workflow is introduced.
- The JobCard/Entry screens are **not** redesigned in P3; they remain the entry point. Reporting/analytics may surface the operation events.
- **No disconnected operation documents** are exposed to the user.

---

## F. INVENTORY PROTECTION

P3 introduces **no direct stock posting.**
- Every inventory-impacting event continues through the P2 approved chain:
```text
Production flow → ProductionStockBoundary → StockService → stock_ledger / stock_balance engine
```
- The P3 event model is **posting-neutral**: events describe operations/outputs; they never touch `stock_balance`, `StockBalanceRepository`, or `stock_ledger` directly.
- No new service outside `ProductionStockBoundary` may invoke `StockService` postings; a lint/scan gate (extend the existing stock-write scan) enforces this.

---

## Proposed P3 file set (AT APPROVAL ONLY — not created now)

- Entities: `ProdExecutionSession`, `ProdOperationEvent`, `ProdOutputEvent` (+ repos)
- Migration: `V4__prod_normalized_events.sql` (additive-only: 3 new tables + indexes, **no** drop/alter of legacy `production_entry*`)
- `ProductionNormalizedEventService` (derives events from legacy submission, idempotent)
- `ProductionQuantityReconciliationService` (+ tests for §D invariants)
- `ProductionExecutionAggregateService` (session lifecycle + close gate)
- Backfill job + feature-flag config + flag guards in Entry write path
- Reconciliation & coexistence tests; extension of stock-write scan
- Op-event reporting endpoints (read-only) behind the flag

**Explicitly NOT in P3:** modification of `production_entry*` schema/entities, deletion of legacy tables, re-parenting BaseDoc, runtime numbering change, any direct stock write.

---

# STOP

This is a **read-only** change plan. **No source code, migrations, or `production_entry` changes were made.** Await formal P3 scope approval before implementing DOCUMENT_23.