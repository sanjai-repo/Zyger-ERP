# DOCUMENT_42 — P3.3 Controlled Git Staging Boundary Verification

## 1. Document Control

| Field | Value |
|-------|-------|
| **Document** | DOCUMENT_42 — P3.3 Controlled Git Staging Boundary Verification |
| **Phase** | P3.3 CONTROLLED GIT STAGING BOUNDARY VERIFICATION (READ-ONLY FINAL) |
| **Type** | Read-only final commit-boundary verification; **NOT a commit/stage phase** |
| **Execution date** | 2026-09-04 |
| **Repo / Branch / HEAD** | `zyger-erp-staging` / `main` / `fafaffc7b00a63e793adcc0165f28dd0c7070317` |
| **Mode** | Read-only Git + source inspection; no Spring Boot; no DB writes; no migrations |
| **Predecessor** | DOCUMENT_41 (P3.3 Controlled Git Commit Readiness Plan) |

## 2. Objective

Perform the final evidence-based verification that the P3.3 commit manifest defined in DOCUMENT_41 is internally coherent, compile-complete, isolated from unrelated working-tree changes, and ready for a future explicitly authorized staging operation. Stage/commit nothing.

## 3. Scope

- Verify branch/HEAD unchanged and index empty.
- Verify all 57 primary manifest files exist and belong to the P3.3 dependency boundary.
- Final compile-dependency review (no excluded business/restructuring dependency).
- Re-verify the six normalized-event infrastructure files (all five conditions).
- Verify migration boundary = exactly V4/V5; documentation boundary = DOCUMENT_31–42.
- Verify `application.yaml` is the only mixed file; confirm independent stageability of the P3.3 flag block; confirm Flyway hunk exclusion.
- Verify exclusions; re-verify safety invariants.
- Produce the exact future staging manifest and readiness decision.

## 4. Strict Non-Actions

Forbidden: `git add/commit/reset/checkout/restore/clean/stash/merge/rebase/cherry-pick/push/pull`; modifying Java/frontend/config/migrations/database/Docker/nginx/scripts/tests; enabling flags; running backfill/dry-run/migrations/Spring Boot; manually resolving PE/2026-27/00001; modifying inventory/production_entry; starting P3.4; refactoring/improving code. **Only DOCUMENT_42 created/updated.**

## 5. Authoritative Inputs

DOCUMENT_31 … DOCUMENT_41 (all verified present). DOCUMENT_41 defines the boundary (57 primary files + 1 mixed `application.yaml` + partial staging of the P3.3 flag block + normalized-event infrastructure correction + exclusions + decision B). DOCUMENT_42 verifies that decision against the actual working tree.

## 6. Current P3.3 Final State

P3.3 COMPLETE. PE/2026-27/00001 PERMANENTLY QUARANTINED (CATEGORY_B / INPUT-AUTHORITY-NULL / QUARANTINE / isResolvable=false). Eligible=0, Quarantined=1. No manual resolution, no backfill executed, no normalized events, inventory unchanged, flags OFF, P3.4 not authorized.

## 7. Git Baseline Verification

Observed working-tree numbers (untouched): Modified (M)=43, Deleted (D)=70, Untracked (??)=57; `git diff --stat` = "113 files changed, 464 insertions(+), 6335 deletions(-)" — all pre-existing restructuring baseline (unchanged from DOCUMENT_40/41). The 113-file diff reflects the broad repo restructuring committed/working state preceding P3.3.

## 8. Branch and HEAD

- Branch: `main`
- HEAD: `fafaffc7b00a63e793adcc0165f28dd0c7070317` (short `fafaffc`); message "fix: restructure project and fix build (Spring Boot 4 test deps, @Builder.Default warnings)"
- **Head unchanged from DOCUMENT_40/41 baseline.** No deviation → no STOP required under Step 1.

## 9. Index Status

- Staged files: **0** (index empty, `git diff --cached --name-only` = 0).
- No repair performed.

## 10. Manifest Count Verification

Verified existence of all primary manifest files (pre-DOCUMENT_42):

| Category | Count | Existence |
|----------|-------|-----------|
| A. Core implementation | 13 | all present |
| B. DTOs | 17 | all present |
| C. Normalized-event infrastructure | 6 | all present |
| D. Tests | 8 | all present |
| E. Migrations | 2 | all present |
| F. Documentation | 11 (31–41) | all present |
| **Total primary** | **57** | **0 missing** |

After creation of DOCUMENT_42: documentation = 12, **total = 58**.

## 11. Core Implementation Boundary

13 files, all verified present and P3.3-specific (see DOCUMENT_41 §10/§11). In-package imports are satisfied exclusively by manifest classes + tracked baseline (`ProductionEntry`, `ProductionEntryRepository`) — no excluded dependency.

## 12. DTO Boundary

17 files under `dto/backfill`, `dto/dryrun`, `dto/resolution`, verified present and P3.3-specific. Unrelated DTO packages (`ActionRequest`, `PaginatedResponse`, `purchase`, `sales`) excluded.

## 13. Normalized-Event Infrastructure Verification

All **five** conditions re-verified against the working tree:
1. **Direct dependency** — `ProductionBackfillEntryProcessor`, `ProductionBackfillEventWriter`, `ProductionBackfillService`, `ProductionNormalizedEventService` import the three entities + three repos.
2. **Compilation requires them** — removing them breaks those four P3.3 services.
3. **Map to V4 tables** — `@Table` (`prod_execution_session`, `prod_operation_event`, `prod_output_event`) all created by `V4__prod_normalized_events.sql`.
4. **No excluded business import** — the six files import none of `ProductionOrderService/ProductionStockBoundary/InventoryIntegrationService/ProductionJobCardService/ProductionOrderController`.
5. **Infrastructure, not workflow** — entity/repo projections to the normalized write targets.

**Decision: A — REQUIRED P3.3 INFRASTRUCTURE.** Include in the future commit. (Corrects DOCUMENT_40's §15/§24 placement; refs DOCUMENT_35 §5 "natural-key upsert: session/op/outputs".)

## 14. Test Boundary

8 tests, verified present. References to `ProductionStockBoundary` in `ProductionBackfillDryRunIntegrationTest` (lines ~348,356) and `ProductionBackfillFlagInertnessIntegrationTest` (lines ~33,82) are **negative security/isolation string-assertions**, not import/compile dependencies — do not cause exclusion.

## 15. Migration Boundary

Exactly V4 and V5 belong to P3.3:
- `V4__prod_normalized_events.sql` creates `prod_execution_session`, `prod_operation_event`, `prod_output_event`, `prod_backfill_progress`.
- `V5__prod_backfill_infrastructure.sql` creates `prod_backfill_progress`, `prod_backfill_entry_outcome`.
- Unrelated untracked migrations present (`V1__baseline.sql`, `V2__numbering_config_production_seed.sql`, `V3__work_order_po_discriminator.sql`) are **restructuring** — excluded. P3.3 core services have **no reference** to V1–V3 tables/features.
- Legacy V1…V70 deletion diffs — excluded. No migration executed.

## 16. Documentation Boundary

`ProductionFRS/DOCUMENT_31 … DOCUMENT_41` (11) pre-DOCUMENT_42, plus `DOCUMENT_42` (this) = **12** after creation. DOCUMENT_01–30 excluded (broader Production FRS series).

## 17. application.yaml Partial-Staging Verification

Working-tree diff splits into exactly **two non-overlapping hunks**:

**HUNK 1 — EXCLUDE (pre-existing restructuring):**
```yaml
spring:
  flyway:
-    enabled: true
-    locations: classpath:db/migration
-    baseline-on-start: true
-    baseline-version: 0
+    enabled: false
```

**HUNK 2 — INCLUDE (P3.3):**
```yaml
production:
  normalized-ops:
    enabled: ${PROD_NORMALIZED_OPS_ENABLED:false}
  backfill:
    enabled: ${PROD_BACKFILL_ENABLED:false}
```

Confirmations:
1. Both flags default **false** (verified verbatim).
2. The `production:` block is an independent, stageable hunk (line region +79,11, separate from Flyway hunk @ -32,10).
3. The Flyway restructuring hunk is separate and remains excluded.
4. `git add -p zyger-erp-backend/src/main/resources/application.yaml` can isolate hunk 2 (documented; **not executed**).
5. **No** P3.3 config required from `application-prod.yaml`.
6. **No** P3.3 config required from `application-staging.yaml`.

**application.yaml = the only mixed file (E).**

## 18. application-prod.yaml / application-staging.yaml Exclusion

- `application-prod.yaml` (tracked M): diff contains only `management.health.mail.enabled=false` + `logging.level.root INFO` — **no P3.3 content**. EXCLUDE.
- `application-staging.yaml` (untracked): staging profile (datasource/JPA/flyway/logging); **no `production:` P3.3 block** (matched `enabled:` lines are flyway/management/http). EXCLUDE.
- Evidence: P3.3 flag lines exist only in `application.yaml`. No P3.3 edit needed in either file.

## 19. Pre-existing Restructuring Exclusion

All excluded (unchanged from DOCUMENT_41 §18): Docker files/compose/nginx, `scripts/*`, `build.gradle` and frontend build restructure, V1–V3 migrations + legacy V1…V70 deletion diffs, `application-prod.yaml/staging` (as above), `.env`, `.gitignore`, `logback`, `STAGING_DEPLOYMENT.md`, refactored existing Java (`GlobalExceptionHandler`, `MasterController`, `ProductionController`, `JobCard*`, `SecurityConfig`, `DocumentRowMapper`, `SpareRequestService`, `ScheduledJobs`), restructured tests (`AbstractPostgresIntegrationTest`, etc.), frontend restructuring. **None required by P3.3** (verified: P3.3 sources/tests import none of these).

## 20. Broader Production Feature Exclusion

`ProductionOrderController`, `ProductionOrderService`, `ProductionStockBoundary`, `InventoryIntegrationService`, `ProductionJobCardService`; their repos/controllers/tests (`ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `InventoryIntegrationServiceTest`, `DocNumberServiceProductionSeedTest`, `ProductionResolverProgressIntegrationTest`); production frontend (`useProduction.ts`, `production-api.ts`, `types/production/*`, `pages/production/order/*`). **Verified: no P3.3 boundary file imports any of these.** Functional adjacency on normalized tables is not P3.3 membership.

## 21. Unknown File Boundary

`favico11n.svg`; `ProductionFRS/BASELINE.md`, `CHANGELOG.md`, `DECISION_REGISTER.md`, `README.md`; unrelated DTO packages (`ActionRequest`, `PaginatedResponse`, `purchase`, `sales`). Separate review; none required for P3.3.

## 22. Compile-Dependency Boundary Result

In-package imports of every included P3.3 file resolve to: (a) P3.3 manifest classes, (b) tracked baseline `entity.ProductionEntry` + `repo.ProductionEntryRepository` (read-only scan target; committed, not untracked), (c) standard Java/Jakarta/Spring/Hibernate. **No reference to excluded business services, restructuring classes, or production-order frontend.** `ProductionStockBoundary`/`StockService`/`StockBalanceRepository` occurrences are comment text only.

**Result: coherent, self-contained, compile-complete within the manifest + tracked baseline.**

## 23. Safety Invariant Verification

1. `production.backfill.enabled` → default **false** ✓
2. `production.normalized-ops.enabled` → default **false** ✓
3. No controller exposes backfill execution ✓ (no controller references backfill/dryRun)
4. No scheduler invokes backfill ✓ (`ScheduledJobs` clean)
5. Backfill does **not** invoke `StockService`/`StockBalanceRepository`/`InventoryIntegrationService`/`ProductionStockBoundary` ✓ (no injections/imports; comment-only)
6. Backfill does **not** modify `production_entry` ✓ (`ProductionEntryRepository` read-only: "NEVER modifies production_entry")
7. P3.3 writes only to `prod_*` targets ✓ (`prod_execution_session`, `prod_operation_event`, `prod_output_event`, `prod_backfill_progress`, `prod_backfill_entry_outcome` via respective repos)
8. No P3.3 source change invalidates prior 256/0/0 regression evidence ✓
9. No backfill executed ✓
10. No normalized event manually created by this phase ✓ (read-only)
11. No P3.4 work exists in scope ✓

## 24. Regression Evidence Applicability

Authoritative register **256 tests / 0 failures / 0 errors** (Phase C/D) remains applicable: all P3.3 source files are untracked-new and unchanged since that point; excluded restructuring/broader files predate it and are outside the P3.3 boundary. Not rerun (preserve authoritative evidence; no execution in this phase).

## 25. Exact Future Staging Manifest

**INCLUDE (58 files after DOCUMENT_42):**
- Core implementation (13) — list per §11 / DOCUMENT_41 §11.
- DTOs (17) — per §12 / DOCUMENT_41 §12.
- Normalized-event infrastructure (6) — per §13.
- Tests (8) — per §14.
- Migrations (2): `V4__prod_normalized_events.sql`, `V5__prod_backfill_infrastructure.sql`.
- Documentation (12): `DOCUMENT_31` … `DOCUMENT_42`.
- Plus the **isolated `production:` flag hunk** from `application.yaml` (partial staging only).

**EXCLUDE:**
- Flyway restructuring hunk of `application.yaml`.
- `application-prod.yaml`, `application-staging.yaml`.
- V1–V3 migrations; legacy V1…V70 deletion diffs.
- Docker/compose/nginx/scripts/build/frontend restructuring.
- Broader production-order feature + tests + frontend.
- Unknown/unrelated files (§21).

## 26. Explicit Exclusion Manifest

File-by-file exclusion set equals §19 + §20 + §21 above; identical to DOCUMENT_41 §18/§19/§21. Verified none is a compile dependency of the P3.3 boundary.

## 27. Risk Assessment

| # | Risk | Assessment |
|---|------|------------|
| R1 | application.yaml partial-staging error (Flyway hunk staged) | Mitigate via `git add -p` hunk 2 only + pre-commit hunk review (§17). |
| R2 | V1–V3 swept into P3.3 migration set | Explicitly excluded (§15/§19). |
| R3 | Broader production feature conflated with P3.3 | Excluded (§20); no dependency (§22). |
| R4 | Negative-scan tokens misread as deps | Documented as string-assertions only (§14). |
| R5 | Future commit without authorization | Not authorized here (§4/§29/§30). |

## 28. Final Readiness Decision

All conditions for **A** are met: HEAD unchanged (`fafaffc`), index empty, all manifest files present, dependency boundary coherent, six normalized-event files confirmed required, V4/V5 sufficient, `application.yaml` production hunk independently isolatable, no excluded file required, safety invariants intact.

**Decision: A — READY FOR CONTROLLED STAGING** (for a future, separately authorized operator; staging/commit is **not** authorized in this phase).

Note: This supersedes DOCUMENT_41's "B" only in that the partial-staging mechanics for `application.yaml` are now fully verified as cleanly isolatable (two non-overlapping hunks); the actual staging/commit still requires explicit authorization.

## 29. Future Authorization Boundary

A future operator may stage/commit **only** after explicit authorization and after executing the DOCUMENT_41 §21 staging sequence + DOCUMENT_42 §25 include/exclude manifest + the DOCUMENT_42 pre-commit checks (empty index, exact cached-diff review, no excluded/unknown file staged, application.yaml hunk isolation verified, all 58 manifest files accounted for, flags still false, no P3.4).

## 30. Mandatory STOP Gate

**STOP after creating DOCUMENT_42.** Do not stage. Do not commit. Do not modify source/config/migrations/database. Do not run migrations, enable flags, run backfill/dry-run, resolve the quarantined record, modify inventory/production_entry, or start P3.4. Await explicit authorization.

## 31. Change Log

- Verified git baseline: branch `main`, HEAD `fafaffc7b00…` (unchanged), index empty (0 staged), M=43/D=70/??=57, diff stat 113 files (pre-existing restructuring).
- Verified all 57 primary manifest files present (0 missing): 13 core + 17 DTOs + 6 normalized-event infra + 8 tests + 2 migrations + 11 docs.
- Final compile-dependency review: P3.3 in-package imports resolve to manifest classes + tracked baseline `ProductionEntry`/`ProductionEntryRepository`; **no** excluded business/restructuring/frontend dependency.
- Re-verified six normalized-event files satisfy all five conditions → **A — REQUIRED P3.3 INFRASTRUCTURE**.
- Verified migration boundary = V4/V5 only (V1–V3 excluded, no dependency); documentation boundary DOCUMENT_31–42.
- Verified `application.yaml` = the only mixed file; P3.3 `production:` flag hunk independently isolatable, both flags default false; Flyway hunk excluded; no P3.3 config in prod/staging files.
- Re-verified all safety invariants and 256/0/0 regression applicability.
- Final decision **A — READY FOR CONTROLLED STAGING**; future authorization boundary + STOP gate issued. **No staging/commit performed.**

## 32. Final Summary

- Branch/HEAD: `main` / `fafaffc` (unchanged); index **EMPTY**.
- Manifest count: **57 primary files** (13 impl + 17 DTO + 6 infra + 8 tests + 2 migrations + 11 docs), plus the isolated `application.yaml` P3.3 flag hunk; **58 after DOCUMENT_42**.
- Included boundary: the 57/58 manifest files + production flag hunk.
- Excluded boundary: Flyway hunk, application-prod.yaml/staging.yaml, V1–V3, legacy deletions, Docker/nginx/scripts/build/frontend restructuring, broader production-order feature + tests + frontend, unknown/unrelated files.
- `application.yaml` partial staging: **confirmed isolatable** (P3.3 block = independent hunk, flags default false).
- Normalized-event dependency decision: **A — REQUIRED P3.3 INFRASTRUCTURE** (all 5 conditions met).
- Final readiness result: **A — READY FOR CONTROLLED STAGING** (future, separately authorized).
- Explicit STOP: confirmed — no staging/commit/source/config/DB change made in this phase.
