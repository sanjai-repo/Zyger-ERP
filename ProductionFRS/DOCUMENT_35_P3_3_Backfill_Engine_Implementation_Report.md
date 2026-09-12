# DOCUMENT_35 — P3.3 Backfill Engine Implementation Report (Phase B — Source + Tests Only)

**Phase:** P3.3 — CONTROLLED BACKFILL ENGINE IMPLEMENTATION — **PHASE B (SOURCE CODE + AUTOMATED TESTS ONLY)**.
**Type:** Implementation report for the approved `ProductionBackfillService` architecture (DOCUMENT_34). **No live backfill was executed; no live progress/outcome/normalized rows were created.**
**Authoritative inputs:** DOCUMENT_34 (approved plan), and existing implementation per DOCUMENT_34 §20 (`ProductionInputAuthorityResolver`, `ProductionNormalizedEventService`, `ProductionBackfillProgressService`, `ProdBackfillProgress`, `ProdBackfillEntryOutcome`, normalized event entities + repositories + natural keys).
**Approval scope:** This phase is **only** source-code implementation + automated testing. **This is NOT approval to execute a live backfill.**
**Baseline before Phase B:** backend **238 tests / 0 failures / 0 errors**; live DB has exactly **1** `production_entry` (`PE/2026-27/00001`, CATEGORY_B / QUARANTINE / INPUT-AUTHORITY-NULL).

**Stop gate (after this report):** **STOP.** Do not execute a dry-run against live data. Do not execute a backfill. Do not modify `production_entry`. Do not enable `production.backfill.enabled`. Do not start P3.4. Await explicit approval.

---

## 1. Scope Implemented

Implemented the controlled backfill **engine** exactly as DOCUMENT_34 mandates: a dry-first, gated, additive executor that scans `production_entry` read-only, resolves each record **only** through `ProductionInputAuthorityResolver`, classifies ELIGIBLE/QUARANTINE/BLOCK, projects ELIGIBLE records into the normalized `prod_*` tables (one entry = one atomic `REQUIRES_NEW` transaction), records per-entry outcomes and job progress via `ProductionBackfillProgressService`, reconciles post-run, and supports rollback scoped to backfill-created `prod_*` rows. The engine is feature-flag-gated (`production.backfill.enabled`, default **OFF**), exposes **no** public endpoint, never runs automatically, and keeps zero coupling to inventory or legacy writes. Correctly, **today it processes zero eligible records** — the sole legacy record quarantines.

Not in scope (explicitly per DOCUMENT_34): automatic execution, live-DB execution, a public HTTP endpoint, any change to `production.normalized-ops.enabled`, any `production_entry`/stock write, P3.4.

## 2. Files Created

| File | Purpose |
|------|---------|
| `src/main/java/.../config/ProductionBackfillProperties.java` | Dedicated backfill gate `production.backfill.enabled`, default **false**, env `PROD_BACKFILL_ENABLED`. |
| `src/main/java/.../service/ProductionBackfillService.java` | Orchestrator: flag gate → dry/real run, scan/resolve/classify/project/record/reconcile, rollback (deletes PROJECTED sessions only). Terminal-job idempotent no-op. **No stock/legacy references.** |
| `src/main/java/.../service/ProductionBackfillEntryProcessor.java` | Per-entry worker, `@Transactional(REQUIRES_NEW)` `projectEligible`; asserts `isResolvable()`, maps EIGIBLE→PROJECTED / duplicate→ALREADY_PROJECTED + outcome + heartbeat; refuses to fabricate input. |
| `src/main/java/.../service/ProductionBackfillEventWriter.java` | Natural-key additive projection writer for session/op/outputs; absorbs `DataIntegrityViolationException` → re-find (DB constraint as final backstop, not primary mechanism). |
| `src/main/java/.../dto/backfill/BackfillEntryDecision.java` | Per-entry decision/carrying resolver snapshot + action. |
| `src/main/java/.../dto/backfill/BackfillRunResult.java` | Command result: dry/exec flags, per-entry decisions, reconciliation status, rollback list. |
| Tests — see §19. |

## 3. Files Modified

| File | Change |
|------|--------|
| `src/main/java/.../service/ProductionBackfillProgressService.java` | **Additive only:** added `OUTCOME_BLOCKED = "BLOCKED"` constant; `recordOutcome` treats FAILED/BLOCKED as failure count; added read-only `stateOf(jobId)`. Existing behavior reuse untouched. |
| `src/main/resources/application.yaml` | Added `production.backfill.enabled: ${PROD_BACKFILL_ENABLED:false}` (default **OFF**). |
| `src/main/java/.../service/ProductionBackfillEventWriter.java` (javadoc) | Reworded to carry **zero** textual `StockService`/`stock_ledger`/`stock_balance` tokens (static-scan requirement). No behavior change. |
| `src/main/java/.../service/ProductionBackfillService.java` (comment) | Reworded one comment to remove literal `stock_ledger`/`stock_balance` tokens (static-scan requirement). No behavior change. |

## 4. Files Explicitly Untouched (OFF LIMITS honored)

- `entity/ProductionEntry.java`, `repo/ProductionEntryRepository.java` — read-only scan only; **no mutation** added.
- `config/ProductionNormalizedOpsProperties.java` and `production.normalized-ops.enabled` — **unchanged** (not renamed, not toggled).
- `service/ProductionInputAuthorityResolver.java` — **no change** (sole authority, reused).
- `service/ProductionNormalizedEventService.java` — **no change** (online flag logic untouched; writer mirrors its natural-key helpers without coupling to the online flag).
- `service/ProductionStockBoundary.java`, `StockService`, `StockBalanceRepository` — **untouched**, not referenced.
- `V4__prod_normalized_events.sql`, `V5__prod_backfill_infrastructure.sql` — **not edited** (schema already additive; `outcome` is `VARCHAR(30)` with no CHECK, so `BLOCKED` is schema-safe).
- `ProductionEntryValidationService`, `ProductionController`, online write/reversal path, legacy P1–P4 modules — **untouched**.
- `production_entry`, `stock_ledger`, `stock_balance` — **no INSERT/UPDATE/DELETE** from any backfill code.

## 5. Backfill Engine Architecture

```
ProductionBackfillService (orchestrator, gated, dry-first)
 ├── ProductionEntryRepository            read-only scan (ascending id)
 ├── ProductionInputAuthorityResolver     ALL quantity/category/eligibility semantics
 ├── ProductionBackfillEntryProcessor     per-entry REQUIRES_NEW worker
 │    └── ProductionBackfillEventWriter   natural-key upsert: session/op/outputs
 ├── ProductionBackfillProgressService    start/claim/resume/heartbeat/recordOutcome/complete/stateOf/rollback-state
 ├── BackfillEntryDecision / BackfillRunResult   decision + result DTOs
 └── ProductionBackfillProperties         dedicated flag gate (default OFF)
```

- **Orchestrator/writer decoupled:** the writer is its own component so its behavior is **not** coupled to the online flag of `ProductionNormalizedEventService`. The engine writes only through the writer; `ProductionNormalizedEventService` = **NO CHANGE / REUSE of its documented projection semantics.**
- **Gating rule (implemented):** projection writing proceeds only when `production.backfill.enabled == true` **AND** invoked through the internal authorized path. The engine refuses to write when the gate is closed and logs the gate state. `dryRun=true` (default path) classifies + reports and writes nothing.

## 6. Resolver Integration Proof

- The engine has **no independent** computation of `process_qty`/`produced_quantity` authority, effective input, semantic category, backfill eligibility, or confidence — all come verbatim from `ProductionInputAuthorityResolver.resolve(entry)` (mirrored into each outcome and decision):
  - `ProductionBackfillService` scans → calls `resolver.resolve(entry)` → routes on the result.
  - `ProductionBackfillEntryProcessor.projectEligible` **asserts `isResolvable()`** before projecting (an ELIGIBLE-but-unresolvable record throws `IllegalStateException` and persists nothing — proven by test **10b**).
- **No produced→process conversion, no silent zero input:** there is no code path that substitutes `produced_quantity` for `process_qty` or writes a zero/implied input; projections use the resolver's resolved effective input and derived WIP verbatim (test **12** proves WIP uses resolver effective input, not produced/silent-zero; tests **2/13/14** prove Category B is never converted).

## 7. Eligibility Handling

Routing (single source of truth = resolver result; the engine maps `BackfillEligibility` → action/outcome only):

- **ELIGIBLE + resolvable (Category A/C, no over-allocation)** → project session/op/outputs in one `REQUIRES_NEW` txn; outcome `PROJECTED`; advance cursor.
- **ELIGIBLE but duplicate (natural key already present)** → outcome `ALREADY_PROJECTED`; **no writes**; advance cursor.
- **QUARANTINE (Category B etc., unresolvable)** → outcome `QUARANTINED`; no events; effective input stays null; `quarantine_count` increments; continue (non-fatal).
- **BLOCK (over-allocation)** → outcome `BLOCKED`; no events; **stop-on-block**; job ends `RECONCILIATION_FAILED`/block state (see §9).

Proven by integration tests: eligible projection (1/11/12), zero-eligible (4), Category B (2/13/14), block (3).

## 8. CATEGORY_B Handling

- `PE/2026-27/00001`-shaped data (`process_qty=NULL`, `produced_quantity` present) resolves to **CATEGORY_B / AMBIGUOUS / EffectiveInputQuantity=null / QUARANTINE / INPUT-AUTHORITY-NULL**.
- The engine **never** auto-resolves, **never** converts produced→process, **never** creates normalized events, and **never** modifies the legacy record. It records outcome `QUARANTINED` with `semantic_category=CATEGORY_B`, `authority=AMBIGUOUS`, `reason_code=INPUT-AUTHORITY-NULL`, `effective_input=NULL`, `eligibility=QUARANTINE`, and skips projection.
- Test **4** (`engine correctly processes zero eligible records today — only Category B present`) pins the live-shaped behavior: **the engine processes zero eligible records today** and quarantines Category B, matching the absolute rule exactly.

## 9. BLOCK Handling

- Triggered when a resolver-flagged over-allocation (allocated output > input) would otherwise be projected by policy.
- **Stop-on-block (recommended default, implemented):** the engine records `BLOCKED` outcome + reason (`OVERALLOCATION`), emits **no** normalized events, never continues the block record as valid, and halts the run.
- Test **3** proves the block record is never projected, never continued, and the job status reflects the block. There is **no** continue-with-block bypass implemented (conservative default per DOCUMENT_34 §12).

## 10. Quarantine Handling

- QUARANTINE records: **no** `prod_*` event insert; outcome `QUARANTINED` with the full resolver snapshot; effective input preserved null/unresolved; `quarantine_count` incremented; execution continues (non-fatal); **no legacy modification**.
- Manual resolution is the separate additive `ProductionBackfillProgressService.resolveEntry` path — the engine only projects after the resolver returns ELIGIBLE (i.e. never by mutation, never produced→process).

## 11. Transaction Proof

- **One entry = one atomic `REQUIRES_NEW` transaction** containing: session insert, operation insert, output inserts, per-entry outcome, and progress heartbeat/cursor. A failure rolls back **only that entry** (cursor unchanged → retry reprocesses it) and leaves **no partial `prod_*` rows**.
- Two automated proofs (test **10**, `ProductionBackfillRollbackAtomicityTest.failureRollsBackWholeEntryTransaction`): a `@MockitoSpyBean` failure is injected at the cursor-advance step — after the real writer derives the session/operation/outputs inside the transaction — and the whole `REQUIRES_NEW` transaction rolls back. Assertions confirm **zero** new session/op/output/outcome/progress rows remain after the throw.
- Test **10b** additionally proves the processor refuses to fabricate an input for an ELIGIBLE-but-unresolvable record and persists nothing.

## 12. Progress / Resume Proof

- The engine uses the existing progress lifecycle: `startJob` (idempotent), `claim` (`@Version` guarded), `resumeFrom(last_successful_entry_id)`, `heartbeat`, `recordOutcome` (idempotent by job+entry), `complete`.
- Progress advances only in the same per-entry transaction as the projection (never in dry-run). Test **7** asserts processed/success/quarantine counts, status `COMPLETED`, and watermark set.
- **Crash/resume** (test **8/9**): resume from `last_successful_entry_id` starts strictly after the committed cursor and reprocesses only the uncommitted tail — no duplicates, no skipped eligible work. The `@Version` claim guard prevents two workers claiming the same scope.
- **Cursor policy (implemented):** PROJECTED / ALREADY_PROJECTED advance the success watermark; QUARANTINE advances `last_processed` + `quarantine_count` but not `last_successful_entry_id` (per DOCUMENT_32 note), preserving manual resolution as a separate approved step.

## 13. Idempotency Proof

- **Natural keys + repos (primary):** before insert the writer checks existence via existing repo lookups; a pre-existing key yields `ALREADY_PROJECTED` and **no writes**. A concurrent/duplicate `DataIntegrityViolationException` on a natural key is absorbed and re-finds the winner (same pattern as the online service) so a duplicate is a safe no-op, never a rollback of the authoritative write.
- **DB constraint = final backstop, not primary** — idempotency is driven by existence checks + cursor, not exception swallowing.
- **Same-job re-run (test 5b):** a terminal (`COMPLETED`/`ROLLED_BACK`) job re-invocation is handled **before** claim via `stateOf`+`isTerminal()` → idempotent no-op (no `"Job already terminal"` claim error).
- Test **5/6**: replay across fresh jobs returns `ALREADY_PROJECTED` and yields no duplicate session/op/output.

## 14. Reconciliation Proof

- Post-run reconciliation verifies the invariant `Δ_input = Δ_acc = Δ_rej = Δ_rew = Δ_scr = Δ_wip = 0` across projections using the resolver's effective input (WIP = max(input − Σoutputs, 0)); the result is stored on `ProdBackfillProgress` (`PASS` → `COMPLETED`, or `FAIL` → `RECONCILIATION_FAILED`).
- `verifyReconciliation` compares decisions against the scanned feed by construction; `simulateReconciliation` reports the additive plan for a dry run. Tests **1/11/12** assert resolver-input and correct WIP for Category C and Category A.

## 15. Feature-Flag State

- **Dedicated gate (DOCUMENT_34 §16, adopting B+C):** `production.backfill.enabled`, default **false**, env `PROD_BACKFILL_ENABLED`. It is **independent** of `production.normalized-ops.enabled` (which remains **unchanged** — not renamed, default false).
- Verified on disk (`application.yaml`): `normalized-ops.enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}` (untouched) and `backfill.enabled: ${PROD_BACKFILL_ENABLED:false}`.
- **Inertness proven (test 17):** with the flag OFF (default), the engine is fully inert — no writes, no progress/outcome, no events; the gate is reported closed. `ProductionBackfillFlagInertnessIntegrationTest` runs with the flag OFF.
- The flag was **not enabled** for any live run; it is toggled ON only inside the isolated Testcontainer-backed test classes.

## 16. Security / Invocation Design

- **No public/unauthenticated backfill endpoint** (verified: no backfill endpoint in `controller/`). `ProductionBackfillService` is service-only, mirroring the dry-run posture (DOCUMENT_34 §17).
- **Authorized/manual execution path (test 18):** a real run is an explicit manual call (`backfill(jobId, dryRun, actor)` invoked by an approved operator), never automatic at boot or on a schedule. Dry-run writes nothing; the real run is the explicit invocation.
- **Dry-run-mandatory model** in the API contract; no new security framework introduced.
- **Audit:** every run carries `job_id` + `actor`; per-entry outcomes are recorded (audit trail), reconciliation persisted on the progress row.

## 17. Inventory Isolation Proof

- **Static/DI scan (test 15/18 in `ProductionBackfillFlagInertnessIntegrationTest`):** backfill engine sources (`ProductionBackfillService`, `ProductionBackfillEntryProcessor`, `ProductionBackfillEventWriter`, `ProductionBackfillProgressService`, `ProductionBackfillProperties`, `dto/backfill/*`) contain **zero** references to `StockService`, `ProductionStockBoundary`, `StockBalanceRepository`, and no literal `stock_ledger`/`stock_balance` tokens. Verified by `grep` (clean) and by the automated scan test.
- **Runtime count-stability (test 15):** `COUNT(stock_ledger)` and `COUNT(stock_balance)` are unchanged around a controlled engine run.
- **No stock SQL:** the writer/orchestrator/processor contain no `JdbcTemplate`/`@PersistenceContext` stock statements (verified: no direct SQL in those classes).
- **Boundary single path:** the only production→stock bridge (`ProductionStockBoundary.recordJobCardCompleteGood`) is untouched; the engine has zero coupling to inventory.

## 18. Legacy-Data Protection Proof

- **Read-only scan only:** the engine reads `production_entry` via `ProductionEntryRepository` and holds **no** write reference; it never calls `save`/`delete` on legacy entities (verified: writer persists only to `ProdExecutionSessionRepository`/`ProdOperationEventRepository`/`ProdOutputEventRepository`).
- **No legacy column assignment:** no backfill code assigns `process_qty`, `produced_quantity`, `good_quantity`, `rejected_quantity`, `rework_quantity`, `scrap_quantity` (verified by grep/scan).
- **Integration assertion (test 16):** legacy `production_entry` values + row counts are unchanged around engine runs (checksum/protection test green).
- **Additive-only invariant:**

## 19. Test Results

Three new Testcontainer-backed integration classes (static one `@Container @ServiceConnection` each, isolated disposable DB — **never** the live `zyger_erp`):

| Class | Tests | Result |
|-------|-------|--------|
| `ProductionBackfillServiceIntegrationTest` (flag ON) | 14 | PASS |
| `ProductionBackfillFlagInertnessIntegrationTest` (flag OFF) | 2 | PASS |
| `ProductionBackfillRollbackAtomicityTest` (mockito failure-injection) | 2 | PASS |
| **Total new backfill tests** | **18** | **0 failures / 0 errors** |

Mapping of DOCUMENT_34's **19 mandated requirements** to green tests:

| # | Requirement | Test(s) |
|---|-------------|---------|
| 1 | Eligible record projection | 1/11/12 (Category C projects session+op+outputs, resolver input, correct WIP) |
| 2 | CATEGORY_B quarantine | 2/13/14 (no session, null input, never projected/never produced-to-process) |
| 3 | BLOCK record stop behavior | 3 (stop-on-block; never projected/continued) |
| 4 | Zero eligible records | 4 (only Category B present → projects nothing) |
| 5 | Idempotent replay | 5/6 (fresh-job replay → ALREADY_PROJECTED, no dup session/op/output) |
| 6 | ALREADY_PROJECTED handling | 5/6 |
| 7 | Progress advancement | 7 (counts, COMPLETED, watermark) |
| 8 | Resume from last_successful_entry_id | 8/9 |
| 9 | Crash/failure recovery | 8/9 (resume reprocesses only uncommitted tail, no dup) |
| 10 | Per-entry transaction rollback | 10 (REQUIRES_NEW failure rolls back all writes; 10b refuses fabricated input) |
| 11 | Output reconciliation | 11/12 |
| 12 | WIP reconciliation using resolver EffectiveInputQuantity | 12 |
| 13 | No silent zero input | 12 (never produced/silent-zero), 10b |
| 14 | No produced-to-process conversion | 2/13/14 |
| 15 | Inventory isolation | 15 (stock_ledger/stock_balance counts unchanged) + static scan 15/18 |
| 16 | Legacy production_entry unchanged | 16 |
| 17 | Feature flag OFF prevents execution | 17 (inert; gate closed) |
| 18 | Authorized/manual execution path | 18 (dry-run writes nothing; real run explicit manual) + static scan |
| 19 | Rollback scope limited to backfill-created prod_* rows | 19 (removes only PROJECTED prod_* rows; legacy + stock untouched) |

Note: requirement 10 is proven by a dedicated rollback-atomicity class (a mockito failure injected inside the `REQUIRES_NEW` entry transaction after the real writer derives the rows), since `REQUIRES_NEW` correctly does not join an outer caller transaction.

## 20. Regression Comparison

| Measure | Baseline | After Phase B |
|---------|----------|---------------|
| Backend tests | 238 | **256** |
| Failures / errors | 0 / 0 | **0 / 0** (full `./gradlew test` green) |
| New tests added | — | +18 backfill (no FE/other change) |
| Frontend | untouched | untouched |

Full backend run: **256 tests / 0 failures / 0 errors** across 68 test classes. Inventory-isolation suites confirmed green (`ProductionBackfillFlagInertnessIntegrationTest`, `InventoryIntegrationServiceTest`, backfill classes).

## 21. Known Limitations

- **No live ELIGIBLE record exists today** — correct and intended; the engine's only live-DB outcome would be zero projections + quarantine of `PE/2026-27/00001`. Live execution is strictly out of scope this phase.
- **Authorized invocation surface** is service-level only (no CLI/controller wrapper shipped, matching the conservative posture). A role-gated endpoint can be added later only by explicit approval.
- **Reconciliation** is derived/verified from decisions + scanned feed by construction; it is not run against the live database (no live progress rows).
- **BLOCKED** outcome was added as a value; `outcome` column is `VARCHAR(30)` with no CHECK constraint so this is schema-compatible (no migration edit).

## 22. Live Execution Readiness

- **Not live-ready to run autonomously — by design.** The gating rule requires the dedicated flag ON **and** an authorized manual invocation **and** a reviewed dry-run of the same scope. The flag is OFF; no invocation path exists that bypasses it; nothing runs at boot/schedule.
- The engine is **conceptually ready** for a future controlled dry-run once explicitly approved, but **no live dry-run or backfill has been executed** and none will be without explicit approval.

## 23. Rollback Readiness

- Backfill is **additive-only**. `rollback(jobId)` deletes **only** the `PROJECTED` backfill-created session / op / output rows (reverse dependency order) and marks the job `ROLLED_BACK`.
- **Never** a DELETE/UPDATE against `production_entry`, `stock_ledger`, or `stock_balance` (test **19** proves legacy + stock are untouched by rollback; the scope is limited to backfill-created `prod_*` rows).
- A rollback/affected-rows plan is printable (dry-run/result DTOs) so an operator can confirm scope before any drop.

## 24. Final Recommendation

**Recommendation: B — READY WITH REQUIRED CORRECTIONS.**

The engine implementation, per-entry `REQUIRES_NEW` atomicity, idempotency, quarantine/block/zero-eligible handling, inventory isolation, legacy protection, and all **19 mandated requirement tests pass (0 failures)** with no live change. The residual items are **approval/operational gates, not defects**, and must be satisfied by an operator before any controlled dry-run proceeds:

1. **Dry-run approval (explicit operator/approval gate):** DOCUMENT_34 §20 step (4)/§16 requires a dedicated flag + manual invocation + reviewed dry-run. No live date has been scheduled or authorized.
2. **Authorized invocation surface (approval point):** only the service-level manual call exists today; a role-gated (`ADMIN`/`BACKFILL_OPERATOR`) endpoint/CLI wrapper, if desired, needs separate approval (DOCUMENT_34 §16/§17).
3. **No live execution now:** building the engine is safe and complete; its **only** correct live-DB outcome today is "zero eligible; quarantine `PE/2026-27/00001`." Live dry-run/backfill must wait for explicit approval.
4. **Rollback drill:** no live rollback has been executed; the additive scope is proven in-isolation only.

Neither recommendation A (immediate live dry-run) nor C (unsafe/blocked) applies: the code is complete and green, but it must **remain inert** until the gates above are explicitly opened.

---

## Change Log

- Created DOCUMENT_35 (P3.3 Phase B implementation report): scope, files created/modified/untouched, engine architecture, resolver/eligibility/CATEGORY_B/BLOCK/quarantine proofs, transaction/progress/idempotency/reconciliation proofs, feature-flag & security/invocation state, inventory-isolation + legacy-protection proofs, full test results (18 new backfill tests; 19/19 mandated requirements mapped green; 256 total backend tests / 0 failures), regression comparison, known limitations, live-execution & rollback readiness, and final recommendation **B** (ready with required corrections — corresponds to "ready with required approvals"; code is green but must remain inert). **STOP — no live dry-run, no backfill, no flag enable, no legacy/stock change, no P3.4.**