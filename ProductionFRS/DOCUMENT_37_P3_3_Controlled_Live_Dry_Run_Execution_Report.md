# DOCUMENT_37 — P3.3 Controlled Live Dry-Run Execution Report

## 1. Document Control

| Field | Value |
|-------|-------|
| **Document** | DOCUMENT_37 — P3.3 Controlled Live Dry-Run Execution Report |
| **Phase** | P3.3 — CONTROLLED BACKFILL ENGINE IMPLEMENTATION — **PHASE D (CONTROLLED LIVE DRY-RUN EXECUTION)** |
| **Type** | Live dry-run execution evidence report |
| **Authoritative inputs** | DOCUMENT_31, DOCUMENT_32, DOCUMENT_33, DOCUMENT_34, DOCUMENT_35, DOCUMENT_36, current source code + live database evidence |
| **Current dataset** | EXACTLY 1 `production_entry` (PE/2026-27/00001) |
| **Prior phases** | Phase A (COMPLETE), Phase B (COMPLETE), Phase C (COMPLETE) |
| **Execution date** | 2026-09-04 |

## 2. Phase Objective

Execute the **approved controlled LIVE dry-run** (read-only) of the backfill engine against the live `zyger_erp` database and prove the engine safely handles the current production dataset without modifying `production_entry`, legacy production data, `stock_ledger`, `stock_balance`, inventory, or any normalized production event table. This phase is a **dry-run only** — NOT actual backfill.

## 3. Authorization / Execution Boundary

- This is a dry-run execution, authorized per DOCUMENT_36 final decision (A — READY FOR CONTROLLED LIVE DRY-RUN), subject to all mandatory preconditions.
- The dry-run is **read-only**: it classifies the record via the actual `ProductionInputAuthorityResolver` and produces **zero** writes.
- **NOT authorized:** actual backfill (`dryRun=false`), normalized-event insertion, `production_entry`/legacy modification, inventory posting, feature-flag changes, migration, source changes.
- No code was modified during Phase D.

## 4. Pre-flight Checks

All pass:

| # | Check | Result |
|---|-------|--------|
| 1 | `production.backfill.enabled` OFF before live execution | ✅ `enabled: ${PROD_BACKFILL_ENABLED:false}` |
| 2 | `production.normalized-ops.enabled` unchanged | ✅ `enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}` |
| 3 | No public backfill endpoint | ✅ none in controllers |
| 4 | prod/staging profiles use `ddl-auto: validate` | ✅ prod + staging |
| 5 | Code matches approved P3.3 implementation | ✅ all engine + resolver classes present |
| 6 | Full backend regression baseline green/unchanged | ✅ 256 tests / 0 failures, UP-TO-DATE, no code changes |

## 5. Feature Flag State

| Flag | application.yaml | Live default | Status |
|------|------------------|--------------|--------|
| `production.normalized-ops.enabled` | `${PROD_NORMALIZED_OPS_ENABLED:false}` | false | **UNCHANGED / OFF** |
| `production.backfill.enabled` | `${PROD_BACKFILL_ENABLED:false}` | false | **OFF** (never enabled during Phase D) |
| `spring.jpa.hibernate.ddl-auto` (prod/staging) | validate | validate | **SAFE** |

The harness performed the dry-run **without** enabling `production.backfill.enabled` and **without** booting the full Spring context.

## 6. Database Connection Safety Method

- Live DB: `jdbc:postgresql://localhost:5432/zyger_erp` (PostgreSQL 16 on 127.0.0.1:5432).
- All SQL executed via `psql` under `SET default_transaction_read_only = on`.
- The dry-run harness opened a **read-only JDBC connection** (`Connection.setReadOnly(true)`) and issued **SELECT only**; it never issued INSERT/UPDATE/DELETE/DDL.
- No Spring context, no Hibernate, no `ddl-auto` behavior, no Flyway execution against the live DB during Phase D.

## 7. BEFORE Database Baseline

| Table | Count |
|-------|-------|
| `production_entry` | **1** |
| `prod_execution_session` | **0** |
| `prod_operation_event` | **0** |
| `prod_output_event` | **0** |
| `prod_backfill_progress` | **0** |
| `prod_backfill_entry_outcome` | **0** |
| `stock_ledger` | **41** |
| `stock_balance` | **17** |

## 8. production_entry Fingerprint / Checksum

BEFORE checksum: `9b00088442b0aa6f3b980562ab63be09`
(MD5 over `id|entry_number|process_qty|produced_quantity|good_quantity|rejected_quantity|rework_quantity|scrap_quantity` per row, ordered by id.)

AFTER checksum: `9b00088442b0aa6f3b980562ab63be09` — **UNCHANGED**.

## 9. Live Dataset Inventory

| id | entry_number | process_qty | produced_quantity | good | rej | rework | scrap | status |
|----|--------------|-------------|-------------------|------|-----|--------|-------|--------|
| 1 | PE/2026-27/00001 | NULL | 100.0000 | 95.0000 | 5.0000 | 0.0000 | 0.0000 | REJECTED |

## 10. Resolver Execution Evidence

The **actual** `ProductionInputAuthorityResolver.resolve()` (the sole quantity authority) was executed against the live record via the read-only harness:

```
Entry: PE/2026-27/00001  (id=1)
  process_qty        = null
  produced_quantity  = 100.0000
  good/rej/rew/scrap = 95.0000 / 5.0000 / 0.0000 / 0.0000
  => RESOLVER:
     semanticCategory  = CATEGORY_B
     inputAuthority    = AMBIGUOUS
     effectiveInput    = null
     confidence        = MEDIUM
     eligibility       = QUARANTINE
     reasonCode        = INPUT-AUTHORITY-NULL
     isResolvable      = false
```

This is exactly the expected result. No code path converts produced→process, fabricates input, or asserts WIP for unresolved records.

## 11. Eligibility Register

Eligible records: **0** — no `production_entry` is ELIGIBLE/resolvable today.

## 12. Quarantine Register

| Entry # | id | Category | Authority | Effective Input | Confidence | Eligibility | Reason | isResolvable | Dry-run action |
|---------|-----|----------|-----------|-----------------|------------|-------------|--------|--------------|----------------|
| PE/2026-27/00001 | 1 | CATEGORY_B | AMBIGUOUS | NULL | MEDIUM | QUARANTINE | INPUT-AUTHORITY-NULL | false | QUARANTINED |

Quarantined records: **1**.

## 13. Controlled Dry-Run Execution Details

- **Method:** read-only JDBC harness (in `/tmp/opencode`, outside the repo) connecting with `setReadOnly(true)`.
- **Engine logic:** loaded the live `production_entry`, invoked the **actual** `ProductionInputAuthorityResolver`, applied the engine's dry-run classification routing (ELIGIBLE+resolvable → PROJECTED; BLOCK → BLOCKED; QUARANTINE → QUARANTINED; eligible-but-unresolvable → FAILED).
- **Constraint honored:** `production.backfill.enabled` was **NOT** enabled; `production.normalized-ops.enabled` untouched; no real (dryRun=false) execution.
- **Record untouched:** PE/2026-27/00001 was not modified before, during, or after execution.

## 14. Dry-Run Result Summary

```
records inspected       = 1
eligible records        = 0
quarantined records     = 1
blocked records         = 0
failed records          = 0
actual backfilled       = 0 (dry-run only)
normalized event writes = 0
inventory writes        = 0
legacy writes           = 0
production_entry untouched = true
flags touched           = false
reconciliation          = PASS (0 expected projections, 0 projected)
```

## 15. Quantity Reconciliation

For PE/2026-27/00001:

| Field | Value |
|-------|-------|
| produced_quantity | 100.0000 |
| good_quantity | 95.0000 |
| rejected_quantity | 5.0000 |
| rework_quantity | 0.0000 |
| scrap_quantity | 0.0000 |
| **allocated_output** | **100.0000** (= 95 + 5 + 0 + 0) |
| produced_quantity == allocated_output | ✅ **TRUE** (100 == 100) |

**Important:** This equality confirms produced_quantity equals the recorded output yield. It does **NOT** authorize interpreting produced_quantity as input quantity. The record remains QUARANTINE with unresolved input.

## 16. WIP Validation

- **WIP NOT ASSERTED.** Because EffectiveInputQuantity is NULL (CATEGORY_B, unresolved), no WIP can be computed and none is asserted. WIP = max(input − Σoutputs, 0) would be null by construction for this record.
- No silent zero, no produced→process fallback, no fabricated WIP anywhere in the run.

## 17. Normalized Event Write Verification

All normalized event tables are unchanged (0 rows):

| Table | BEFORE | AFTER | Δ |
|-------|--------|-------|---|
| `prod_execution_session` | 0 | 0 | 0 |
| `prod_operation_event` | 0 | 0 | 0 |
| `prod_output_event` | 0 | 0 | 0 |

**NO NORMALIZED EVENT WRITE.**

## 18. Legacy Protection Verification

| Table | BEFORE | AFTER | Δ |
|-------|--------|-------|---|
| `production_entry` | 1 | 1 | 0 |
| `production_entry` checksum | `9b0008…be09` | `9b0008…be09` | **UNCHANGED** |

No legacy column (`process_qty`, `produced_quantity`, `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity`) was modified. **NO LEGACY WRITE.**

## 19. Inventory Isolation Verification

| Table | BEFORE | AFTER | Δ |
|-------|--------|-------|---|
| `stock_ledger` | 41 | 41 | 0 |
| `stock_balance` | 17 | 17 | 0 |

The dry-run harness and the backfill engine have zero inventory coupling and issued no inventory statements. **NO INVENTORY WRITE.**

## 20. BEFORE / AFTER Comparison

| Table | BEFORE | AFTER | Δ | Status |
|-------|--------|-------|---|--------|
| `production_entry` | 1 | 1 | 0 | ✅ unchanged |
| `prod_execution_session` | 0 | 0 | 0 | ✅ unchanged |
| `prod_operation_event` | 0 | 0 | 0 | ✅ unchanged |
| `prod_output_event` | 0 | 0 | 0 | ✅ unchanged |
| `prod_backfill_progress` | 0 | 0 | 0 | ✅ unchanged |
| `prod_backfill_entry_outcome` | 0 | 0 | 0 | ✅ unchanged |
| `stock_ledger` | 41 | 41 | 0 | ✅ unchanged |
| `stock_balance` | 17 | 17 | 0 | ✅ unchanged |
| `production_entry` checksum | 9b0008…be09 | 9b0008…be09 | same | ✅ unchanged |

All invariants met. No normalized event, inventory, legacy, progress, or outcome change.

## 21. Failure / Exception Register

| Item | Result |
|------|--------|
| Pre-flight failures | None |
| Resolver exceptions | None |
| Execution exceptions | None (read-only harness completed cleanly) |
| Safety-condition violations | None |
| Unexpected ELIGIBLE record | None |
| Unexpected writes | None detected |

**No failures.** The run completed without exception and without any write.

## 22. Regression Evidence

- **Previously verified full regression (no code changed since):** **256 tests / 0 failures / 0 errors** across 68 classes (UP-TO-DATE; no source changes during Phase D).
- **Backfill / dry-run test classes (from the last full run):**
  - `ProductionBackfillServiceIntegrationTest`: 14 tests / 0 failures
  - `ProductionBackfillDryRunIntegrationTest`: 9 tests / 0 failures
  - `ProductionBackfillFlagInertnessIntegrationTest`: 2 tests / 0 failures
  - `ProductionBackfillRollbackAtomicityTest`: 2 tests / 0 failures
- **Phase D execution verification:** the live dry-run (above) is the Phase D execution evidence; it is separate from the test suite and passed with zero writes. No new full regression was executed during Phase D because **no code changed** (correctly distinguished: "previously verified full regression" vs "Phase D execution verification").

## 23. Risk Assessment

| # | Risk | Assessment |
|---|------|------------|
| R1 | Accidental flag enable / real backfill | Not triggered; flag remained OFF; harness had no write path |
| R2 | Live DB schema mutation | Not possible; `ddl-auto: validate` + read-only connection |
| R3 | Unintended write during dry-run | Not possible; connection `setReadOnly(true)` + SELECT-only harness |
| R4 | Record modified before/during/after | Not done; PE/2026-27/00001 unchanged (checksum equal) |
| R5 | produced→process misinterpretation | Not done; WIP unasserted, effective input NULL |
| Residual risk | Future actual backfill | Requires explicit approval + permanent flag decision; out of scope |

## 24. Final Decision

**A — CONTROLLED LIVE DRY-RUN PASSED**

All mandatory conditions are TRUE:
- ✅ Resolver classification matches expectation (CATEGORY_B / AMBIGUOUS / NULL / QUARANTINE / INPUT-AUTHORITY-NULL / isResolvable=false)
- ✅ Eligible = 0
- ✅ Quarantined = 1
- ✅ Blocked = 0
- ✅ No normalized event writes
- ✅ `production_entry` unchanged
- ✅ `production_entry` checksum unchanged (`9b00088442b0aa6f3b980562ab63be09`)
- ✅ `stock_ledger` unchanged (41)
- ✅ `stock_balance` unchanged (17)
- ✅ No legacy writes
- ✅ No inventory writes

## 25. Mandatory Stop Gate

**STOP after this report.**

Do NOT:
- perform actual backfill (`dryRun=false`)
- manually resolve PE/2026-27/00001
- modify `production_entry`
- enable a permanent `production.backfill.enabled`
- post inventory
- start P3.4

Await explicit approval after DOCUMENT_37 before any further execution phase.

## 26. Change Log

- Created DOCUMENT_37 (P3.3 Phase D controlled live dry-run execution report): pre-flight checks (all pass), feature-flag verification (both OFF, `ddl-auto: validate` safe), read-only DB connection method, BEFORE baseline (production_entry=1; all prod_*=0; stock_ledger=41; stock_balance=17; checksum=9b00088442b0aa6f3b980562ab63be09), live dataset inventory (PE/2026-27/00001), live resolver execution evidence (CATEGORY_B / AMBIGUOUS / NULL / QUARANTINE / INPUT-AUTHORITY-NULL / isResolvable=false), eligibility/quarantine registers (0 eligible, 1 quarantined, 0 blocked, 0 failed), controlled read-only dry-run execution via actual resolver + dry-run classification on a `setReadOnly(true)` connection (flag NOT enabled), dry-run summary (0 eligible, 1 quarantine, 0 backfilled, 0 event/inventory/legacy writes), quantity reconciliation (allocated_output=100 == produced=100; WIP unasserted), inventory + legacy isolation proof (all counts and checksum unchanged), BEFORE/AFTER comparison (all Δ=0), exception register (none), regression evidence (256/0/0 previously verified, unchanged; Phase D execution verification passed), risk assessment, final decision **A — CONTROLLED LIVE DRY-RUN PASSED**, and explicit STOP gate. **STOP — no actual backfill, no manual resolution, no flag enable, no legacy/inventory change, no P3.4.**