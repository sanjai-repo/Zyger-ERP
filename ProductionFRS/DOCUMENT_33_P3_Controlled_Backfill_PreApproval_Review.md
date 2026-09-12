# DOCUMENT_33 — P3 Controlled Backfill Pre-Approval Review

**Phase:** P3.2 — CONTROLLED BACKFILL PRE-APPROVAL REVIEW.
**Type:** **READ-ONLY REVIEW** (analysis only, no execution).
**Authoritative inputs:** ProductionInputAuthorityResolver + resolution types (RC-1), DOCUMENT_31, DOCUMENT_32, DOCUMENT_30, DOCUMENT_29, and the **live `zyger_erp` database** (localhost:5432) inspected read-only.
**Evidence method:** (1) full read-only inspection of every `production_entry` row; (2) execution of the **actual** `ProductionInputAuthorityResolver` against the exact live row values via a read-only in-memory harness (no DB, no schema, no writes); (3) read-only SQL reconciliation inside `BEGIN READ ONLY` transactions; (4) full regression.

**READ-ONLY PROOF (all live counts + checksum identical before and after this review):**

| Table | Before | After |
|-------|--------|-------|
| `stock_ledger` | 41 | 41 |
| `stock_balance` | 17 | 17 |
| `production_entry` | 1 | 1 |
| `prod_execution_session` | 0 | 0 |
| `prod_operation_event` | 0 | 0 |
| `prod_output_event` | 0 | 0 |
| `prod_backfill_progress` | 0 | 0 |
| `prod_backfill_entry_outcome` | 0 | 0 |
| `production_entry` checksum | `186fd67981127a192ec30c824568550f` | `186fd67981127a192ec30c824568550f` |

No source file was modified for this review. No backfill. No normalized-event insert. No inventory post. No authority flip. No progress state created or modified.

**Status:** **REVIEW COMPLETE — STOP. No backfill executed. No next phase started.**

---

## 1. Executive Summary

The production `production_entry` dataset contains **exactly one record**: `PE/2026-27/00001`. Executing the real `ProductionInputAuthorityResolver` against its live values returns **CATEGORY_B / AMBIGUOUS / effective_input = null / MEDIUM / QUARANTINE / INPUT-AUTHORITY-NULL**, and `isResolvable() == false`. The record therefore carries **no certified input authority** and must **not** be auto-backfilled.

produced_quantity (100.0000) reconciles exactly to allocated output (good 95 + rejected 5) — confirming produced is **total-output evidence**, not certified input (DOCUMENT_31 §6 Case 2). No record is currently ELIGIBLE for controlled backfill; **zero** records may be backfilled today.

Inventory isolation is proven (no StockService / ProductionStockBoundary / StockBalanceRepository dependency in resolver, projection, dry-run, or progress; `stock_ledger` 41 and `stock_balance` 17 unchanged). Progress/resume infrastructure is present and testable (`prod_backfill_progress`, `prod_backfill_entry_outcome`, repositories, service). Regression is green: backend 238 / 0 / 0; frontend 34 pass; typecheck exit 0; lint 772 unchanged.

**Final recommendation: B — READY WITH REQUIRED MANUAL RESOLUTION.** Controlled backfill is architecturally green, but the single record is QUARANTINED and requires an explicit, approved manual resolution (supply and approve effective input, promote to ELIGIBLE) before it may be backfilled. The actual backfill engine (a `ProductionBackfillService`) is also not yet implemented/approved. No auto-backfill of `PE/2026-27/00001` is permitted.

---

## 2. Review Scope

- **In:** every `production_entry` record via the production `ProductionInputAuthorityResolver`; per-record classification; read-only reconciliation (input / accepted / rejected / rework / scrap / WIP / negative-WIP / duplicate-event / missing-projection / reversal-pair); inventory isolation; progress/resume readiness; full regression; `DOCUMENT_33`.
- **Out (explicitly NOT done):** backfill execution; normalized-event insertion; `production_entry` modification; legacy-data modification; inventory posting; `stock_ledger` / `stock_balance` change; `StockService` / `ProductionStockBoundary` change; authority flip; feature-flag enable/change; P4 start.

---

## 3. Read-Only Proof

- All DB inspection performed inside `BEGIN READ ONLY` transactions.
- The resolver was executed via a **pure in-memory harness** constructed from the exact live row values (`P32ReviewHarness`, compiled against the already-built classes; no database connection, no persistence, no schema update). This avoids the hazard of booting a Spring context against the live DB where `hibernate.ddl-auto=update` could alter schema.
- Regression, inventory, and progress-resume checks write only to disposable Testcontainers, never the live DB.
- Live counts + checksum are identical before and after the review (table in the header). This proves the review changed nothing.

---

## 4. Dataset Inventory

**Total records: 1.**

| id | entry_number | process_qty | produced_quantity | good_quantity | rejected_quantity | rework_quantity | scrap_quantity | status | quality_status | is_reversal | reversed_from_entry_id |
|----|--------------|-------------|-------------------|---------------|-------------------|-----------------|----------------|--------|----------------|-------------|------------------------|
| 1 | PE/2026-27/00001 | NULL | 100.0000 | 95.0000 | 5.0000 | 0.0000 | 0.0000 | REJECTED | PENDING | NULL | NULL |

Other columns for the record: `work_order_number = WO-2026-0001`, `part_code = P-1001`, `production_date = 2026-08-17`. `entry_type`, `production_type`, `job_card_number`, `subjob_number`, `operation_code`, `operation_sequence` are NULL.

No reversal rows, no BLOCKING over-allocation rows, no already-projected rows exist.

---

## 5. Per-Record Resolver Classification

Classification produced by executing the **actual** `ProductionInputAuthorityResolver.resolve(...)` on the live row values.

| Field | `PE/2026-27/00001` |
|-------|---------------------|
| Entry Number | `PE/2026-27/00001` |
| Semantic Category | **CATEGORY_B** |
| Input Authority | **AMBIGUOUS** |
| Effective Input Quantity | **null** (none auto-assigned) |
| Confidence | MEDIUM |
| Backfill Eligibility | **QUARANTINE** |
| Reason Code | **INPUT-AUTHORITY-NULL** |
| isResolvable | false |

**WIP:** not derivable — WIP = EffectiveInput − allocated_output and EffectiveInput is null (authority absent). Per DOCUMENT_31 §7, WIP is computed only after input authority is resolved; for this record WIP is therefore **NOT asserted** and is never silently forced to zero.
**Reconciliation Status:** Input NOT reconcilable (no input authority). produced (100) reconciles to allocated output (100), confirming produced = total-output. No normalized projection exists (expected: Category B records are not projected).
**Reversal Relationship:** none — `is_reversal` NULL, `reversed_from_entry_id` NULL.

> After this point no auto-assignment of input to this record is permitted. `produced_quantity` must **not** be converted into `process_qty` by any automatic process.

---

## 6. Eligible Record Register

**ELIGIBLE records: 0.**

A record is eligible only if the resolver returns BackfillEligibility = ELIGIBLE and isResolvable() = true. No record in the dataset qualifies. Consequently there is **nothing that may be backfilled today**.

---

## 7. Quarantine Register

**QUARANTINED records: 1.**

| Entry Number | Category | Authority | Reason | Effective Input |
|--------------|----------|-----------|--------|-----------------|
| PE/2026-27/00001 | CATEGORY_B | AMBIGUOUS | INPUT-AUTHORITY-NULL | null |

Quarantined records require explicit manual resolution (approver supplies + approves effective input and promotes to ELIGIBLE) before any controlled backfill.

---

## 8. Blocked Record Register

**BLOCKED records: 0.**

No record exhibits over-allocation (allocated output > input) or any other condition that escalates eligibility to BLOCK.

---

## 9. PE/2026-27/00001 Detailed Review

**Known characteristics provided in the task:**
- process_qty = NULL, produced_quantity = 100, good_quantity = 95, rejected_quantity = 5.

**Live row confirms all of the above** and additionally: rework 0, scrap 0, status = REJECTED, quality_status = PENDING.

**Resolver output (executed):** CATEGORY_B / AMBIGUOUS / effective_input null / MEDIUM / QUARANTINE / INPUT-AUTHORITY-NULL / not resolvable.

**Total-output identity:** allocated_output = good 95 + rejected 5 + rework 0 + scrap 0 = 100.0000; produced_quantity = 100.0000 ⇒ **produced = total output**. This is precisely DOCUMENT_31 §6 **Case 2** — produced is recorded as total-output evidence, **not** certified input.

**Decision:**
- **Do NOT** convert produced_quantity → process_qty. ✔ honored (resolver returns effective_input = null, eligibility QUARANTINE).
- **Do NOT** auto-backfill. ✔ honored (isResolvable false ⇒ projection/dry-run/backfill skip this record).
- **Preserve QUARANTINE** unless an explicit approved resolution exists. ✔ no such resolution exists; QUARANTINE preserved.

**Amendment (noting):** status = REJECTED with quality_status = PENDING. The resolver deliberately does not use lifecycle status for classification, but this is an additional operational signal that the record may not represent a normal completed production posting; any future manual resolution should confirm intent before supplying an input.

---

## 10. Quantity Reconciliation

Read-only reconciliation per the DOCUMENT_31 §7 deltas. Because the record is QUARANTINED and not projected, no normalized session exists to reconcile against; the reconciliation below is the legacy-side assertion plus the expected projection-side delta if it were ever resolvable.

| Dimension | Legacy value | Session/projection value | Delta | Note |
|-----------|--------------|--------------------------|-------|------|
| Input (process_qty) | NULL (authority absent) | — (no session) | **N/A** | Input authority absent; produced is NOT input (Category B). |
| Accepted (good) | 95.0000 | — | not reconciliable against an un-projected record | No projection exists by design. |
| Rejected | 5.0000 | — | — | — |
| Rework | 0.0000 | — | 0 (would project nothing) | zero → nothing to project. |
| Scrap | 0.0000 | — | 0 | zero → nothing to project. |
| produced vs allocated_output | 100.0000 | — | **0** | produced = good + rejected + rework + scrap ⇒ total-output evidence confirmed. |

**Input reconciliation is unavailable** for Category B (no effective input), which is the expected and correct outcome — not a defect. The record does not produce an incorrect or silent input value.

---

## 11. WIP Validation

- WIP = EffectiveInput − allocated_output, and EffectiveInput = null for this record.
- **WIP is NOT asserted** (cannot be computed without input authority), per DOCUMENT_31 §7.
- **No negative WIP is created** and none is silently zeroed into a valid history. The resolver never fabricates a resolvable input for an ambiguous record, so WIP never becomes a misleading negative/zero value.
- WIP validation **passes trivially** (no session, no WIP row, no negative WIP).

---

## 12. Reversal Validation

- Dataset contains **no reversal pair** (`is_reversal` NULL, `reversed_from_entry_id` NULL on the sole record).
- **Reversal-pair validation: N/A** (nothing to validate). No original/mirror mismatch exists.
- For completeness, the resolver's reversal handling is covered by unit tests (`reversalMirrorResolvable`, `reversalOfCategoryBQuarantined`) in the regression.

---

## 13. Duplicate / Missing Projection Analysis

- **Duplicate normalized-event detection:** event tables are empty (`prod_execution_session`, `prod_operation_event`, `prod_output_event` all = 0). **No duplicates possible** — nothing has been projected.
- **Missing projection detection:** the sole record is Category B / QUARANTINED and is intentionally **not** projected (resolver not resolvable ⇒ projection skips it). Its "missing projection" is **expected by design**, not an anomaly. No spurious empty/zero-input session exists.
- Either state would require re-audit after any backfill run.

---

## 14. Progress / Resume Readiness

| Component | Present | Live on DB | Tested |
|-----------|:-------:|:----------:|:------:|
| `ProdBackfillProgress` entity | ✔ | table exists (0 rows) | ✔ |
| `ProdBackfillEntryOutcome` entity | ✔ | table exists (0 rows) | ✔ |
| `ProdBackfillProgressRepository` | ✔ | — | ✔ |
| `ProdBackfillEntryOutcomeRepository` | ✔ | — | ✔ |
| `ProductionBackfillProgressService` | ✔ | — | ✔ |

- **Resume semantics testable:** `ProductionResolverProgressIntegrationTest.progressLifecycle` asserts idempotent job start, duplicate-outcome prevention, and resume-from-`last_successful_entry_id`. `manualResolutionAdditive` asserts additive resolution that does not touch legacy data.
- **No progress state was created or modified during THIS review:** `prod_backfill_progress` and `prod_backfill_entry_outcome` = 0 rows before and after; the review never invoked the progress service (only the pure resolver harness + read-only SQL).

---

## 15. Inventory Isolation Proof

1. **Static/DI scan:** `ProductionInputAuthorityResolver`, `ProductionNormalizedEventService`, `ProductionBackfillDryRunService`, and `ProductionBackfillProgressService` contain **no import** and **no autowired/field type** referencing `StockService`, `StockBalanceRepository`, or `ProductionStockBoundary`, and no stock write statement. (Source grep: 0 stock imports, 0 stock fields; dry-run's only stock string hits are javadoc stating the absence.)
2. **Runtime count-stability:** `ProjectionResolverProgressIntegrationTest.projectionInventoryIsolation` and `ProductionBackfillDryRunIntegrationTest.dryRunIsReadOnly` assert `stock_ledger`/`stock_balance` counts unchanged across projection/dry-run.
3. **No stock SQL:** no `INSERT/UPDATE` targeting `stock_*` in resolver/projection/dry-run/progress paths.
4. **Boundary single path:** only `ProductionStockBoundary.recordJobCardCompleteGood -> StockService.recordStockIn` (job-card completion) bridges production→stock; untouched.
5. **Live confirmation:** `stock_ledger` 41 and `stock_balance` 17 unchanged before, during, and after this review.

✔ No StockService ✔ No ProductionStockBoundary ✔ No StockBalanceRepository ✔ No stock_balance writes ✔ No stock_ledger writes.

---

## 16. Test Results

| Suite | Command | Result |
|-------|---------|--------|
| Backend full (JUnit 5 + Testcontainers) | `./gradlew test --rerun-tasks` | **238 tests, 0 failures, 0 errors** |
| Frontend typecheck | `npm run typecheck` | exit 0 |
| Frontend tests | `npm run test` (vitest) | **34 passed** |
| Frontend lint | `npm run lint` | **772 problems (31 errors / 741 warnings)** — identical to baseline (FE untouched) |
| Real-resolver harness (this review) | `P32ReviewHarness` | CATEGORY_B / QUARANTINE / not resolvable (as expected) |

Coverage specifically exercised in the suite: all 4 semantic categories + unknown; over-allocation → BLOCK; no-silent-zero; live-record class `PE/2026-27/00001` QUARANTINED + never backfilled; reversal mirror resolvable; reversal-of-Category-B quarantined; projection skips ambiguous; progress idempotency/resume/duplicates/manual-resolution; inventory isolation; dry-run read-only.

---

## 17. Risk Register

| # | Risk | Likelihood | Impact | Mitigation / Status |
|---|------|-----------|--------|---------------------|
| R1 | Auto-converting produced→process on `PE/2026-27/00001` would fabricate un-certified input. | n/a (prevented) | High (wrong history) | Resolver returns effective_input null + QUARANTINE; no auto-conversion permitted. |
| R2 | Backfilling a QUARANTINED record without approved resolution. | n/a (prevented) | High | Record is not resolvable; nothing eligible; not backfilled. |
| R3 | Record status is REJECTED / quality PENDING — semantic intent unclear. | Medium | Medium | Not projected; requires explicit manual-review sign-off before any future input assignment. |
| R4 | Actual backfill engine (`ProductionBackfillService`) not implemented. | High (blocking for A) | High (cannot execute) | Controlled backfill is infra-only today; execution requires the engine + approval. |
| R5 | Inadvertent live-DB schema drift while validating against live DB. | Low | High | Review avoided booting a Spring context against live DB (`ddl-auto=update` hazard); used pure in-memory resolver harness + read-only SQL. |
| R6 | Backfill writes to legacy/stock. | Low (boundary enforced) | High | Inventory isolation proven; backfill must write only `prod_*` event tables; boundary single-path untouched. |

---

## 18. Controlled Backfill Execution Preconditions

To reach a state where controlled backfill can execute (i.e., candidate recommendation A), ALL of the following must be true:

1. **Manual resolution approved** for `PE/2026-27/00001`: an authorized reviewer supplies an explicit effective input, records authority + note, and promotes the entry to ELIGIBLE — this is an explicit, additive resolution, **never** an automatic produced→process conversion.
2. **At least one record classifies ELIGIBLE** (isResolvable true) after that resolution — the resolver must return ELIGIBLE before the engine touches it.
3. **Actual backfill engine implemented + approved**: a `ProductionBackfillService` (or equivalent) that writes only `prod_*` normalized tables, uses the resolver, respects progress/resume, and never touches stock or legacy `production_entry` — required; not present today.
4. **Feature-flag gating resolved**: decide whether backfill writes are gated by `production.normalized-ops.enabled` (currently OFF). The projection service is flag-gated; the backfill engine's gating must be explicitly specified and approved.
5. **Inventory isolation re-verified** at execution time — `stock_ledger`/`stock_balance` counts asserted stable around each backfill run.
6. **Progress/outcome priming** via `ProductionBackfillProgressService` (idempotent start/claim/resume) in place, and **no prior progress rows** contradicting the run.

---

## 19. Rollback Preconditions

1. `prod_backfill_progress` must support terminal `ROLLED_BACK` status and `prod_backfill_entry_outcome` must record each entry outcome (`PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED`) to permit reversing only the backfill-run rows.
2. Rollback scope must be strictly limited to backfill-written `prod_*` event rows; **never** legacy `production_entry` and **never** `stock_ledger`/`stock_balance`.
3. No inventory rollback is required (backfill writes no stock). If inventory were ever involved, the single production→stock boundary is `ProductionStockBoundary -> StockService` (job-card completion) and such a run would be out of backfill scope.
4. Historical POSTED projections preserved (additive mirrors, P3-06) — a rerun can add compensating rows rather than mutate history.
5. The actual engine's rollback capability is part of the unimplemented `ProductionBackfillService`; it must be built + tested before execution.

---

## 20. Final Recommendation

**B — READY WITH REQUIRED MANUAL RESOLUTION**

Rationale:
- **Not A (SAFE TO EXECUTE):** rejected — no record in the dataset is currently ELIGIBLE (the only record is QUARANTINED), and the actual backfill engine is not implemented/approved. Executing today would act on nothing or require an unauthorized resolution.
- **Selected B:** the architecture is sound, well-bounded, inventory-isolated, and regressions are green. The sole blocker to a genuinely safe controlled backfill is the **required manual resolution** of `PE/2026-27/00001` (explicit + approved effective-input assignment promoting it to ELIGIBLE) together with implementation and approval of the actual backfill engine and its feature-flag gating (§18). These are resolvable, approved-before-execute preconditions — nothing in the current state is unsafe.
- **Not C (UNSAFE):** rejected — there is no unsafe data condition, no inventory risk (isolation proven), and no auto-backfill is being taken. The state is "not yet runnable / not yet resolved," which is a readiness gap, not a safety hazard.

**Mandatory mitigations before any future controlled-backfill execution:**
1. Obtain and approve the explicit manual resolution for `PE/2026-27/00001`; keep it QUARANTINED until then.
2. Never auto-convert `produced_quantity` into `process_qty`.
3. Build, review, and approve the actual backfill engine + gating; re-run the full suite; keep stock/legacy untouched.

---

## STOP GATE

**STOP.** This was a read-only pre-approval review. **No backfill was executed. No normalized event was inserted. No `production_entry` or legacy data was modified. No inventory was posted. No authority flip occurred. No feature-flag change was made. P4 has not started.** Await explicit approval (per §18) before proceeding to any controlled-backfill execution or the next phase.

---

## Change Log

- Created DOCUMENT_33 (read-only P3.2 pre-approval review): full dataset inventory (1 record), executed the real resolver against the live row, per-record classification + registers, PE/2026-27/00001 detailed review, read-only reconciliation/WIP/reversal/duplicate/missing analysis, inventory isolation proof, progress/resume readiness, regression results, risk register, execution + rollback preconditions, final recommendation **B — READY WITH REQUIRED MANUAL RESOLUTION**. STOP.
- No files modified; live DB byte-identical before and after (checksum `186fd6...550f`).