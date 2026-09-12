# DOCUMENT_41 — P3.3 Controlled Git Commit Readiness Plan

## 1. Document Control

| Field | Value |
|-------|-------|
| **Document** | DOCUMENT_41 — P3.3 Controlled Git Commit Readiness Plan |
| **Phase** | P3.3 CONTROLLED GIT COMMIT READINESS — ANALYSIS & VERIFICATION ONLY |
| **Type** | Read-only verification + future staging manifest (**NO commit authorized**) |
| **Execution date** | 2026-09-04 |
| **Repo / Branch / HEAD** | `zyger-erp-staging` / `main` / `fafaffc` |
| **Mode** | Read-only Git + source inspection; no Spring Boot; no DB writes; no migrations |
| **Predecessor** | DOCUMENT_40 (P3.3 Git Baseline and Closure Review) |

## 2. Objective

Prepare a precise, safe, self-contained, compile-complete P3.3-only Git commit boundary based on DOCUMENT_31–40, verified against the actual working tree (imports, references, dependencies, migrations, git status). Produce an exact future staging manifest for a **separately authorized** operator. Stage/commit nothing.

## 3. Scope

- Verify each candidate P3.3 file against the actual source.
- Confirm the six normalized-event entity/repository files are P3.3 infrastructure dependencies (not broader production-order logic).
- Classify every working-tree change; construct the exact P3.3 manifest.
- Verify mixed configuration (`application.yaml`) and config exclusions (`application-prod.yaml`, `application-staging.yaml`).
- Document the future staging sequence and pre-commit conditions.
- Update `ProductionFRS/DOCUMENT_41_..._Readiness_Plan.md` only.

## 4. Strict Safety Boundary

Forbidden this phase: `git add/commit/reset/checkout/restore/clean/stash/merge/rebase/cherry-pick/push/pull`; modifying source/config/migrations/database/Docker/frontend; enabling any flag; running backfill, dry-run, migrations, or Spring Boot against a live DB; any P3.4 work. **Only DOCUMENT_41 may be created/updated.**

## 5. Authoritative Inputs

DOCUMENT_31 … DOCUMENT_40 (all verified present). DOCUMENT_40 is the prior Git-boundary authority; this plan re-verifies and corrects its classification of the six normalized-event files based on working-tree evidence.

## 6. Current P3.3 Final State

P3.3 COMPLETE. PE/2026-27/00001 PERMANENTLY QUARANTINED (CATEGORY_B / INPUT-AUTHORITY-NULL / QUARANTINE / isResolvable=false). Eligible=0, Quarantined=1. No manual resolution, no backfill executed, no normalized events, inventory unchanged, flags OFF (`production.backfill.enabled=false`, `production.normalized-ops.enabled=false`). P3.4 not authorized.

## 7. Git Repository Baseline

- Clean index: **0 files staged** (verified this phase).
- All P3.3 candidates are untracked (`??`); none committed yet.
- Extensive pre-existing uncommitted restructuring present in the working tree (documented in §18).

## 8. Branch and HEAD Verification

- Branch: `main`
- HEAD: `fafaffc` — "fix: restructure project and fix build (Spring Boot 4 test deps, @Builder.Default warnings)"
- **HEAD unchanged from the DOCUMENT_40 baseline.**

## 9. Inspection Method

Read-only commands only: `git status/--short/diff/--stat/--name-status/log/ls-files`, `git ls-files --others --exclude-standard`, plus read-only grep over actual source. Classification based on **actual imports/dependencies/migrations/git status**, not assumptions.

## 10. Full Candidate File Classification

Classification codes: **A** P3.3 impl/infra · **B** P3.3 test · **C** P3.3 migration · **D** P3.3 doc · **E** mixed → partial staging · **F** pre-existing restructuring / exclude · **G** broader production feature / exclude · **H** unknown / separate review.

Verified file-by-file (exact working-tree paths under `zyger-erp-backend/` unless noted):

### A — CORE P3.3 IMPLEMENTATION (13)
`config/ProductionBackfillProperties.java`, `config/ProductionNormalizedOpsProperties.java`, `entity/ProdBackfillProgress.java`, `entity/ProdBackfillEntryOutcome.java`, `repo/ProdBackfillProgressRepository.java`, `repo/ProdBackfillEntryOutcomeRepository.java`, `service/ProductionBackfillService.java`, `service/ProductionBackfillEntryProcessor.java`, `service/ProductionBackfillEventWriter.java`, `service/ProductionBackfillDryRunService.java`, `service/ProductionBackfillProgressService.java`, `service/ProductionInputAuthorityResolver.java`, `service/ProductionNormalizedEventService.java`.

### A — P3.3 DTOs (17)
`dto/backfill/BackfillEntryDecision.java`, `dto/backfill/BackfillRunResult.java` (2); `dto/dryrun/DryRunDatasetCounts.java`, `dto/dryrun/DryRunFieldClassification.java`, `dto/dryrun/DryRunFieldMapping.java`, `dto/dryrun/DryRunFinding.java`, `dto/dryrun/DryRunFindingSeverity.java`, `dto/dryrun/DryRunPerformance.java`, `dto/dryrun/DryRunResult.java`, `dto/dryrun/EntryReconciliation.java`, `dto/dryrun/LevelReconciliation.java`, `dto/dryrun/ReversalValidation.java` (10); `dto/resolution/BackfillEligibility.java`, `dto/resolution/InputAuthority.java`, `dto/resolution/InputResolutionResult.java`, `dto/resolution/InputSemanticCategory.java`, `dto/resolution/ResolutionConfidence.java` (5). **Verified in git index as untracked P3.3-only** — unrelated DTO packages (`ActionRequest`, `PaginatedResponse`, `purchase`, `sales`) are **H/F** and excluded.

### A — P3.3 REQUIRED NORMALIZED-EVENT INFRASTRUCTURE (6) — CORRECTED
`entity/ProdExecutionSession.java`, `entity/ProdOperationEvent.java`, `entity/ProdOutputEvent.java`, `repo/ProdExecutionSessionRepository.java`, `repo/ProdOperationEventRepository.java`, `repo/ProdOutputEventRepository.java`. Classified **A** (see §Section on correction below).

### B — P3.3 TESTS (8)
`service/ProductionBackfillServiceIntegrationTest.java`, `service/ProductionBackfillDryRunIntegrationTest.java`, `service/ProductionBackfillRollbackAtomicityTest.java`, `service/ProductionBackfillFlagInertnessIntegrationTest.java`, `service/ProductionInputAuthorityResolverTest.java`, `service/ProductionNormalizedEventServiceTest.java`, `service/ProductionNormalizedEventProjectionIntegrationTest.java`, `controller/ProductionNormalizedEventControllerIntegrationTest.java`.

### C — P3.3 MIGRATIONS (2)
`db/migration/V4__prod_normalized_events.sql`, `db/migration/V5__prod_backfill_infrastructure.sql`.

### D — P3.3 DOCUMENTATION (10 + this = 11)
`ProductionFRS/DOCUMENT_31…40` (verified present) plus `DOCUMENT_41` created by this task.

### E — MIXED (1)
`resources/application.yaml` (P3.3 flag hunk + pre-existing flyway restructuring hunk).

### F — PRE-EXISTING RESTRUCTURING / EXCLUDE (many)
See §18.

### G — BROADER PRODUCTION FEATURE / EXCLUDE
`controller/ProductionOrderController.java`, `service/ProductionOrderService.java`, `service/ProductionStockBoundary.java`, `service/InventoryIntegrationService.java`, `service/ProductionJobCardService.java`; tests `ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `InventoryIntegrationServiceTest`, `DocNumberServiceProductionSeedTest`, `ProductionResolverProgressIntegrationTest`; production-order frontend (`hooks/useProduction.ts`, `services/production-api.ts`, `types/production/*`, `pages/production/order/*`).

### H — UNKNOWN / SEPARATE REVIEW
`favico11n.svg`; `ProductionFRS/BASELINE.md`, `CHANGELOG.md`, `DECISION_REGISTER.md`, `README.md` (production-FRS meta docs outside P3.3 range); `dto/ActionRequest`, `dto/PaginatedResponse`, `dto/purchase`, `dto/sales` (pre-existing DTO packages, not P3.3).

## 11. P3.3 Implementation Manifest

The 13 core files above (§10-A core). Verified source confirms their P3.3 role (backfill orchestrator, per-entry worker, natural-key writer, dry-run, progress/outcome, sole input resolver, normalized-event projection). No reference to excluded broader services (see §15).

## 12. P3.3 DTO Manifest

The 17 files above (§10-A DTO). All under `dto/backfill`, `dto/dryrun`, `dto/resolution`; verified present and P3.3-specific as classified.

## 13. P3.3 Test Manifest

The 8 files above (§10-B). Dependency note: `ProductionBackfillDryRunIntegrationTest` (lines ~348,356) and `ProductionBackfillFlagInertnessIntegrationTest` (lines ~33,82) contain the token `ProductionStockBoundary` — **investigated and confirmed these are negative security/isolation string-assertions** (they assert the token does NOT appear in backfill source), NOT import/compile dependencies. They do not require `ProductionStockBoundary` to be committed and do not cause exclusion.

## 14. P3.3 Migration Manifest

Exactly 2: `V4__prod_normalized_events.sql` (creates `prod_execution_session`, `prod_operation_event`, `prod_output_event`, `prod_backfill_progress`) and `V5__prod_backfill_infrastructure.sql` (creates `prod_backfill_progress` [idempotent], `prod_backfill_entry_outcome`). Verified via `grep CREATE TABLE`. **Exclude V1__baseline.sql, V2__numbering_config_production_seed.sql, V3__work_order_po_discriminator.sql (restructuring) and all legacy migration deletions.** No migration executed.

## 15. P3.3 Documentation Manifest

`ProductionFRS/DOCUMENT_31_P3_Architecture_Correction_Plan.md`, `...32...`, `...33...`, `...34_P3_3_Backfill_Engine_Implementation_Plan.md`, `...35_P3_3_Backfill_Engine_Implementation_Report.md`, `...36...`, `...37...`, `...38...`, `...39...`, `...40...`, and `...41...` (this). Total **11**. DOCUMENT_01–30 excluded (broader Production FRS series).

## 16. Mixed Configuration File Analysis

### 16.1 `application.yaml` — **E (MIXED, partial staging required)**

Actual diff has exactly **two** hunks:

**Hunk 1 (spring.flyway)** — `EXCLUDE (pre-existing restructuring)`:
```
-    enabled: true
-    locations: classpath:db/migration
-    baseline-on-start: true
-    baseline-version: 0
+    enabled: false
```
This changes Flyway to disabled — **restructuring**, unrelated to P3.3. Do **not** stage.

**Hunk 2 (production)** — **P3.3 INCLUDE**:
```
+production:
+  normalized-ops:
+    enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}
+  backfill:
+    enabled: ${PROD_BACKFILL_ENABLED:false}
```
Verified verbatim in the file. This is the P3.3 feature-flag gate. Stage only this hunk.

**Recommendation (NOT executed):**
```
git add -p zyger-erp-backend/src/main/resources/application.yaml
```
select hunk 2 (P3.3), leave hunk 1 unstaged. Absolute path: `zyger-erp-backend/src/main/resources/application.yaml`.

### 16.2 `application-prod.yaml` — **F / EXCLUDE**
Actual diff: only `management.health.mail.enabled=false` and `logging.level.root WARN→INFO` — general config, **no P3.3 lines** (no `production.backfill`/`normalized-ops` block). EXCLUDE.

### 16.3 `application-staging.yaml` — **F / EXCLUDE**
Untracked new file (staging profile: datasource, JPA, logging, management). **Does not contain the P3.3 `production:` flag block** (the `enabled:` matches are flyway/management/http). Pre-existing infrastructure. EXCLUDE.

## 17. Exact P3.3 Flag-Line Manifest

Only the following lines (from `application.yaml`, hunks to be partially staged):
```yaml
production:
  normalized-ops:
    enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}
  backfill:
    enabled: ${PROD_BACKFILL_ENABLED:false}
```
No P3.3 flag line exists in `application-prod.yaml` or `application-staging.yaml`.

## 18. Pre-existing Restructuring Exclusion Register

All tracked `M`/`D` and infra untracked files, none P3.3:
- Docker/container: `Dockerfile` (front/back), `.dockerignore` (front/back), `docker-compose.yml`, `docker-compose.staging.yml`, `nginx/*`, `nginx.conf`.
- Build: `build.gradle` (shadow→bootJar, `spring-boot-starter-flyway`), `vite.config.ts`, `tsconfig.*.json`, `package.json`.
- Migration re-baseline: deletion of legacy `V1__init.sql … V70__performance_indexes.sql`; new `V1__baseline.sql`, `V2__numbering_config_production_seed.sql`, `V3__work_order_po_discriminator.sql`.
- Config/env: `application-prod.yaml`, `application-staging.yaml`, `.env.staging.example`, `.gitignore`, `logback-spring.xml`, `STAGING_DEPLOYMENT.md`, `scripts/*`.
- Refactored existing Java: `GlobalExceptionHandler`, `MasterController`, `ProductionController`, `JobCard`, `JobCardSubjob`, `JobCardRepository`, `JobCardSubjobRepository`, `SecurityConfig`, `DocumentRowMapper`, `SpareRequestService`, `ScheduledJobs`.
- Test restructuring: `AbstractPostgresIntegrationTest`, `GlobalExceptionHandlerTest`, `AuthControllerIntegrationTest`, `SalesControllerIntegrationTest`.
- Frontend restructuring: `MainLayout`, `screenRegistry`, `AuthContext`, `LoginPage`, `JobCardScreen`, `ProductionEntryScreen`, `CompanyInfoScreen`, API/axios/rbac tests, favicon, etc.

## 19. Broader Production Feature Exclusion Register

- `ProductionOrderController`, `ProductionOrderService`, `ProductionStockBoundary`, `InventoryIntegrationService`, `ProductionJobCardService` (business workflow).
- Repos/controllers/services of the order workflow; tests `ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `InventoryIntegrationServiceTest`, `DocNumberServiceProductionSeedTest`, `ProductionResolverProgressIntegrationTest`.
- Production-order frontend: `hooks/useProduction.ts`, `services/production-api.ts`, `types/production/*`, `pages/production/order/*`.
- **Rationale:** these are business production-order workflow logic. Sharing normalized-event tables with P3.3 is functional adjacency, **not** P3.3 membership. Verified: **no P3.3 implementation/test file imports any of these excluded service/controller classes** (grep confirmed "NONE depend on excluded broader classes").

## 20. Normalized-Event Infrastructure Correction (§ C of mandate, verified)

All **five** conditions verified TRUE against the working tree:
1. **Directly imported/required by P3.3 services** — `ProductionBackfillEntitiesWriter`/`ProductionBackfillEventWriter` imports `entity.ProdExecutionSession/ProdOperationEvent/ProdOutputEvent` and the three repos; `ProductionBackfillService`, `ProductionBackfillEntryProcessor`, `ProductionNormalizedEventService` also inject/import these repos. Confirmed by grep.
2. **Coherent compile requires them** — removing them breaks compilation of `ProductionBackfillEventWriter`, `ProductionBackfillService`, `ProductionBackfillEntryProcessor`, `ProductionNormalizedEventService`. Verified references.
3. **DB mappings to V4 tables** — `@Table(name=...)` of the three entities = `prod_execution_session`, `prod_operation_event`, `prod_output_event`, all created by the P3.3 `V4__prod_normalized_events.sql`. Verified.
4. **Including them does not pull broader services** — the 3 entities + 3 repos import **none** of `ProductionOrderService/ProductionStockBoundary/InventoryIntegrationService/ProductionJobCardService/ProductionOrderController`. Verified grep (none).
5. **Infrastructure, not business workflow** — they are entity/repository mappings to the normalized-projection tables (the P3.3 write target), not order-workflow business logic.

→ **CLASSIFIED A — P3.3 REQUIRED INFRASTRUCTURE DEPENDENCY. MUST be included.** This corrects DOCUMENT_40 §15/§24 where they were listed under "broader production feature to exclude." DOCUMENT_35 §5's architecture diagram shows the writer "natural-key upsert: session/op/outputs" confirming they are P3.3 write targets.

## 21. Proposed Future Staging Sequence

**DO NOT EXECUTE IN THIS PHASE — FUTURE AUTHORIZED OPERATOR ONLY**

- STEP 1 — `git rev-parse --abbrev-ref HEAD` and `git log --oneline -1` → expect `main` / `fafaffc` (unchanged).
- STEP 2 — `git diff --cached --name-only` → must be empty.
- STEP 3 — Stage the exact **13** core impl files (path list §11).
- STEP 4 — Stage the exact **17** DTO files (§12).
- STEP 5 — Stage the exact **6** normalized-event infra files (§20).
- STEP 6 — Stage the exact **8** P3.3 tests (§13).
- STEP 7 — Stage `V4__prod_normalized_events.sql` and `V5__prod_backfill_infrastructure.sql` **only** (§14).
- STEP 8 — `git add -p zyger-erp-backend/src/main/resources/application.yaml` → select the **production** hunk (P3.3), skip the **flyway** hunk (§16.1).
- STEP 9 — Stage `ProductionFRS/DOCUMENT_31 … DOCUMENT_41` **only** (§15).
- STEP 10 — `git diff --cached --name-status` (review).
- STEP 11 — `git diff --cached` (full content review).
- STEP 12 — Verify every staged file is on the manifest (57 + partial config).
- STEP 13 — Verify **no excluded file** is staged (§18/§19/§H).
- STEP 14 — Verify `application.yaml` cached hunk is only the P3.3 block.
- STEP 15 — **Only after separate explicit authorization**, commit.

## 22. Pre-Staging Verification Checklist

- [ ] HEAD = `fafaffc`, branch `main`.
- [ ] Index empty (`git diff --cached --name-only` = 0 lines).
- [ ] All 57 primary manifest files exist on disk.
- [ ] No P3.3 candidate references excluded broader services.
- [ ] application.yaml contains the verbatim P3.3 block.
- [ ] No migration has been executed.

## 23. Post-Staging / Pre-Commit Verification Checklist

- [ ] `git diff --cached --name-status` — file set exactly equals manifest (57 + config hunk).
- [ ] `git diff --cached` — content correct; no excluded file present.
- [ ] No legacy `V1…V70` migration, no `V1–V3`, `application-prod.yaml`, `application-staging.yaml`, Docker/nginx/scripts/build/frontend, or production-order files staged.
- [ ] `application.yaml` staged hunk contains only `production:` P3.3 block.
- [ ] P3.3 flags still default false.

## 24. Proposed Commit Message

```
feat(production): add controlled P3.3 backfill infrastructure
```
Optional body: normalizes execution/operation/output events, resolves input authority exclusively through ProductionInputAuthorityResolver, gates projection via production.backfill.enabled (default OFF), exposes no public endpoint, schedules nothing, touches no inventory and no legacy production_entry; PE/2026-27/00001 remains quarantined with no eligible records.

> **PROPOSED COMMIT MESSAGE** ≠ **COMMIT AUTHORIZATION.** This phase does not authorize any commit.

## 25. Proposed Commit Scope Summary

**Primary manifest: 57 files** = 13 core implementation + 17 DTOs + 6 normalized-event infrastructure + 8 tests + 2 migrations + 11 documentation — plus the **isolated P3.3 flag hunk** in `application.yaml`. This is the entire P3.3 commit boundary.

## 26. Commit Authorization Preconditions

An actual commit requires **ALL**:
1. Explicit user authorization.
2. Final cached-diff review (STEP 11).
3. No excluded file staged.
4. No unknown file staged.
5. `application.yaml` partial staging verified (STEP 14).
6. All 57 primary manifest files accounted for.
7. No safety-invariant regression.
8. P3.3 flags remain `false`.
9. No P3.4 work included.

## 27. Regression Evidence Applicability

- Authoritative register: **256 tests / 0 failures / 0 errors** (Phase C/D).
- No P3.3 source file changed since that point (all untracked-new, unchanged; verified timestamps).
- Excluded broader/restructuring files predate the regression run and are outside P3.3.
- No source change invalidates the 256/0/0 evidence. **Not rerun** (preserve authoritative evidence; no execution in this phase).

## 28. Safety Invariant Verification

1. `production.backfill.enabled` defaults **false** (`${PROD_BACKFILL_ENABLED:false}`) — verified.
2. `production.normalized-ops.enabled` defaults **false** (`${PROD_NORMALIZED_OPS_ENABLED:false}`) — verified.
3. No public controller triggers backfill — grep of all controllers: none reference backfill/dryRun.
4. No scheduler triggers backfill — `ScheduledJobs.java`: no backfill reference.
5. P3.3 engine does **not** invoke `StockService`, `StockBalanceRepository`, `InventoryIntegrationService`, `ProductionStockBoundary` — verified (no such injections/imports; only negative-scan string literals in tests).
6. P3.3 does **not** modify legacy `production_entry` — `ProductionEntryRepository` used read-only ("NEVER modifies production_entry"); engine writes only `prod_*` tables.
7. P3.3 writes restricted to intended `prod_*` infra — `prod_execution_session/operation_event/output_event/backfill_progress/backfill_entry_outcome` only.
8. No source change invalidates 256/0/0.
9. No backfill executed.
10. No flags enabled.

## 29. Risk Assessment

| # | Risk | Assessment |
|---|------|------------|
| R1 | application.yaml mixed file could stage flyway hunk | Mitigate with `git add -p` hunk selection + STEP 14 verification. |
| R2 | Excluded broader/normalized error if boundary misread | Resolved: normalized-event infra proven required (A); business services proven excluded (G). |
| R3 | Negative-scan tokens misinterpreted as deps | Documented: string-literal asserts only; not compile deps. |
| R4 | Migrations V1–V3 accidentally swept in | Explicit exclusion §14/§18. |
| R5 | Fusion with restructuring/frontend | Exclusion registers §18/§19 enforced at STEP 13. |
| R6 | Committing without authorization | Not authorized here; §26 + STOP gate. |

## 30. Final Readiness Decision

Because `application.yaml` remains a **mixed tracked file requiring partial staging** and final cached-diff verification, the decision is:

**B — READY WITH REQUIRED FILE-BOUNDARY REVIEW**

## 31. Explicit STOP Gate

**STOP after this document.** Do not `git add`, `git commit`, or run any mutating git command. Do not modify source/config/migrations/database. Do not enable flags, run backfill/dry-run/migrations, or start P3.4. Await explicit authorization for the commit.

## 32. Change Log

- Verified HEAD `fafaffc` on `main`, empty index; confirmed DOCUMENT_31–40 present.
- Verified the 13 core P3.3 implementation files, 17 DTOs, 8 tests, 2 migrations (V4/V5) against actual paths.
- Verified the six normalized-event entity/repository files satisfy all five infrastructure-dependency conditions (imports, compile necessity, V4 mapping, no broader-service coupling, infra-not-workflow) → classified A (correcting DOCUMENT_40's §15/§24 listing).
- Verified the two config-file exclusions (`application-prod.yaml`, `application-staging.yaml`) contain no P3.3 content; confirmed `application.yaml` is E (two hunks: P3.3 `production:` block INCLUDE; flyway restructure EXCLUDE).
- Verified all safety invariants; confirmed 256/0/0 regression evidence unaffected.
- Constructed the exact 57-file primary manifest + isolated config hunk and the future 15-step staging sequence for a separately authorized operator.
- **Final decision: B — READY WITH REQUIRED FILE-BOUNDARY REVIEW.** No staging/commit performed. **STOP.**

---

## Mandatory Final Statement

The P3.3 commit boundary is coherent and compile-complete after inclusion of the six normalized-event entity/repository dependencies. However, `application.yaml` remains a mixed tracked file requiring partial staging and final cached-diff verification. Therefore the repository is **READY WITH REQUIRED FILE-BOUNDARY REVIEW**, not automatically authorized for commit execution.
