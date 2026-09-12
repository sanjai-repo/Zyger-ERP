# DOCUMENT_24 — P3 FINAL ARCHITECTURE GATE REPORT

**Status:** READ-ONLY. Validates DOCUMENT_23 against the actual codebase. **NO source, migration, DB, entity, API, or frontend changes.**
**Scope:** Finalize P3 architecture for approval decision. Does NOT create `prod_execution_session` / `prod_operation_event` / `prod_output_event`.
**Codebase basis:** Verified against real `production_entry*` schema (V1 baseline L5413–5642), `ProductionController.createProductionEntry` (L145–196), `productionEntryAction` POST/reverse (L303–483), existing `PostingIdempotencyKey` + `X-Idempotency-Key` guard, existing status vocabulary, and P2 boundary (`ProductionStockBoundary`→`StockService`).

---

## 1. AUTHORITATIVE DATA MODEL — TRANSITION MATRIX

**Critical codebase fact that shapes the model:** the legacy `production_entry` is a **single flattened per-operation row** already carrying `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity`, `process_qty`/`produced_quantity`, `operation_code`, `machine_code`, `operator_code`, `subjob_number`, `route_sheet_number`, plus children `production_entry_material / _operator / _rejection / _rework / _batch`. **There is exactly ONE transaction source of truth at any time — never two competing writers.**

| Phase | Legacy `production_entry` | Normalized events (`prod_execution_session`/`_operation_event`/`_output_event`) | **Authoritative source** |
|---|---|---|---|
| Initial rollout (flag OFF) | **Write** + **read** + stock posting | not emitted (absent) | **Legacy `production_entry`** (single source) |
| Compatibility period (flag ON) | **Write** + stock posting (unchanged, transaction of record) | **Derived read/analytics** projection; replay idempotent | **Legacy `production_entry`** = write/posting; **events** = operation-level read (SECONDARY, derived — not a competing writer) |
| Cutover (post recon PASS, flag stays ON) | **Read-only** archive + backfill reference | **Write** + **read** (becomes primary) | **Normalized events** (single source) |
| Rollback (flag OFF) | **Write** + **read** + posting restored to full authority | events stop being written; additive event rows ignored/optionally removed | **Legacy `production_entry`** |

**Invariant:** During coexistence the two models never both accept authoritative writes. Events are **derived inside the same transaction** from the entry already being persisted; they never become a second accepted-input gateway. No competing transaction source of truth exists in any phase.

---

## 2. DUAL-WRITE RISK ANALYSIS

### Principle
Events are emitted **inside the same DB transaction** as the legacy save, from the **already-validated in-memory aggregate** — not by parsing legacy rows afterward. This eliminates the "legacy saved but events missing" partial-failure class for new writes (both commit atomically or neither does).

### Failure/mitigation matrix

| Scenario | Prevention |
|---|---|
| DB transaction rollback | Entire method is `@Transactional` (create + event projection + (for POST) stock posting all commit together). If any throw → full rollback of legacy **and** events **and** any posting in that tx. No partial write. |
| API retry | Reuse existing `X-Idempotency-Key` / `Idempotency-Key` → `PostingIdempotencyKey` guard (already in `productionEntryAction` L310–321, 374–383): replay returns already-processed result, no second legacy *, event, or posting. |
| Browser double submission | Same `X-Idempotency-Key` header; idempotency key scoped by POST action. |
| Service retry (framework/dead-letter) | Deterministic event ID derived from natural key (`PE-<entryNumber>` for session; `<sessionKey>:<operationCode>:<seq>` for operation/output) ⇒ identical on retry; DB unique constraints reject dupes. |
| Event-creation failure AFTER legacy save | Cannot happen within one transaction (both roll back). If, in a future async path, events are derived out-of-band, a compensating/idempotent re-derivation keyed by `entry_number` closes the gap; logs flag it. |
| Legacy-save failure AFTER event creation | Same single transaction ⇒ both roll back. Event rows never persist without their legacy entry. |
| Concurrent execution (two requests same entry) | Unique constraint on natural key + pessimistic/optimistic `version` on `production_entry` (already present, L5460). Only one POST wins the idempotency guard; loser returns existing result or version conflict. |

### Idempotency keys & uniqueness constraints (proposed, additive)
- `production_entry`: natural key `entry_number` UNIQUE (existing numbering). `version` (optimistic) exists.
- `prod_execution_session`: **UNIQUE(entry_number)**.
- `prod_operation_event`: **UNIQUE(session_id, subjob_number, operation_code, seq)**.
- `prod_output_event`: **UNIQUE(session_id, operation_event_id, output_type, item_code, location)**.
- Inventory posting: existing `StockLedger.existsByDocNoAndDocType` (idempotency) retained; **events never call stock** (§4).

---

## 3. QUANTITY RECONCILIATION (finalized on real schema)

Legacy entry columns store per-entry finals; the session aggregates across entries for a job-card/operation.

### Invariant (per operation / per session)
```
process_qty (Available Input) = good_quantity (Accepted)
                              + rejected_quantity (REJECTED)
                              + rework_quantity (REWORK)
                              + scrap_quantity (SCRAP)
                              + WIP (open quantity, session not closed)
```
`produced_quantity` = `process_qty` (set both at create, L163–164); good is auto-derived `good = process − rework − reject` when omitted (L158–161) — this already enforces balance for the normal path.

### Scenario validation (vs actual model)
| Scenario | Drift check | Result |
|---|---|---|
| Partial production | `process_qty > 0`, some outputs, remaining = WIP on open session | balanced; WIP keeps session open |
| Multiple production entries (job-card/operation) | session sums entries; invariant holds per entry and for the aggregate | balanced if each entry honors invariant |
| Partial rejection | `rejected_quantity` split from good; invariant unaffected (reject counted) | balanced |
| Rework completion | `rework_quantity` tracked; when reworked, re-entered as a new output/operation and closed | balanced |
| Scrap | `scrap_quantity` counted as output category | balanced |
| Product conversion | `production_type`/conversion; reconcile on converted equivalents (UoM/factor) | balanced by factor |
| Production return | separate `production_return` domain (not `production_entry`); excluded from entry invariant but must net material (`_material.return_qty/rp_qty`) | balanced at material level |
| Disassembly | one input → N component outputs via `_material`/multiple outputs; reconcile against multiple-output sum | balanced by bill factor |
| Reversal/cancellation | reversal creates a NEGATED `production_entry` (`is_reversal=true`, negated quantities L421–431); session event reversal mirrors the negated totals | balanced (net zero) |

**Zero-drift guarantee mechanism:** a `ProductionQuantityReconciliationService` recomputes invariants from the aggregate each time and **blocks session-close** on any imbalance (unless authorized short-close). Any drift ⇒ STOP, no cutover (gate). Existing POST already writes a matching good-vs-process balance; the reconciliation test suite (§11) proves all 9 scenarios.

---

## 4. INVENTORY BOUNDARY — ZERO DIRECT STOCK WRITES

Only permitted Production inventory chain (unchanged from P2):
```
Production Domain → ProductionStockBoundary → StockService → stock_ledger / stock_balance
```
**Exactly which P3 events cause inventory movement vs execution-only:**
- **Execution-only** (NO stock): `prod_execution_session` (open/close), `prod_operation_event` (operation timing/machine/operator/status). These describe execution; they never post stock.
- **Output events** (`prod_output_event`): **do NOT post stock directly.** Inventory movement remains driven **only** by the existing entry POST action → `ProductionStockBoundary`. Output events are a **mirror/derived** record of the same quantities that the entry posting already consumed.

**Non-duplication guarantee:** Because events are derived from the same validated aggregate in the same transaction and never invoke StockService, exactly **one** posting occurs per POST (the existing one). Events add zero posts. A dedicated test asserts `StockService` invocation count = 1 per POST and 0 for pure execution events.

---

## 5. LEGACY COMPATIBILITY MATRIX

| Surface | During P3, unchanged & functioning | Notes |
|---|---|---|
| `ProductionController` (all endpoints) | **Yes — unchanged** | same paths/verbs; only JobCard blocks already thin-delegated in P2 |
| Production Entry API (list/create/get/update/delete/action/eligible-operations/reports) | **Yes** | create kept transactional; posting kept at POST; reversal kept |
| Job Cards | **Yes** | identity owner; subjob progress writes unchanged (L344–370) |
| Reports (rejection/rework/idle/machine/operator) | **Yes** | read from POSTED legacy entries (BR-12) unchanged |
| Pending screens (`/pending`, `/dashboard`) | **Yes** | unchanged |
| Conversion | **Yes** | untouched (incl. its stock postings) |
| Return | **Yes** | untouched (incl. its stock postings) |
| Log Sheet | **Yes** | untouched |
| Idle Time | **Yes** | untouched |
| Existing DB records | **Yes** | untouched; backfill is additive-only, no in-place mutation |

**Every existing API continues functioning unchanged in P3.** All new behavior is additive behind the flag.

---

## 6. DATABASE MIGRATION DESIGN (proposed — NOT executed)

### Rules
Additive only · No DROP · No RENAME · No destructive data migration · No removal of legacy columns · Indexed · FK justified · PostgreSQL-compatible.

### Table-by-table proposal (new, additive: 4 tables)
| Table | Columns (proposed) | Indexes | FK strategy |
|---|---|---|---|
| `prod_execution_session` | `id` PK; `entry_number` UNIQUE; `job_card_id`; `work_order_id`; `session_status`; `available_input`; `accepted_output`; `rejected`; `rework`; `scrap`; `wip`; `started_at`; `completed_at`; `created_by`. | PK, `UNIQUE(entry_number)`, `idx_...job_card_id`, `idx_...work_order_id` | **Logical FKs (no DB constraint) to `job_card`/`work_order`** — mirrors approved V3 decision: avoids coupling/idempotent replay friction; enforced at service layer. `entry_number` backed by no FK (self-contained). |
| `prod_operation_event` | `id` PK; `session_id` (FK→session); `subjob_number`; `operation_code`; `seq`; `machine_code`; `operator_code`; `start_time`; `end_time`; `operation_status`. | PK, `UNIQUE(session_id, subjob_number, operation_code, seq)`, `idx_...session_id` | **DB FK → prod_execution_session.id** (hard referential integrity for event children; they don't reference legacy). |
| `prod_output_event` | `id` PK; `session_id`; `operation_event_id`; `output_type` (ACCEPTED/REJECTED/REWORK/SCRAP); `item_code`; `location`; `quantity`; `reason_code`. | PK, `UNIQUE(session_id, operation_event_id, output_type, item_code, location)`, `idx_...session_id` | **DB FK → session + operation_event** (children integrity). |
| `posting_idempotency_key` | already exists | existing | retained |

### Relationship diagram
```text
prod_execution_session (1) —< prod_operation_event (N) —< prod_output_event (N)
        │  (logical FK → job_card / work_order / entry_number; no DB FK)
legacy production_entry (1:1 by entry_number, additive coexistence, untouched)
```
**FK strategy justified:** hard DB FKs on the event children (session→operation→output) for intra-P3 referential integrity; **no** DB FK from session to legacy `production_entry`/`job_card`/`work_order` to preserve additive-only migration and replay independence (documented, service-enforced). Fully compatible with existing PostgreSQL data (new tables only).

---

## 7. EVENT LIFECYCLE (no conflicting status vocabulary)

P3 **must not** define a parallel lifecycle that fights the existing Production statuses. Two explicit vocabularies, aligned:

**Legacy (unchanged, authoritative for user-facing docs):**
`entry.status`: DRAFT → SUBMITTED → APPROVED → POSTED → REVERSED / REJECTED / CANCELLED
`entry.quality_status`: PENDING → PASS / FAIL / HOLD / REVERSED
`job_card.status`: DRAFT/RELEASED/IN_PROGRESS/ON_HOLD/COMPLETED/CLOSED/CANCELLED/PENDING/QUALITY_HOLD

**P3 event lifecycle (internal execution, derived, NON-user-facing):**
- `prod_execution_session.session_status`: `OPEN` → `COMPLETED` (and `CANCELLED` on full reversal).
- `prod_operation_event.operation_status`: `PENDING` → `IN_PROGRESS` → `COMPLETED` (→ `REVERSED` on entry reversal). Pause/hold reflected by legacy `ON_HOLD`/`HOLD` (quality) — the event row stays `IN_PROGRESS` with a `hold_reason`, **not** a new status word.
- `prod_output_event.output_type`: `ACCEPTED/REJECTED/REWORK/SCRAP` — a **category**, not a lifecycle status.

**Anti-collision:** event statuses are namespaced to the session/operation aggregates only; they are never surfaced as a second `production_entry`/`job_card` status, never stored on legacy columns, and never used to gate legacy transitions. The Procedure: event lifecycle is a **projection** of the legacy lifecycle, so no two status systems can conflict.

---

## 8. CUTOVER AND FEATURE FLAG — `production.normalized-ops.enabled`

| Setting | Behavior |
|---|---|
| **OFF (initial/default)** | Events not emitted. System byte-identical to today: legacy write + posting only. Reads of operation events return empty/disabled. No new tables touched. |
| **ON** | On each validated legacy write (create/POST/reverse), **in the same tx**, derive + insert `prod_execution_session`/`prod_operation_event`/`prod_output_event` (idempotent by natural key). **Stock posting unchanged** (still via POST→boundary, single posting). New operation-level read/analytics endpoints available (behind flag). New operation-level UX surfaces events (read-only). |
| **Existing records** | Not auto-backfilled on flag flip. Backfill is a separate explicit job (§9). Until backfilled, history reads from legacy (existing screens keep working). |
| **New records** | Fully emitted (flag ON). |
| **Rollback** | Flip OFF: events stop being written; legacy path is and remains full authority. Existing event rows are additive and harmless; optionally purged by an approved cleanup (never against legacy). |
| **Mixed-version deployment (rolling, N instances at different versions)** | Flag is read per-request from **config + DB-guarded by idempotency keys/unique constraints**, not from in-memory only. Newer instances writing events and older instances not, or vice-versa, are reconciled by: (1) events are derived, not authoritative-write, so absence/presence of event rows never changes stock or legacy; (2) deterministic natural keys + unique constraints make duplicate-emission impossible; (3) legacy is authoritative for posting in every version, so mixed versions cannot double-post. Safe for rolling deployment. |

---

## 9. BACKFILL STRATEGY (NOT implemented — design only)

- **Mapping `production_entry*` → events:** one `prod_execution_session` per `production_entry.entry_number`; one `prod_operation_event` per (entry, `subjob_number`, `operation_code`); `prod_output_event` rows from `good_quantity`(ACCEPTED)/`rejected_quantity`(REJECTED)/`rework_quantity`(REWORK)/`scrap_quantity`(SCRAP); material/operator/rejection/rework/batch children mapped to child output/material/source attributes.
- **Idempotency:** deterministic IDs from natural key (same as §2); `UNIQUE` constraints; re-runnable.
- **Batch strategy:** ordered by `production_entry.id`, paginated (e.g. 1000/commit), respecting `version` and `is_reversal` (negated entries → reversing events).
- **Progress tracking:** marker table `prod_backfill_progress(job_card_id, last_entry_id, processed, status)`.
- **Reconciliation SQL (acceptance):**
```sql
SELECT pp.entry_number,
       pp.process_qty AS input,
       pp.good_quantity + pp.rejected_quantity + pp.rework_quantity + pp.scrap_quantity AS outputs
  FROM production_entry pp
 WHERE pp.status = 'POSTED' AND pp.is_reversal IS NOT TRUE
   AND ABS(pp.process_qty - (pp.good_quantity+pp.rejected_quantity+pp.rework_quantity+pp.scrap_quantity)) > 0.0001;
```
Zero rows = zero-drift acceptance for backfilled history.
- **Rollback:** flip flag OFF + delete only event/backfill-marker rows; legacy untouched. No destructive migration.

---

## 10. API & FRONTEND IMPACT

**New (read-only, flag-gated) APIs:** operation-level session/operation/output list & summary for a `job_card`/`entry` (no lifecycle-change endpoints yet). No POST/PUT endpoints that mutate events or stock.

**New FE components:** read-only operation timeline / output breakdown panel surfaced from the derived events on the existing Production Entry or Job Card detail — additive, **does not replace** the existing entry UX. **No redesign of existing Production screens.**

**DEC-PROD-001 maintained (verbatim requirement):**
> The user enters production through the final Production Entry UX; normalized operation events are system-derived internal execution records, not manually created documents.

Frontend never lets a user create `prod_operation_event`/`prod_output_event` manually.

---

## 11. TEST PLAN (before implementation approval)

| Category | Tests |
|---|---|
| Unit | event derivation (entry→session/operation/output mapping); reversal (negation) mapping; lifecycle transitions; reconciliation invariant per scenario |
| Integration | create→POST with flag ON emits exactly the expected events; stock posting count === 1; children persisted |
| Transaction rollback | force throw after legacy save → assert nothing committed (legacy + events + posting all absent) |
| Idempotency | duplicate `X-Idempotency-Key` POST → single legacy *, event set, posting; `UNIQUE` constraint drill |
| Concurrent request | parallel POST same entry → one succeeds (version/idempotency guard), no duplicate events/posting |
| Quantity reconciliation | all 9 scenarios (§3) balanced; close blocked on drift; zero-drift SQL returns 0 rows |
| Legacy compatibility | all existing ProductionController/Entry/Reports/Pending/Conversion/Return/Log/Idle endpoints return unchanged results with flag OFF; existing records intact |
| Feature flag ON/OFF | OFF = byte-identical current behavior; ON = additive events only, no stock change; rollback flip safe |
| Inventory non-duplication | assert `StockService` called exactly once per POST; zero direct stock writes from event code |

---

## 12. FINAL P3 CHANGE LIST (draft for approval — NOT created)

**CREATE**
- Entities: `ProdExecutionSession`, `ProdOperationEvent`, `ProdOutputEvent` (+ 3 repos)
- Migration: `V4__prod_normalized_events.sql` (additive: 3 new tables + `prod_backfill_progress`; indexes/uniques; NO legacy alteration)
- `ProductionNormalizedEventService` (derives events; idempotent)
- `ProductionQuantityReconciliationService`
- `ProductionExecutionAggregateService` (session lifecycle + close gate)
- Backfill job + `prod_backfill_progress` writer
- 1 read-only operation-level reporting endpoint/service (flag-gated)
- Test suite (§11)

**EXTEND**
- `ProductionController.createProductionEntry` / `productionEntryAction` — **add event projection call guarded by flag, inside existing transaction**; single-point, no logic replacement
- `application.yaml` — flag `production.normalized-ops.enabled`

**REFACTOR**
- None of the legacy write logic. (Optional thin extraction only if a test requires isolating the projection; otherwise zero refactor.)

**OFF-LIMITS**
- `production_entry*` schema/entities — **no change**
- Legacy status vocabulary, lifecycle transitions, numbering, stock posting, `ProductionStockBoundary`, `StockService`, JobCard/Subjob progression, Conversion/Return/Log/Idle — **no change**
- No new user-facing document creation; no redesign of existing screens

---

## MANDATORY P3 GATE — STOP

No application source, migrations, DB schema, entities, APIs, or frontend were modified to produce this report. This validates DOCUMENT_23 against the real codebase and finalizes the architecture for review.

---
## RECOMMENDATION

**B — IMPLEMENT ONLY WITH CONDITIONS.**

Conditions (to be explicitly confirmed at P3 implementation approval):
1. Events must be derived **inside the same transaction** as the legacy write (never a separate post-commit async write that could separate legacy and events), OR an equivalent out-of-band re-derivation with documented reconciliation must be adopted.
2. Reuse the existing `X-Idempotency-Key`/`PostingIdempotencyKey` guard — do not introduce a second idempotency mechanism.
3. The reconciliation zero-drift gate (§3/§9 SQL, 9 scenarios, §11) must pass on a representative production-data snapshot BEFORE cutover; any scenario drift blocks cutover.
4. `prod_output_event` must never invoke `StockService`; a test asserts exactly one posting per POST.
5. Backfill stays additive-only with its own progress marker; never mutates legacy rows.
6. No change to `production_entry*` schema/entities, legacy status vocabulary, numbering, or the inventory boundary.
7. Mixed-version safety relies on derived-not-authoritative events + unique constraints — must be validated by the concurrent/mixed-version tests before rolling deployment.

Upgrade to **A (SAFE TO IMPLEMENT)** once these are reflected in an approved, test-covered P3 implementation plan.