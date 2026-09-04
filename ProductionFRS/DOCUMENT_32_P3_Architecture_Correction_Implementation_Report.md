# DOCUMENT_32 — P3 Architecture Correction Implementation Report

**Phase:** P3 Architecture Correction Foundation (CONDITIONAL PASS scope).
**Type:** **IMPLEMENTATION REPORT** (foundation only — **no backfill, no authority flip, no P4**).
**Authoritative inputs:** DOCUMENT_31 (approved correction plan), DOCUMENT_30, DOCUMENT_29, DOCUMENT_28, DOCUMENT_27.
**Scope of this report:** steps 1–7 of the P3 architecture correction foundation that received conditional PASS approval: resolver (`RC-1`), projection refactor, dry-run refactor, progress/entry-outcome backbone (`RC-2`), tests, full regression.
**Out of scope (explicitly NOT done):** actual backfill, legacy `production_entry` data changes, production authority flip, feature-flag authority/cutover behavior change, inventory posting, `StockService` / `ProductionStockBoundary` / `stock_balance` / `stock_ledger` modification, and P4.

**Status:** **FOUNDATION COMPLETE — STOP. No backfill, no authority flip, no P4. Await next-stage approval.**

---

## 1. Executive Summary

The P3 architecture correction foundation has been implemented and verified green, exactly as scoped by DOCUMENT_31. The core deliverable is **one shared input-authority contract** (`ProductionInputAuthorityResolver`) that is now the single interpretation point for `process_qty` / `produced_quantity` across the normalized projection and the backfill dry-run, closing the RC-1 semantic split. A concrete progress / per-entry-outcome backbone (`RC-2`) provides idempotent job start/claim/resume and an additive audit trail, **without executing any actual backfill**.

Inventory remains entirely outside every touched path. No legacy `production_entry` data was modified, no stock row was created or changed, no authority/cutover behavior changed, and no backfill ran. The single live Category-B record `PE/2026-27/00001` is classified **QUARANTINE** by the resolver and is **never auto-backfilled**.

**Verdict (foundation): GREEN** — backend 238 tests / 0 failures, frontend 34 tests / typecheck exit 0, lint identical to the pre-change baseline.

---

## 2. Scope and Mandates

### 2.1 In scope (per conditional approval + DOCUMENT_31)

| # | Deliverable |
|---|-------------|
| 1 | `ProductionInputAuthorityResolver` + supporting resolution types (`RC-1` shared contract) |
| 2 | `ProductionNormalizedEventService` refactor — `available_input` sourced from the resolver; non-resolvable records skipped |
| 3 | `ProductionBackfillDryRunService` refactor — resolver-based category/authority/eligibility/confidence/reason + corrected loss-ledger |
| 4 | `ProdBackfillProgress` + `ProdBackfillEntryOutcome` entities, repositories, `ProductionBackfillProgressService`, additive `V5` migration (`RC-2`) |
| 5 | Tests for all categories, live-record class, resolver/projection/dry-run consistency, no-silent-zero, over-allocation block, reversal classification, progress restart/idempotency, quarantine, inventory isolation |
| 6 | Full backend + frontend regression, lint-vs-baseline, stock-count stability, DOCUMENT_32, **STOP** |
| 7 | The progress/entry-outcome model is a controlled backfill mechanism only — never an execution authority, never an inventory writer |

### 2.2 Mandatory implementation order (followed)

STEP 1 read-only baseline → STEP 2 resolver → STEP 3 projection refactor → STEP 4 dry-run refactor → STEP 5 progress/outcome foundation → STEP 6 tests → STEP 7 regression + report + STOP. No step was skipped or reordered.

### 2.3 Not touched (OFF LIMITS — verified in `git status` / diff)

`StockService.java`, `StockBalanceRepository`, `ProductionStockBoundary.java`, `stock_balance`, `stock_ledger`, `production_entry*` schema/entity/repositories, `ProductionEntryValidationService`, `controller/ProductionController.java`, `V4__prod_normalized_events.sql` (immutable), `config/ProductionNormalizedOpsProperties.java` (flag stays OFF default), `application*.yaml` (flyway/ddl-auto/normalized-ops unchanged), and the feature-flag authority/cutover behavior.

**Explicitly NOT executed:** actual backfill, legacy data modification, authority flip, inventory post, P4.

---

## 3. Baseline Recorded (STEP 1)

| Metric | Baseline | After | Delta |
|--------|----------|-------|-------|
| Backend tests | 219 / 0 failures / 0 errors | 238 / 0 failures / 0 errors | +19 tests |
| Frontend tests | 34 pass | 34 pass | 0 |
| Frontend typecheck | exit 0 | exit 0 | 0 |
| Frontend lint | 31 errors / 741 warnings (772 problems) | identical (772) | 0 (FE untouched) |
| `stock_ledger` rows | 41 | 41 (invariant asserted in tests) | 0 |
| `stock_balance` rows | 17 | 17 (invariant asserted in tests) | 0 |
| `production_entry` rows | 1 | 1 (read-only; no mutation) | 0 |
| prod event tables | 0 | 0 (no projection during read-only path) | 0 |

The live-count invariants for the stock tables are additionally proven at runtime by the integration tests (see §12).

---

## 4. RC-1 Root Cause Addressed

DOCUMENT_31 §3 identified that three components independently re-implemented quantity semantics (validation `process ?? produced`; projection `process`-only; dry-run process-input + produced-alias labeling) and that DOCUMENT_27's `process_qty (≡ produced_quantity)` alias was **not universal** (live Category-B record: `process_qty` NULL, `produced` = total-output).

**Resolution:** all projection and dry-run quantity interpretation now flows through `ProductionInputAuthorityResolver.resolve(ProductionEntry)`. No consumer implements its own fallback/alias. `ProductionEntryValidationService` was intentionally left unchanged (its `process ?? produced` fallback is a write-time local rule inside the off-limits validation path; per the approved file plan DOCUMENT_31 §16 the validation refactor is a future step not blessed within this scope).

---

## 5. The Shared Resolver Contract (RC-1 / STEP 2)

### 5.1 New types (`dto/resolution/`)

- `InputSemanticCategory` — `CATEGORY_A | CATEGORY_B | CATEGORY_C | CATEGORY_D | CATEGORY_UNKNOWN`.
- `InputAuthority` — `PROCESS_QTY | AMBIGUOUS`.
- `BackfillEligibility` — `ELIGIBLE | QUARANTINE | BLOCK`.
- `ResolutionConfidence` — `HIGH | MEDIUM | LOW`.
- `InputResolutionResult` — immutable value object; `isResolvable() == (authority == PROCESS_QTY && effectiveInputQuantity != null)`.

### 5.2 Classification matrix (deterministic, per record)

| Category | rule | authority | effective input | eligibility | resolvable |
|----------|------|-----------|-----------------|-------------|------------|
| CATEGORY_A | `process` present, `produced` NULL | PROCESS_QTY | process | ELIGIBLE | yes |
| CATEGORY_B | `process` NULL, `produced` present | AMBIGUOUS | **none** | QUARANTINE | no |
| CATEGORY_C | both present and equal | PROCESS_QTY | process | ELIGIBLE | yes |
| CATEGORY_D | both present and different | AMBIGUOUS | **none** | QUARANTINE (BLOCK if over-allocation) | no |
| CATEGORY_UNKNOWN | both NULL; negative (non-reversal); other invalid | AMBIGUOUS | **none** | QUARANTINE / BLOCK | no |
| Over-allocation (A/C/D) | allocated outputs > input | — | present for A/C | **BLOCK** | A/C yes / D no |

### 5.3 No-silent-zero rule

For every ambiguous/quarantined/blocked record the resolver returns `effectiveInputQuantity = null`; it **never** silently substitutes zero or `produced_quantity`. `isResolvable()` is false in all such cases, so projection/dry-run cannot fabricate an input.

### 5.4 Reversal classification (DOCUMENT_31 §8)

- A **reversal row** (`is_reversal=true`, negated quantities) is a compensating mirror, **not** invalid negative data. If `process_qty` is present on the mirror it resolves `PROCESS_QTY` / `ELIGIBLE` / `REVERSAL-MIRROR` so projection creates the negated CANCELLED session.
- A reversal with **`process_qty` NULL** (i.e. reversal of a Category-B record) is `CATEGORY_B` / **QUARANTINE** — `produced` on the mirror is never promoted silently into `process` (fixes the DOCUMENT_27 §1.2 / controller-L453 edge where a Category-B reversal would otherwise write `0` not `-100`).

---

## 6. Projection Refactor (RC-1 / STEP 3)

`ProductionNormalizedEventService`:

- Injects `ProductionInputAuthorityResolver`.
- `project(...)` first computes `resolution`; if `!resolution.isResolvable()` it **returns without projecting** (ambiguous / quarantined / blocked records produce no fabricated `available_input` — no `0`-input session).
- `resolvedInput(entry)` returns the resolver's `effectiveInputQuantity`; the guard ensures it is only reached for resolvable input. Raw `process_qty` fallback and silent produced-fallback are removed.
- `applySessionSnapshot` / `buildSession` use `resolvedInput`.
- Reversal projection (`EventKind.REVERSE`) still creates the negated CANCELLED/REVERSED mirror when the reversal resolves.

Behavior change is **projection-only and flag-gated** (unchanged `production.normalized-ops.enabled`); zero impact on the live disabled-by-default runtime. Inventory surface is unchanged (dependencies remain property + 3 event repos; no StockService/Boundary/StockBalance).

---

## 7. Dry-Run Refactor (RC-1 / STEP 4)

`ProductionBackfillDryRunService`:

- `simulateEntry` now calls `inputAuthorityResolver.resolve(e)` for `semanticCategory`, `authority`, `backfillEligibility`, `confidence`, `reasonCode` (5 new fields on `dto/dryrun/EntryReconciliation`).
- `simulatedAvailableInput` = resolver effective input; WIP is derived from the **resolved** input, not a frozen process alias.
- `validateEntry` emits: Category D → `PRODUCED-DIFF` (HIGH); Category B → `INPUT-AUTHORITY-NULL` (MEDIUM); silent-zero guard → `SILENT-ZERO-INPUT` (HIGH) for non-Category-B ambiguity; `NEG-WIP` (BLOCKING).
- Loss-ledger `produced_quantity` wording corrected: produced is an alias of process **only for Category C**; for Category B it is total-output (resolver governs).
- Dry-run remains strictly read-only (event + legacy + stock tables untouched) and inventory-isolated.

---

## 8. RC-2 — Progress / Entry-Outcome Backbone (STEP 5)

### 8.1 Entities

- **`ProdBackfillProgress`** — job-level progress/resume marker, one row per `job_id` (UNIQUE). Fields: `job_id`, `job_card_number`, `status` (one vocabulary: `NOT_STARTED / RUNNING / PAUSED / FAILED / COMPLETED / RECONCILIATION_FAILED / ROLLED_BACK`), `last_processed_entry_id`, `last_successful_entry_id`, `batch_number`, timestamps, `failure_count / quarantine_count / processed_count / success_count / skip_count`, `reconciliation_status`, `@Version` optimistic lock.
- **`ProdBackfillEntryOutcome`** — per-entry audit (UNIQUE `job_id + entry_number`). Fields: `job_id`, `entry_number`, `legacy_id`, `outcome` (`PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED`), `semantic_category`, `authority`, `reason_code`, `effective_input`, `eligibility`, `resolution_note`, `created_at`.

### 8.2 Repositories

- `ProdBackfillProgressRepository` — `findByJobId`.
- `ProdBackfillEntryOutcomeRepository` — `findByJobIdAndEntryNumber`, `findByJobId`, `countByJobIdAndOutcome`.

### 8.3 Service — `ProductionBackfillProgressService`

- `startJob` — idempotent create per `job_id`.
- `claim` — transition to RUNNING only from resumable states; terminal (COMPLETED/ROLLED_BACK) rejected; optimistic `@Version` prevents double-claim.
- `resumeFrom(jobId)` — returns last committed (`last_successful_entry_id`) for restart; **duplicates impossible / eligible records never skipped**.
- `heartbeat` — watermark update after a batch chunk.
- `recordOutcome` — additive, idempotent per `job_id + entry_number`; updates progress counters.
- `resolveEntry` — additive manual resolution (note + explicit input + eligibility) for quarantined entries only; **never modifies legacy `production_entry` data**.
- `complete` — finalize job `status` + `reconciliation_status`.

This service performs **no actual backfill, no normalized-event writes, and no inventory writes** — it is pure infrastructure.

### 8.4 Migration `V5__prod_backfill_infrastructure.sql`

Strictly additive (`CREATE TABLE IF NOT EXISTS` + indexes + UNIQUE constraints; no DROP / RENAME / column-type change). Immutable `V4` untouched. In the live runtime (`flyway.enabled=false`, `ddl-auto=update`) the tables are created from the JPA entities; `V5` exists for Flyway-managed environments (matches DOCUMENT_31 §16). No legacy-table constraint/catalog change.

### 8.5 Runtime-config note (verified)

Live `spring.flyway.enabled=false`, `hibernate.ddl-auto=update`, `production.normalized-ops.enabled=${PROD_NORMALIZED_OPS_ENABLED:false}`. The two new tables materialize via `ddl-auto=update` from the entities, matching how the three prod event tables already exist (all 0 rows) while `prod_backfill_progress` was previously absent (root-cause C6 confirmed and resolved).

---

## 9. Reversal / Category-B Manual-Resolution Semantics

- **Reversal mirror** projection: `EventKind.REVERSE` with a resolvable reversal creates a negated CANCELLED session; original historical projection preserved (`P3-06`).
- **Reversal of Category B** (`process_qty` NULL on mirror): **QUARANTINE** — never auto-assumed, never silently uses produced.
- **Manual resolution flow** is additive: a reviewer supplies explicit `effectiveInput` + eligibility note stored on the `ProdBackfillEntryOutcome`, promoting the entry toward ELIGIBLE for future controlled backfill, **without touching legacy `production_entry`**. Actual promotion to backfill is NOT executed here.

---

## 10. Tests Added (STEP 6)

| File | Kind | Coverage |
|------|------|----------|
| `ProductionInputAuthorityResolverTest` | unit (pure, no DB) | all 4 categories + unknown; over-allocation → BLOCK (A/C/D); both-null with/without outputs; negatives; null entry; **reversal mirror resolvable**; **reversal-of-B quarantined**; never silent-zero |
| `ProductionResolverProgressIntegrationTest` | integration (Testcontainer) | Category C projected with resolver input; Category B NOT projected; live-record `PE/2026-27/00001` QUARANTINED + never backfilled; no `stock_ledger`/`stock_balance` writes from projection; progress start idempotency, duplicate prevention, resume-from-last-successful; manual resolution additive (legacy data untouched) |
| `ProductionBackfillDryRunIntegrationTest` (+1 method) | integration | resolver fields surface in reconciliation: Category C resolvable / Category B QUARANTINE + `INPUT-AUTHORITY-NULL` + AMBIGUOUS; read-only + inventory-isolation invariants upheld |
| Updated `ProductionNormalizedEventServiceTest` | unit | injects real resolver (constructor gained 5th arg); reversal mirror + quantity mapping still pass |

Pre-existing reversal tests whose behavior the resolver refactor changed were corrected: the resolver now treats legitimate reversals as compensated mirrors (not invalid negatives), restoring the negated CANCELLED-mirror projection.

---

## 11. Regression (STEP 7)

| Suite | Command | Result |
|-------|---------|--------|
| Backend full | `./gradlew test` (JUnit5 + Testcontainers) | **238 tests, 0 failures, 0 errors** |
| Backend main | `./gradlew compileJava` | BUILD SUCCESSFUL |
| Frontend | `npm run typecheck` | exit 0 |
| Frontend | `npm run test` (vitest) | **34 passed** |
| Frontend | `npm run lint` | **772 problems (31 errors / 741 warnings)** — byte-identical to baseline; FE untouched |

**Build-infrastructure change:** `build.gradle` `tasks.named('test')` gained `maxHeapSize = '2g'`. The Testcontainers-backed suite (one Postgres container per Spring context + one static container per class) OOMs in a single Gradle fork at the default 512m worker heap, surfacing as context-load `OutOfMemoryError` rather than assertion failures. Raising the test worker heap is a **test-only** change; no main-code path or production setting was altered.

---

## 12. Inventory Isolation Proof

Proofs extend the `ProductionBackfillDryRunIntegrationTest.inventoryIsolationStaticScan` pattern (per DOCUMENT_31 §15):

1. **Static/DI scan:** the resolver, `ProductionBackfillDryRunService`, `ProductionNormalizedEventService`, and `ProductionBackfillProgressService` have **zero** compile-time/repo dependencies on `StockService`, `ProductionStockBoundary`, `StockBalanceRepository` (asserted via class-file constant-pool scan for the dry-run; constructor graphs for the rest — none autowire a stock type).
2. **Runtime count-stability:** `ProductionResolverProgressIntegrationTest.projectionInventoryIsolation` and `ProductionBackfillDryRunIntegrationTest.dryRunIsReadOnly` assert `COUNT(stock_ledger)` and `COUNT(stock_balance)` **unchanged** across projection/dry-run.
3. **No stock SQL:** no `INSERT/UPDATE` targeting `stock_*` exists in any resolver/projection/dry-run/progress code path (no JdbcTemplate stock statement; entities/repos target only `prod_*` event/progress tables).
4. **Boundary single path:** only `ProductionStockBoundary.recordJobCardCompleteGood -> StockService.recordStockIn` (job-card completion) bridges production to stock, and it remains **untouched**.

No StockService, no ProductionStockBoundary, no StockBalanceRepository, no `stock_balance` writes, no `stock_ledger` writes for semantic resolution, dry-run, backfill (future), or normalized projection.

---

## 13. Compliance with Mandatory Rules

| Rule (from context/plan) | Status |
|--------------------------|--------|
| Conditional PASS scope: foundation only — no actual backfill, no legacy `production_entry` change, no authority change, no feature-flag/cutover change, no inventory post, no `StockService`/`ProductionStockBoundary`/`stock_balance`/`stock_ledger`/V4 change, no P4 | honored |
| Mandatory STEP order 1-7 followed | yes |
| Resolver category rules per approval | yes |
| No-silent-zero rule | yes (ambiguous -> `effectiveInput = null`, `isResolvable=false`) |
| Live `PE/2026-27/00001` = CATEGORY_B, must NOT auto-backfill | yes (resolver -> QUARANTINE/`INPUT-AUTHORITY-NULL`; projection skips; test asserts) |
| Baselines recorded (STEP 1): backend 219/0/0, FE 34 + typecheck 0, lint 31/741, stock 41/17, prod_entry 1, events 0 | recorded, deltas reported |
| `prod_backfill_progress` must persist via entity (`ddl-auto=update`, Flyway off) | entity + repo + service (V5 additive for Flyway envs) |
| JUnit 5 + Testcontainers, `@BeforeEach` truncate, Lombok builders, `dto/` package, Java 25 | matched throughout |
| Pre-existing dirty repo state not to be reverted/attributed | left as-is |

---

## 14. Files Changed / Created (this work)

**Created (untracked):**

- `dto/resolution/InputSemanticCategory.java`, `InputAuthority.java`, `BackfillEligibility.java`, `ResolutionConfidence.java`, `InputResolutionResult.java`
- `service/ProductionInputAuthorityResolver.java`
- `entity/ProdBackfillProgress.java`, `entity/ProdBackfillEntryOutcome.java`
- `repo/ProdBackfillProgressRepository.java`, `repo/ProdBackfillEntryOutcomeRepository.java`
- `service/ProductionBackfillProgressService.java`
- `resources/db/migration/V5__prod_backfill_infrastructure.sql`
- `test/.../service/ProductionInputAuthorityResolverTest.java`, `ProductionResolverProgressIntegrationTest.java`

**Modified (by this work):**

- `service/ProductionNormalizedEventService.java` (resolver-backed input; skip non-resolvable)
- `service/ProductionBackfillDryRunService.java` (resolver-backed reconciliation + loss-ledger correction)
- `dto/dryrun/EntryReconciliation.java` (5 resolver fields)
- `test/.../service/ProductionNormalizedEventServiceTest.java` (resolver into constructor)
- `test/.../service/ProductionBackfillDryRunIntegrationTest.java` (resolver reconciliation test + import)
- `build.gradle` (test worker `maxHeapSize = '2g'` only)

**Off-limits confirmed untouched by this work (pre-existing dirty state left as-is):** `StockService`, `ProductionStockBoundary`, `StockBalanceRepository`, `stock_balance`, `stock_ledger`, `production_entry*` schema/entity/repos, `ProductionEntryValidationService`, `ProductionController`, `V4` migration, feature-flag/cutover behavior.

---

## 15. Residual Risks / Future Work (NOT in this scope)

- **`ProductionEntryValidationService` fallback** (`process ?? produced`, V-05/V-07) still uses the local fallback. Per DOCUMENT_31 §16 this is a future resolver refactor, approved separately; intentionally not touched here.
- **`ProductionController` reversal negation** (L453/L459) still writes `process`-only. The resolver now classifies reversal-of-B as QUARANTINE, preventing a silent `0`/wrong mirror; wiring the controller to the resolver's effective-input is a future `MODIFY` step.
- **Actual backfill execution** has NOT been built. `ProductionBackfillService` (DOCUMENT_31 §11) is out of scope.
- **Live runtime** (`flyway.enabled=false`) will materialize the two new tables via `ddl-auto=update` on next boot; no data is migrated, no backfill runs, and `PE/2026-27/00001` remains quarantined until an explicit, reviewed decision.

---

## 16. Stop Gate / Decision

**STOP.** The P3 architecture correction **foundation** is complete, verified green, and within the approved scope. **No actual backfill, no authority flip, no feature-flag/cutover change, no inventory post, and no P4** were performed. Awaiting the next-stage approval to proceed before any further implementation.

---

## 17. Change Log

- Created DOCUMENT_32 (implementation report): RC-1 shared resolver + projection/dry-run refactor + RC-2 progress/entry-outcome backbone + V5 additive migration + 19 new tests + full regression; corrected reversal classification; final verdict FOUNDATION GREEN, STOP for approval.
- Files: see §14. No off-limits file modified. No backfill executed.