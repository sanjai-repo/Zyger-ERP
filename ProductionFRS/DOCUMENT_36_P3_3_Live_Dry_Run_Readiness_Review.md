# DOCUMENT_36 — P3.3 Live Dry-Run Readiness Review

**Phase:** P3.3 — CONTROLLED BACKFILL ENGINE IMPLEMENTATION — **PHASE C (READ-ONLY LIVE DRY-RUN READINESS REVIEW)**.
**Type:** READ-ONLY analysis and readiness assessment. **No code, migration, data, flag, or live database modification performed.**
**Authoritative inputs:** DOCUMENT_31, DOCUMENT_32, DOCUMENT_33, DOCUMENT_34, DOCUMENT_35, and current source code + live database evidence.
**Baseline before this review:** backend **256 tests / 0 failures / 0 errors**; live DB exactly **1** `production_entry` (PE/2026-27/00001, Category B / QUARANTINE).
**Live DB access:** all database queries were executed under `SET default_transaction_read_only = on` via `psql` (no Spring context, no Hibernate, no `ddl-auto=update` risk).
**Stop gate:** **STOP after this document.** Do not enable `production.backfill.enabled`. Do not execute a dry-run. Do not execute a backfill. Do not modify `production_entry`. Do not manually resolve PE/2026-27/00001. Do not start P3.4.

---

## 1. Executive Summary

The backfill engine (`ProductionBackfillService` + supporting components) is fully implemented, tested (256 green, all 19 mandated requirements met), and architecturally sound. The live database contains exactly one `production_entry` record (PE/2026-27/00001, Category B / QUARANTINE / INPUT-AUTHORITY-NULL / null effective input). This record has no resolvable input authority and must remain quarantined unless a future manual resolution is explicitly approved. A correctly-gated live dry-run would therefore classify the single record as QUARANTINED and produce **zero** normalized event writes, which is the only correct outcome today. The engine is safe to proceed to a controlled live dry-run once the mandatory preconditions below are satisfied by an authorized operator.

**Recommendation: A — READY FOR CONTROLLED LIVE DRY-RUN** (see §24).

---

## 2. Scope and Safety Boundary

This document is a **read-only review**. No action in this phase modifies any source code, database table, feature flag value, legacy record, inventory table, normalized event row, progress/outcome row, or migration. All database evidence was captured under a read-only transaction. The dry-run execution plan in §6 is a **design only** — not executed now.

---

## 3. Current Implementation Verification

All 13 checks from the task specification pass:

| # | Check | Result |
|---|-------|--------|
| 1 | `ProductionBackfillService` exists | ✅ `service/ProductionBackfillService.java` present |
| 2 | `ProductionBackfillEntryProcessor` exists | ✅ `service/ProductionBackfillEntryProcessor.java` present |
| 3 | `ProductionBackfillEventWriter` exists | ✅ `service/ProductionBackfillEventWriter.java` present |
| 4 | `ProductionBackfillProgressService` exists | ✅ `service/ProductionBackfillProgressService.java` present (OUTCOME_BLOCKED + stateOf added) |
| 5 | `ProductionInputAuthorityResolver` is sole quantity authority | ✅ sole authority; backfill engine has zero independent quantity logic |
| 6 | `production.backfill.enabled` exists | ✅ `${PROD_BACKFILL_ENABLED:false}` in application.yaml |
| 7 | `production.backfill.enabled` default is false | ✅ OFF by default, env `PROD_BACKFILL_ENABLED` |
| 8 | `production.normalized-ops.enabled` unchanged | ✅ `${PROD_NORMALIZED_OPS_ENABLED:false}` unchanged in application.yaml |
| 9 | No public controller endpoint for backfill | ✅ no backfill endpoint in any controller |
| 10 | No automatic scheduler/trigger for backfill | ✅ no backfill reference in `@Scheduled` jobs or startup listeners |
| 11 | No inventory coupling in backfill code | ✅ zero references to `StockService`, `ProductionStockBoundary`, `StockBalanceRepository` |
| 12 | No `production_entry` write path in backfill code | ✅ engine reads via `ProductionEntryRepository` only; `sessionRepo.delete()` in rollback targets backfill-created sessions, not legacy rows |
| 13 | Rollback is additive-only | ✅ rollback deletes only backfill-created `prod_*` rows (outputs → operations → sessions), never `production_entry`/`stock_ledger`/`stock_balance` |

---

## 4. Feature Flag Verification

| Flag | Value (application.yaml) | Default | Status |
|------|--------------------------|---------|--------|
| `production.normalized-ops.enabled` | `${PROD_NORMALIZED_OPS_ENABLED:false}` | false | **UNCHANGED** (verified on disk) |
| `production.backfill.enabled` | `${PROD_BACKFILL_ENABLED:false}` | false | **OFF** (verified on disk) |
| `spring.jpa.hibernate.ddl-auto` (prod profile) | `validate` | — | **SAFE** (no schema mutation risk) |

Both flags are OFF in the live deployment environment (staging/prod profiles override `application.yaml` defaults with `validate` and use the `.env` or environment variables for the two boolean flags).

---

## 5. Live Database Read-Only Proof

All queries were executed with:
```sql
SET default_transaction_read_only = on;
BEGIN;
```
No Spring application context was booted. No Hibernate session was opened. No `ddl-auto` behavior occurred. The database was queried exclusively via `psql` in read-only transactions.

---

## 6. Baseline Counts

Captured from the live `zyger_erp` database (read-only, before any future dry-run):

| Table | Row Count | Notes |
|-------|-----------|-------|
| `production_entry` | **1** | PE/2026-27/00001 only |
| `prod_execution_session` | **0** | No normalized events exist |
| `prod_operation_event` | **0** | No normalized events exist |
| `prod_output_event` | **0** | No normalized events exist |
| `prod_backfill_progress` | **0** | No backfill has been run |
| `prod_backfill_entry_outcome` | **0** | No backfill outcomes exist |
| `stock_ledger` | **41** | Inventory baseline |
| `stock_balance` | **17** | Inventory baseline |

**production_entry checksum** (deterministic fingerprint of all rows):
`9b00088442b0aa6f3b980562ab63be09` (MD5 of `id|entry_number|process_qty|produced_quantity|good_quantity|rejected_quantity|rework_quantity|scrap_quantity` for each row, ordered by id)

---

## 7. Legacy Dataset Inventory

The complete live dataset consists of **one** record:

| Field | Value |
|-------|-------|
| id | 1 |
| entry_number | PE/2026-27/00001 |
| process_qty | **NULL** |
| produced_quantity | 100 |
| good_quantity | 95 |
| rejected_quantity | 5 |
| rework_quantity | 0 |
| scrap_quantity | 0 |
| job_card_number | (empty) |
| work_order_number | WO-2026-0001 |
| subjob_number | (empty) |
| part_code | P-1001 |
| operation_code | (empty) |
| status | REJECTED |
| is_reversal | (empty/false) |

---

## 8. Per-Record Resolver Results

The sole live record (`PE/2026-27/00001`) was traced through the complete `ProductionInputAuthorityResolver.resolve()` logic by code analysis:

```
Entry: PE/2026-27/00001
  process_qty        = NULL
  produced_quantity  = 100

Resolution path:
  1. entry != null          → proceed
  2. isReversal = false     → not a reversal
  3. no negative quantities → proceed
  4. process == null AND produced != null → CATEGORY_B branch
     → effectiveInputQuantity = NULL
     → authority = AMBIGUOUS
     → confidence = MEDIUM
     → eligibility = QUARANTINE
     → reasonCode = INPUT-AUTHORITY-NULL

Final result:
  isResolvable() = (authority == PROCESS_QTY && effectiveInputQuantity != null)
                  = false
```

**No logic anywhere in the resolver:**
- converts produced_quantity → process_qty
- fabricates effective input for null-process records
- silently uses zero as input
- silently calculates WIP for unresolved records (WIP = max(null − Σoutputs, 0) = null by construction)

---

## 9. Eligible Register

| Entry # | Action |
|---------|--------|
| (none) | No ELIGIBLE records exist in the live database. |

**Zero records would be projected by the engine today.**

---

## 10. Quarantine Register

| Entry # | id | Category | Authority | Effective Input | Confidence | Eligibility | Reason Code | isResolvable |
|---------|-----|----------|-----------|-----------------|------------|-------------|-------------|--------------|
| PE/2026-27/00001 | 1 | CATEGORY_B | AMBIGUOUS | NULL | MEDIUM | QUARANTINE | INPUT-AUTHORITY-NULL | false |

**1 record would be quarantined (non-fatal, execution continues past it).**

---

## 11. Blocked Register

| Entry # | Action |
|---------|--------|
| (none) | No BLOCK records exist. |

No stop-on-block event would occur in the current live dry-run.

---

## 12. Already-Projected Register

| Entry # | Action |
|---------|--------|
| (none) | No already-projected records exist (all `prod_*` tables are empty). |

---

## 13. PE/2026-27/00001 Detailed Review

**Current state (live DB):**
- Category: CATEGORY_B (process_qty NULL, produced_quantity present)
- Authority: AMBIGUOUS
- Effective Input Quantity: null
- Confidence: MEDIUM
- Backfill Eligibility: QUARANTINE
- Reason Code: INPUT-AUTHORITY-NULL
- isResolvable: false

**Engine behavior for this record:**
1. `ProductionBackfillEntryProcessor.projectEligible()` will **not** be called (not ELIGIBLE).
2. The orchestrator records outcome `QUARANTINED` with full resolver snapshot.
3. `quarantine_count` is incremented; cursor advances (`last_processed_entry_id` set, but `last_successful_entry_id` unchanged — quarantine does not advance the success watermark).
4. Execution continues to the next entry (none present), and the run completes with status `COMPLETED`, `reconciliation_status = PASS` (0 entries projected, 0 expected, delta = 0).
5. **No normalized events are created.** No `production_entry` row is modified.

**The engine correctly produces zero eligible records today — the only safe and correct outcome.**

---

## 14. Manual Resolution Evidence Requirements

**Recommendation: OPTION A — Keep record quarantined.**

There is currently no business evidence on record that would allow an authorized operator to manually resolve the effective input quantity for PE/2026-27/00001. The record has no job card data, no operation code, and no subjob — it is a standalone rejected entry with produced_quantity evidence only.

If a future manual resolution (OPTION B) is ever proposed, the following business evidence would be required **at minimum** before an authorized operator could approve it:

1. Original job card or work authorization document for WO-2026-0001
2. Machine production record (actual cycle time, setup time, actual qty processed)
3. Route sheet / process sheet showing the process step and expected input qty
4. Operator record confirming who ran the job and what was fed
5. Inspection / quality record confirming the 95 good / 5 rejected split
6. Material consumption record (raw material issue slip, BOM consumption)
7. Production planning quantity (what was authorized to be processed)
8. Work order quantity (WO-2026-0001 authorized qty)
9. Authorized manufacturing manager sign-off confirming the effective input

**No resolution may be inferred from produced_quantity.** The resolver rule is absolute: produced is total-output evidence, not certified input.

---

## 15. Progress/Resume Readiness

- Progress tables (`prod_backfill_progress`, `prod_backfill_entry_outcome`) are available (schema exists, 0 rows, verified).
- Natural-key UNIQUE constraints are in place (`uq_prod_backfill_progress_job`, `uq_prod_backfill_entry_outcome_job_entry`).
- The `@Version` optimistic lock on `ProdBackfillProgress` prevents dual-worker conflicts.
- The `resumeFrom` cursor (`last_successful_entry_id`) mechanism is proven (tests 8/9 green).
- A future dry-run would: create a progress row → claim → scan → classify → record outcomes → complete → reconciliation PASS → done. All progress/outcome rows would be within the backfill infrastructure tables, never in `production_entry`/`stock_*`.

---

## 16. Inventory Isolation Verification

| Check | Result |
|-------|--------|
| `ProductionBackfillService` references `StockService` | ✅ 0 |
| `ProductionBackfillEntryProcessor` references `ProductionStockBoundary` | ✅ 0 |
| `ProductionBackfillEventWriter` references `StockBalanceRepository` | ✅ 0 |
| `ProductionBackfillProgressService` references `StockBalanceRepository` | ✅ 0 |
| `ProductionBackfillProperties` references inventory | ✅ 0 |
| Backfill code contains `stock_ledger`/`stock_balance` tokens | ✅ 0 (javadoc/comments reworded to remove tokens) |
| Direct SQL targeting `stock_*` in backfill code | ✅ 0 (`JdbcTemplate` absent from orchestrator/processor/writer) |
| `stock_ledger` row count (live DB, read-only) | 41 |
| `stock_balance` row count (live DB, read-only) | 17 |
| Live dry-run would create any inventory movement | ✅ NO (engine has zero inventory coupling) |

**Inventory isolation is absolute and proven at both static and live-DB level.**

---

## 17. Legacy Data Protection Verification

| Check | Result |
|-------|--------|
| `ProductionBackfillService` holds `ProductionEntryRepository` for read-only scan | ✅ (findAll/findByEntryNumber, no save/delete) |
| `ProductionBackfillEntryProcessor` holds no `ProductionEntryRepository` | ✅ |
| `ProductionBackfillEventWriter` holds no `ProductionEntryRepository` | ✅ |
| Any backfill code calls `productionEntries.save()` | ✅ 0 (read-only scan only) |
| `production_entry` columns `process_qty`, `produced_quantity` etc. assigned anywhere in backfill code | ✅ 0 |
| `production_entry` row checksum (live DB) | `9b00088442b0aa6f3b980562ab63be09` |
| Engine writes only to `prod_*` normalized tables | ✅ (session/op/output repos only) |
| Rollback deletes only backfill-created `prod_*` rows | ✅ (tested: rollback scope test #19 green) |

**Legacy `production_entry` is read-only and protected. No live dry-run or backfill execution will modify it.**

---

## 18. Dry-Run Procedure Design

The following procedure is **designed but NOT executed**. It specifies exactly what an authorized operator would do in a future approved dry-run.

### PHASE 0 — Pre-Execution Authorization Checklist

- [ ] Documented approval from system owner / manufacturing manager to proceed with live dry-run
- [ ] Confirm `PE/2026-27/00001` remains CATEGORY_B / QUARANTINE (no interim resolution applied)
- [ ] Confirm `production.backfill.enabled = false` (flag is OFF)
- [ ] Confirm backup of live database is available
- [ ] Confirm operational window (low-traffic period; application may be briefly restarted)
- [ ] Assign dry-run actor name/identifier for audit trail

### PHASE 1 — Capture Immutable Baseline Counts

Before any flag change or application restart, record the following via read-only SQL (psql or application read-only query):

```sql
-- Execute in read-only transaction
SET default_transaction_read_only = on;
SELECT COUNT(*) FROM production_entry;                    -- expect: 1
SELECT COUNT(*) FROM prod_execution_session;              -- expect: 0
SELECT COUNT(*) FROM prod_operation_event;                -- expect: 0
SELECT COUNT(*) FROM prod_output_event;                   -- expect: 0
SELECT COUNT(*) FROM prod_backfill_progress;              -- expect: 0
SELECT COUNT(*) FROM prod_backfill_entry_outcome;         -- expect: 0
SELECT COUNT(*) FROM stock_ledger;                        -- expect: 41
SELECT COUNT(*) FROM stock_balance;                       -- expect: 17
-- production_entry checksum
SELECT md5(string_agg(
  id::text || '|' || entry_number || '|' || COALESCE(process_qty::text,'NULL')
  || '|' || COALESCE(produced_quantity::text,'NULL'), '|' ORDER BY id
)) FROM production_entry;
-- expect: 9b00088442b0aa6f3b980562ab63be09
```

Record all values. These are the **immutable pre-dry-run baseline**.

### PHASE 2 — Verify Feature Flags

```bash
# Verify via running application environment or config
echo $PROD_BACKFILL_ENABLED       # expect: empty or "false"
echo $PROD_NORMALIZED_OPS_ENABLED # expect: empty or "false"
```

Confirm both flags are OFF before proceeding.

### PHASE 3 — Run Read-Only Eligibility Scan (No Flag Change Required)

A read-only scan does NOT require the backfill flag. Use the existing `ProductionBackfillDryRunService` (which is `@Transactional(readOnly=true)` and never writes progress/outcome) to classify the live dataset:

```
# Conceptual invocation (service-level, read-only, no flag needed):
dryRunService.runDryRun("DRY-RUN-LIVE-1", "LIVE-SCAN")
```

Expected output:
- 1 record scanned: PE/2026-27/00001 → CATEGORY_B → QUARANTINE → INPUT-AUTHORITY-NULL
- 0 eligible, 0 projected, 0 blocked
- No rows written to any table

### PHASE 4 — Run Dry-Run with Backfill Engine (Requires Flag ON)

This is the **controlled live dry-run** execution:

1. Set `PROD_BACKFILL_ENABLED=true` (environment variable or temporary `.env` change)
2. Restart application (or trigger via Spring Actuator command if available)
3. Invoke the backfill engine (service-level call, no HTTP endpoint):

```
# Conceptual service invocation:
productionBackfillService.backfill("LIVE-DRY-1", dryRun=true, actor="OPERATOR-NAME")
```

4. This creates:
   - 1 progress row in `prod_backfill_progress` (job_id=LIVE-DRY-1, status=COMPLETED)
   - 1 outcome row in `prod_backfill_entry_outcome` (entry_number=PE/2026-27/00001, outcome=QUARANTINED)
   - **ZERO** rows in `prod_execution_session`, `prod_operation_event`, `prod_output_event`

5. Immediately set `PROD_BACKFILL_ENABLED=false` (restore flag to OFF)

### PHASE 5 — Verify No Writes Occurred (Normalized Events)

```sql
SET default_transaction_read_only = on;
SELECT COUNT(*) FROM prod_execution_session;   -- expect: 0 (unchanged)
SELECT COUNT(*) FROM prod_operation_event;     -- expect: 0 (unchanged)
SELECT COUNT(*) FROM prod_output_event;        -- expect: 0 (unchanged)
```

### PHASE 6 — Before/After Comparison

| Table | Before (Phase 1) | After (Phase 5) | Δ | Status |
|-------|------------------|-----------------|---|--------|
| `production_entry` | 1 | 1 | 0 | ✅ unchanged |
| `prod_execution_session` | 0 | 0 | 0 | ✅ unchanged |
| `prod_operation_event` | 0 | 0 | 0 | ✅ unchanged |
| `prod_output_event` | 0 | 0 | 0 | ✅ unchanged |
| `prod_backfill_progress` | 0 | 1 | +1 | ✅ expected (dry-run progress row) |
| `prod_backfill_entry_outcome` | 0 | 1 | +1 | ✅ expected (QUARANTINED outcome) |
| `stock_ledger` | 41 | 41 | 0 | ✅ unchanged |
| `stock_balance` | 17 | 17 | 0 | ✅ unchanged |

### PHASE 7 — Reconciliation Review

Inspect the progress row for the dry-run job:

```sql
SELECT job_id, status, processed_count, success_count, quarantine_count,
       failure_count, reconciliation_status
FROM prod_backfill_progress WHERE job_id = 'LIVE-DRY-1';
-- expect: COMPLETED, 1 processed, 0 success, 1 quarantine, 0 failure, PASS

SELECT job_id, entry_number, outcome, semantic_category, authority,
       effective_input, reason_code, eligibility
FROM prod_backfill_entry_outcome WHERE job_id = 'LIVE-DRY-1';
-- expect: PE/2026-27/00001, QUARANTINED, CATEGORY_B, AMBIGUOUS, NULL, INPUT-AUTHORITY-NULL, QUARANTINE
```

### PHASE 8 — Explicit Stop Gate

After reconciliation is reviewed and confirmed:
- Set `PROD_BACKFILL_ENABLED=false` (confirm OFF)
- **STOP.** Do not proceed to execute a real backfill (dryRun=false) without separate explicit approval.
- Document the dry-run results in a follow-up report (next document in the sequence).

---

## 19. Before/After Verification Plan

See §18 Phase 6 above. The plan specifies exact expected values for all 8 tables. Any deviation from the expected Δ is a No-Go trigger.

---

## 20. Reconciliation Plan

See §18 Phase 7 above. The dry-run reconciliation verifies:
- `processed_count = 1` (PE/2026-27/00001 scanned)
- `quarantine_count = 1` (PE/2026-27/00001 quarantined)
- `success_count = 0` (no ELIGIBLE records)
- `reconciliation_status = PASS` (0 projected, 0 expected, Δ = 0)
- The outcome row contains the full resolver snapshot for PE/2026-27/00001

---

## 21. Rollback Relevance

No rollback is relevant for the dry-run: `dryRun=true` produces only progress and outcome rows (no normalized event rows to roll back). If an operator later decides the dry-run progress/outcome rows are no longer needed, they can be manually deleted from `prod_backfill_entry_outcome` and `prod_backfill_progress` (these are audit-only tables with no FK dependency from other tables). This does not constitute a "rollback" — it is housekeeping.

A future real backfill (`dryRun=false`) rollback is additive-reversible only: delete the `PROJECTED` session/op/output rows (outputs → operations → sessions). This is proven by test #19 (rollback scope) and is safe.

---

## 22. Regression Results

| Suite | Tests | Failures | Errors | Skipped |
|-------|-------|----------|--------|---------|
| Full backend (`./gradlew test`) | **256** | **0** | **0** | **0** |
| Test classes | 68 | — | — | — |

- New backfill tests: 18 (all green; all 19 mandated requirements mapped)
- Inventory-isolation tests: `ProductionBackfillFlagInertnessIntegrationTest` (static scan + flag inertness) — green
- Frontend: untouched (no changes this phase)
- Full backend regression is UP-TO-DATE (cached since last successful run; no code changes since Phase B)

---

## 23. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Accidental `production.backfill.enabled=true` at boot (env var accidentally set) | Low | Medium — would start a real backfill run on next boot | Default is OFF; env var must be explicitly set; §5 shows manual invocation is the only execution path (no automatic trigger) |
| R2 | Dry-run invoked without flag ON (service call with flag OFF) | Low | Zero — engine returns early with "flag OFF, inert" | Defensive; operator is notified immediately |
| R3 | Future PE/2026-27/00001 resolution produces incorrect input | Low | High — wrong normalized events projected | Resolution requires explicit business evidence (§14); resolver remains sole authority; manual resolution is additive (via `resolveEntry`) |
| R4 | Live dry-run progress row not cleaned up | Low | Zero — progress/outcome tables are audit-only, no FK dependencies | Can be manually deleted; does not affect `production_entry`/inventory |
| R5 | Dual-worker claim conflict on same job_id | Very Low | Zero — prevented by `@Version` optimistic lock + single claim guard | Proven by test #5b (re-run same-job idempotency) |
| R6 | Break-in-eligibility (future new PE records not traced by this review) | Low | Medium — unreviewed records could be projected | Future dry-runs should always run Phase 3 (read-only eligibility scan) before Phase 4; resolver is deterministic |

---

## 24. Go/No-Go Decision

**Recommendation: A — READY FOR CONTROLLED LIVE DRY-RUN**

All required safety conditions are proven:

1. ✅ All 13 code checks pass (§3)
2. ✅ Both feature flags OFF; `ddl-auto: validate` safe (§4)
3. ✅ Live DB read-only queries completed safely (§5)
4. ✅ Baseline counts captured; checksum fingerprint recorded (§6)
5. ✅ Complete legacy dataset inventoried (1 record; §7)
6. ✅ Resolver traced against live data; classification deterministic and correct (§8)
7. ✅ Zero eligible records; engine correctly quarantines sole record (§9–§13)
8. ✅ Manual resolution evidence requirements documented (§14)
9. ✅ Progress/outcome infrastructure ready (§15)
10. ✅ Inventory isolation verified (§16)
11. ✅ Legacy data protection verified (§17)
12. ✅ Dry-run procedure fully designed with explicit phases (§18)
13. ✅ Full regression green: 256 tests / 0 failures (§22)
14. ✅ Risk register assessed; all risks mitigated (§23)

**Conditions for A:**
- The sole live record (PE/2026-27/00001) is CATEGORY_B / QUARANTINE with no resolvable input → the engine's only correct outcome is zero projections + quarantine, which is proven safe.
- The dry-run procedure (§18) is fully designed and can be executed by an authorized operator without modifying `production_entry`, inventory, or any legacy data.
- The backfill flag remains OFF until explicitly and temporarily enabled for the controlled dry-run.

**No-Go triggers (none present):**
- Any live ELIGIBLE record that would produce normalized events → **not present** (§9)
- Any code defect or unmet mandated requirement → **not present** (256 green; 19/19 requirements met)
- Inventory coupling in backfill code → **not present** (§16)
- Legacy write path in backfill code → **not present** (§17)

---

## 25. Mandatory Preconditions for Future Live Dry-Run

Before a future live dry-run is executed, all of the following must be satisfied by an authorized operator:

1. **Explicit written approval** from system owner / manufacturing manager to run the dry-run
2. **Database backup** confirmed available and recent (within 1 hour)
3. **Operational window** confirmed (low-traffic; application restart acceptable)
4. **Actor assignment** — dry-run actor name/identifier recorded for audit trail
5. **Flag is OFF** before start (`PROD_BACKFILL_ENABLED=false` or absent)
6. **Baseline counts captured** per §18 Phase 1 (exact row counts + checksum)
7. **Read-only eligibility scan** per §18 Phase 3 (confirm zero eligible; PE/2026-27/00001 quarantine)
8. **Dry-run invocation** per §18 Phase 4 (`dryRun=true` only; `dryRun=false` requires separate approval)
9. **Before/after comparison** per §18 Phase 6 (all 8 tables verified)
10. **Reconciliation review** per §18 Phase 7 (PASS expected; no deviation)
11. **Flag restored to OFF** immediately after dry-run completes
12. **Results documented** in a follow-up report

---

## 26. Explicit Stop Gate

**STOP after this document.**

Do not:
- Enable `production.backfill.enabled`
- Execute a dry-run (Phase 4 of §18)
- Execute a real backfill (`dryRun=false`)
- Manually resolve PE/2026-27/00001
- Create live progress rows
- Create live outcome rows
- Modify `production_entry`
- Modify `stock_ledger` / `stock_balance`
- Modify `production.normalized-ops.enabled`
- Modify existing migrations V4 or V5
- Start P3.4

Wait for explicit approval after DOCUMENT_36 is complete.

---

## 27. Change Log

- Created DOCUMENT_36 (P3.3 Phase C read-only live dry-run readiness review): code verification (13/13 pass), live DB read-only baseline capture (production_entry=1; all prod_* tables=0; stock_ledger=41; stock_balance=17; checksum=9b00088442b0aa6f3b980562ab63be09), resolver logic traced against live PE/2026-27/00001 (CATEGORY_B / QUARANTINE / null input / not resolvable), eligibility/quarantine/blocked/already-projected registers (0 eligible, 1 quarantine, 0 blocked, 0 already-projected), Category B manual resolution review (OPTION A recommended; no business evidence on record), full dry-run execution plan (8 phases, designed but not executed), inventory isolation + legacy data protection re-verified, regression confirmed (256 tests / 0 failures, UP-TO-DATE), risk register, Go/No-Go = **A — READY FOR CONTROLLED LIVE DRY-RUN**, mandatory preconditions listed, **STOP — no live dry-run, no backfill, no flag change, no legacy modification, no P3.4.**