# DOCUMENT_26 — P3 Implementation & Projection Gate Report

**Phase:** P3 — Additive Normalized Operation-Event Projection (APPROVED SUBSET)
**Status:** **GATE PASS**
**Author:** production-module execution
**Date:** 2026-09-03

---

## 1. Recommendation & Scope Statement

Per the P3 Approval Decision, only the **SAFE SUBSET** was implemented:

- Additive normalized event schema (`prod_execution_session` / `prod_operation_event` / `prod_output_event` + projection/idempotency metadata).
- Derived event projection from the existing authoritative `production_entry` write path.
- Same-transaction persistence of `production_entry` **+** derived normalized event records.
- Natural-key uniqueness constraints and idempotency protection.
- Feature flag `production.normalized-ops.enabled`.
- Projection services / repositories / domain components.
- Read-only normalized-event reporting endpoints (flag-gated).

**NOT in scope (NOT implemented):** authoritativeness flip, backfill execution, cutover, removing any legacy structure, `prod_order` table, inventory behavior changes.

**Non-negotiable rules honored:** P3-01 (single authoritative writer), P3-02 (same transaction), P3-03 (idempotency), P3-04 (quantity semantics), P3-05 (inventory), P3-06 (reversal), P3-07 (feature flag), P3-08 (no backfill execution), P3-09 (no cutover), P3-10 (DB additive safety).

---

## 2. Changed-File Register

### New files (additive, `production.normalized-ops.enabled` OFF ⇒ no behavior change)

| File | Purpose |
|---|---|
| `config/ProductionNormalizedOpsProperties.java` | Feature-flag reader (`@Value("${production.normalized-ops.enabled:false}")`) |
| `entity/ProdExecutionSession.java` | Aggregate root entity; `UNIQUE(entry_number)` (entity + migration) |
| `entity/ProdOperationEvent.java` | Operation event entity; `UNIQUE(session_id, subjob_number, operation_code, seq)` |
| `entity/ProdOutputEvent.java` | Output event entity; `UNIQUE(session_id, operation_event_id, output_type, item_code, location)` |
| `repo/ProdExecutionSessionRepository.java` | Session repo (find by entry_number / job card / status) |
| `repo/ProdOperationEventRepository.java` | Operation repo (natural-key lookup) |
| `repo/ProdOutputEventRepository.java` | Output repo (natural-key lookup) |
| `service/ProductionNormalizedEventService.java` | **Derived projection** (same-tx, idempotent natural keys, ZERO stock coupling) |
| `db/migration/V4__prod_normalized_events.sql` | Additive DDL: 3 event tables + `prod_backfill_progress` (reserved, NOT executed) |
| `test/.../service/ProductionNormalizedEventServiceTest.java` | Unit tests (8) |
| `test/.../service/ProductionNormalizedEventProjectionIntegrationTest.java` | DB-backed tests (concurrency, rollback, inventory, reconciliation, reverse) |
| `test/.../controller/ProductionNormalizedEventControllerIntegrationTest.java` | End-to-end API create→POST→REVERSE (flag ON) |

### Modified files (P3 additive blocks only)

| File | P3 additions |
|---|---|
| `controller/ProductionController.java` | injection of `ProductionNormalizedEventService`; `project(CREATE)` after save; `project(POST)` in post action; `project(REVERSE)` in reverse action; 2 read-only GET `/api/v1/production/normalized/**` endpoints |
| `resources/application.yaml` | `production.normalized-ops.enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}` |

### Off-limits files (verified untouched in P3)

`StockService.java`, `production_entry*` schema/entities/repositories, `WorkflowStateMachine`, `DocNumberService`/`DocTypes`, Planning/`work_order` logic, `job_order`, legacy table deletion. **No** file in the pre-existing `stock_balance`/`StockBalanceRepository` writer set was added-to or modified by P3 (see §7).

---

## 3. Migration & Schema Evidence

### V4 validated on a FRESH PostgreSQL (Flyway path, V1→V2→V3→V4)
- `V4__prod_normalized_events.sql` applies cleanly (`rc=0`), strictly additive (`CREATE TABLE IF NOT EXISTS`).
- Creates: `prod_execution_session`, `prod_operation_event`, `prod_output_event`, `prod_backfill_progress`.

### V4 validated on a DB WITH EXISTING Production data
- Seed row `production_entry(PE-OLD-1, POSTED, good=90)` remains **intact** (`PE-OLD-1/POSTED/90.0000`) after V4.
- V4 adds only the new event tables; no alteration to `production_entry*`.

### Schema / constraints present (both entity `@Table` and migration, matching names)
```
uq_prod_execution_session_entry      UNIQUE(entry_number)
uq_prod_operation_event_session_key  UNIQUE(session_id, subjob_number, operation_code, seq)
uq_prod_output_event_key             UNIQUE(session_id, operation_event_id, output_type, item_code, location)
uq_prod_backfill_progress_job        UNIQUE(job_card_number)
```
Constraints are declared **both** in the migration (Flyway-managed prod/staging) **and** on the entities (Hibernate `ddl-auto` dev/test), so the DB-level uniqueness backstop exists in every environment — closing the P3-03 concurrency/idempotency requirement outside Flyway too.

### Confirmed NO `prod_order`
Event tables only; no `prod_order` table/model introduced (gate item 11).

---

## 4. Transaction-Boundary Evidence (P3-02)

- `createProductionEntry`, `productionEntryAction` (POST/REVERSE) are already `@Transactional`. The projection is invoked **inside** those existing transactions (after the authoritative save, before commit) — derived events and the authoritative `production_entry` commit together or not at all.
- **Rollback test (DB):** `ProductionNormalizedEventProjectionIntegrationTest.authoritativeRollbackRollsBackEvents` wraps `save(entry) + project(POST)` in a rollback-only transaction and asserts **0** `production_entry` rows and **0** `prod_execution_session` rows for that entry after rollback. PASS.
- No asynchronous fire-and-forget projection exists; projection is synchronous in-transaction only.

---

## 5. Idempotency Evidence (P3-03)

- **Deterministic natural keys:** session = `entry_number`; operation = `(session_id, subjob_number, operation_code, seq)`; output = `(session_id, operation_event_id, output_type, item_code, location)`.
- **DB unique constraints** reject duplicate emission (present in entity + migration).
- A `DataIntegrityViolationException` from a duplicate natural key is **absorbed** (idempotent re-find), so a concurrent duplicate NEVER rolls back the authoritative write; genuine projection errors still propagate (P3-02).
- Reuses the existing POST `Idempotency-Key`/`PostingIdempotencyKey` guard — no new idempotency table.

### Coverage vs mandated scenarios
| Scenario | Test | Result |
|---|---|---|
| API retry | `reEmissionIsIdempotent` (DB) + `reEmissionIsIdempotentForOutputs` (unit) | PASS |
| Browser double-submit | `reEmissionIsIdempotentForOutputs` (natural-key re-emission) | PASS |
| Service retry | `duplicateNaturalKeyAbsorbed` + `reEmissionIsIdempotent` | PASS |
| Transaction retry / replay | `reEmissionIsIdempotent` (no event-count/quantity increase) | PASS |
| Concurrent requests | `concurrentEmissionIsSafe` (24 threads → exactly 1 session, 1 op, 4 outputs) | PASS |

---

## 6. Quantity Reconciliation Evidence (P3-04)

Authoritative mapping implemented (matches live codebase semantics — `produced_quantity` is an alias of `process_qty`, NOT good output):

```
available_input  = process_qty                      (NOT good_quantity)
accepted_output  = good_quantity
rejected         = rejected_quantity
rework           = rework_quantity
scrap            = scrap_quantity
wip              = max( available_input − (accepted+rejected+rework+scrap), 0 )   [never negative]
```
- `ProductionNormalizedEventServiceTest.quantityReconciliationMapping`: asserts input != good, input=100, wip=2, wip ≥ 0. PASS.
- `ProductionNormalizedEventProjectionIntegrationTest.projectionPersistsWithReconciliation`: 100→90/5/3/2, wip=0, 4 output rows, one operation. PASS.
- `ProductionNormalizedEventControllerIntegrationTest`: POSTed entry wip = 0 (100−(90+0+0+10)), never negative. PASS.

---

## 7. Inventory Evidence (P3-05)

- `ProductionNormalizedEventService` imports **no** `StockService`, has **0** `stockService.` invocations, and its only `stock_balance` mention is a javadoc note. **Zero inventory coupling.**
- `ProductionNormalizedEventProjectionIntegrationTest.projectionProducesNoInventoryPostings`: `stock_ledger` and `stock_balance` counts are **unchanged** before/after projection while the event tables ARE populated. PASS.
- Only pre-existing Production inventory writers remain: Job-Card completion via `ProductionStockBoundary → StockService` and Conversion/Return `stockService` calls in `ProductionController` (untouched by P3). The event projection adds exactly **zero** new postings.
- The real inventory authority chain confirmed: `production_entry` POST/REVERSE does NOT post stock directly; FG receipt occurs at Job-Card completion through the approved P2 boundary; Conversion/Return post their own. Events are execution projections only.

---

## 8. POST & REVERSE Evidence (P3-06)

- **POST** finalizes session `OPEN→COMPLETED`, operation `→COMPLETED`, and emits nonzero output rows (ACCEPTED/REJECTED/REWORK/SCRAP). Verified end-to-end via HTTP (Controller test) and at service/DB level.
- **REVERSE** creates a **compensating mirror** session (`CANCELLED`) + operation (`REVERSED`) + negated outputs, keyed to the reversal entry's own `entry_number`. The **original historical projection is preserved untouched** (never deleted, never in-place edited). Verified:
  - `ProductionNormalizedEventServiceTest.reverseCreatesMirrorAndPreservesOriginal` (unit).
  - `ProductionNormalizedEventProjectionIntegrationTest.reversePreservesOriginalAndMirrors` (DB: both `COMPLETED` original and `CANCELLED` mirror coexist).
  - Controller test: original entry becomes `REVERSED` (not deleted); `CANCELLED` mirror exists.
- Hard deletion remains limited to DRAFT (unchanged legacy behavior); POSTED history preserved.

---

## 9. Feature-Flag ON/OFF Evidence (P3-07)

- Flag default `false` (`production.normalized-ops.enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}`).
- **OFF** (`ProductionNormalizedEventServiceTest.flagOffIsNoOp`, `flagOffReadsEmpty`): `project()` is a strict no-op; read lookups return empty; system byte-identical to today (legacy write + posting only). PASS.
- **ON** (`@SpringBootTest(properties="production.normalized-ops.enabled=true")` for integration suites): events derived, legacy remains authoritative.
- **Legacy authoritativeness survives ON** (Controller test): the original `production_entry` row drives status transitions (DRAFT→POSTED→REVERSED) and inventory authority is unchanged. Events never become an independent accepted transaction (P3-01) — no API/service/frontend can create events manually (events are emitted solely by the projection path; no create-endpoint exists).
- Mixed-version safety: flag read per-request; events are derived (additive), legacy is authoritative in every version; deterministic keys + DB uniqueness prevent double-emission across instances.

---

## 10. API-Compatibility Matrix

| Legacy API | Behavior with flag OFF | Behavior with flag ON | Status |
|---|---|---|---|
| `POST /api/v1/production/entries` (create DRAFT) | unchanged | unchanged + derived OPEN session | Compatible |
| `POST /api/v1/production/entries/{id}/actions/post` | unchanged | unchanged + COMPLETED session + outputs | Compatible |
| `POST /api/v1/production/entries/{id}/actions/reverse` | unchanged | unchanged + CANCELLED mirror | Compatible |
| `GET /api/v1/production/entries` / `{id}` | unchanged | unchanged | Compatible |
| Job-Card endpoints (`./job-cards/**`) | unchanged | unchanged | Compatible |
| Conversion / Return endpoints | unchanged | unchanged | Compatible |
| **NEW (read-only, flag-gated)** `GET /api/v1/production/normalized/entries/{entryNumber}` | empty list | session tree | Additive |
| **NEW (read-only, flag-gated)** `GET /api/v1/production/normalized/job-cards/{jobCardNumber}` | empty list | sessions | Additive |

All existing 11 P2 `/orders` endpoints and legacy Production endpoints continue to function (regression suite green).

---

## 11. Full Test Delta

| Metric | P2 completion | P3 (this gate) | Delta |
|---|---|---|---|
| Backend test files | 59 | 62 | +3 |
| Backend tests | 196 | **211** | +15 |
| Backend failures | 0 | **0** | 0 |
| Backend errors | 0 | **0** | 0 |
| P3 tests (new) | — | 15 | +15 |
| Frontend test files | 5 | 5 | 0 |
| Frontend tests | 34 | 34 | 0 (no FE changes) |
| Frontend typecheck | exit 0 | exit 0 | 0 |

### Regression result
`./gradlew test` → **BUILD SUCCESSFUL** (211 tests, 0 failures, 0 errors). No existing test regressed.

### Frontend baseline
- Tests: 5 files / 34 pass (no FE source modified by P3).
- Typecheck: exit 0.
- Lint: observed 772 problems (31 errors, 741 warnings). This is the **pre-existing working-tree baseline** — P3 modified **zero** frontend files (`find src -newermt` = none), so the earlier documented P2 lint basis (769/31/738) differs only by pre-existing uncommitted FE edits made between sessions, **not** by P3. No new errors introduced by P3.

---

## 12. Direct Stock-Write Static Scan (gate item 3)

Scan of the P3 changed-set file `ProductionNormalizedEventService.java`:
- Imports: no `StockService`; no `StockBalanceRepository` import.
- `stockService.` invocations: **0**.
- `stock_balance` references: javadoc note only.

The pre-existing inventory-writer file set (`.gitignore`-clean): `StockService`, `ProductionStockBoundary`, `ProductionJobCardService`, `InventoryIntegrationService`, `PlanningMasterController`, `SpareRequestService`, `ScheduledJobs`, `StockBalanceRepository`. **None added or modified by P3.**

---

## 13. Explicit List of Work NOT Performed (gate item 13)

- ❌ **No historical backfill executed** and **no backfill-on-startup/enablement** (P3-08). Only the reserved `prod_backfill_progress` marker table exists (empty, unused). Backfill remains separately gated on Condition C3 reconciliation PASS.
- ❌ **No authority flip** to normalized events (P3-01/09). `production_entry` remains the sole authoritative business transaction.
- ❌ **No cutover**: no replacement of `production_entry`, no removal of legacy fields/APIs/reports, no rename/drop of legacy tables, no modification of existing historical Production data (P3-09).
- ❌ **No `prod_order` model/table** introduced.
- ❌ **No DROP / RENAME / re-type / legacy-constraint removal** (P3-10).
- ❌ **No new idempotency table** (reused existing `PostingIdempotencyKey`).
- ❌ **No StockService/stock_balance writes** from event code.
- ❌ **No frontend changes** (DEC-PROD-001 final-entry UX preserved intact).
- ❌ **No P4 or any subsequent phase started.**

---

## 14. Remaining Gates (NOT opened — backfill / cutover / authority flip)

The following remain **gated separately** (per DOCUMENT_25 recommended subset) and are **NOT** approved by the P3 safe-subset decision:

1. **Backfill (P3-08)** — reconstruct events for existing POSTED `production_entry` rows, idempotent/resumable via `prod_backfill_progress`, ordered by `production_entry.id`, reconciliation-SQL acceptance (zero-drift). Requires **Condition C3 reconciliation PASS** first.
2. **Cutover / authority flip** — making normalized events the canonical read/authoritative source, phase-out of legacy reads/reports. Requires a separate full review + explicit approval.
3. **Any future validation** of legacy `production_entry` semantics or inventory model changes the events depend on — remains as-is.

These are deliberately **not** executed or auto-triggered in this subset.

---

## 15. Compliance Sign-Off (P3-01..P3-10)

| Rule | Status |
|---|---|
| P3-01 Single authoritative writer | ✅ `production_entry` authoritative; events derived; no manual event creation |
| P3-02 Same transaction | ✅ projection in existing `@Transactional`; rollback test PASS |
| P3-03 Idempotency | ✅ natural keys + DB unique + absorbed DIVE + reuse POST idempotency key |
| P3-04 Quantity semantics | ✅ input=process_qty, outputs mapped, WIP=never negative; tests PASS |
| P3-05 Inventory | ✅ zero stock coupling; stock-table non-change test PASS |
| P3-06 Reversal | ✅ original preserved + compensating mirror; no deletion |
| P3-07 Feature flag | ✅ OFF=no-op, ON=derived; legacy authority holds; mixed-version safe |
| P3-08 No backfill execution | ✅ none executed/startup-triggered; marker table reserved only |
| P3-09 No cutover | ✅ no flip/removal/rename/replacement |
| P3-10 DB safety | ✅ additive-only; validated fresh + with existing records |

---

## 16. Conclusion

**GATE PASS.** The approved P3 safe subset is implemented, tested (211/0/0 backend, +15 P3 tests covering rollback, retry, double-submit, service retry, concurrency, uniqueness, projection consistency, flag ON/OFF, inventory non-duplication, POST, REVERSE, quantity reconciliation) and validated on fresh + seeded databases. No backfill, cutover, or authority flip occurred.

**STOP. P4 is NOT started.** P4 requires a separate review and explicit approval.