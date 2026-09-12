# DOCUMENT_43 — P3.4 Backfill Operational Control Layer (Implementation Specification)

**Mode:** Formal implementation specification for the authorized narrow P3.4 scope.
**Status:** SPECIFICATION — READ-ONLY baseline/RBAC verification performed; implementation planned and to be executed per the authorized implementation order (STEP 5).
**Type:** P3.4 — NARROW BACKFILL OPERATIONAL CONTROL LAYER.

---

## 1. Document Control

| Field | Value |
|---|---|
| Phase | P3.4 — Narrow Backfill Operational Control Layer |
| Purpose | Authorize and specify an internal, role-gated REST invocation surface and controlled operational workflow over the committed P3.3 backfill engine. |
| Date | 2026-09-04 |
| Git baseline | Branch `main`, HEAD `db5abb296815f65f23e02431e14aafc8b0511103` |
| P3.3 dependency commit | `db5abb2` — `feat(production): add controlled P3.3 backfill infrastructure` |
| Scope classification | `NARROW P3.4` — controlled backfill operations ONLY. NOT DOCUMENT_18 P4. |

---

## 2. P3.4 Definition

> **P3.4 = Narrow Backfill Operational Control Layer.**

It is an internal, authorized, role-gated REST control surface that drives the **already-committed P3.3 backfill engine** through a controlled dry-run → review → execute/resume → progress/outcome → additive-rollback workflow.

**It is NOT DOCUMENT_18's wider "P4 — Normalized Operation Execution Engine."** That wider engine (online normalized execution, dual-write workflow, quantity-reconciliation engine, forward production execution engine, ProductionOrder/JobCard workflow integration, frontend refactor) remains OUT OF SCOPE and requires a separate future authorization.

---

## 3. Authorized Scope

1. Internal role-gated invocation surface (thin REST transport, no authoritative business logic).
2. Mandatory dry-run-before-write workflow.
3. Controlled execution workflow (`DRY_RUN`, `EXECUTE`, `RESUME`, `ROLLBACK`, `STATUS`).
4. Safe zero-eligible handling (deterministic no-write refusal).
5. Job status monitoring.
6. Resume support.
7. Additive-only rollback.
8. Audit actor propagation (server-side principal; never from request body).
9. Authorization tests.
10. Operational safety tests.

Implementation builds **only** on the committed P3.3 baseline (`db5abb2`) and uses **only** A-class (committed) / B-class (new additive P3.4) dependencies.

---

## 4. Explicit Exclusions (Prohibited)

- `production.normalized-ops.enabled` cutover.
- Inventory posting; stock ledger writes; stock balance writes.
- Material consumption; WIP accounting; finished goods posting.
- `ProductionStockBoundary` / `InventoryIntegrationService` integration.
- `ProductionOrderService` / `ProductionJobCardService` integration.
- Production frontend work.
- DOCUMENT_18 P4 implementation.
- BOM workflow; quality completion workflow.
- Manual resolution / modification / resolution-record/table/migration for `PE/2026-27/00001`.
- Modification of `production_entry`.
- Any V6 migration (without explicit authorization); modification of V4/V5.
- Absorbing pre-existing restructuring or Flyway configuration restructuring.
- Enabling `production.backfill.enabled` by default.
- Automatic / scheduler / startup execution.
- Real production backfill against live data.
- Git commit / push / merge / rebase / reset / restore / clean / stash during this phase.

---

## 5. Architecture

```text
Authenticated Operator
        |
        v
ProductionBackfillController        (thin REST transport; no authoritative business logic)
        |
        v
RBAC / Method Authorization         (ReadOnlyRbAC: CurrentUserRoles.hasAnyRole("ADMIN","BACKFILL_OPERATOR"),
                                     reject anonymous/unauthorized; actor from authenticated principal)
        |
        v
P3.4 Command / Validation Layer     (BuildBackfillRequest: operation, dryRun, jobId, confirmationToken,
                                     correlationId; validate operation, enforce dry-run-before-write,
                                     zero-eligible refusal policy; NEVER accept actor from body)
        |
        v
Committed P3.3 Backfill Services    (ProductionBackfillService, ProductionBackfillProgressService,
                                     ProductionInputAuthorityResolver, ProductionBackfillDryRunService)
        |
        +--------------------------+--------------------------+
        |                                                    |
        v                                                    v
Dry Run (read-only)                                       EXECUTE / RESUME
        |                                                    |
        +--------------------------+-------------------------+
                                   |
                                   v
                        Progress / Outcome
                        (prod_backfill_progress /
                         prod_backfill_entry_outcome)
                                   |
                                   v
                     Rollback if required (additive-only)
                     (ProductionBackfillService.rollback)
```

Dependency rule: every component in the control layer depends **only** on committed A-class P3.3 services and the committed RBAC security classes. No inventory/stock/production-order/job-card/restructuring dependency.

---

## 6. API Contract

Base namespace: `/api/v1/production/backfill` (committed controllers use `/api/v1/...`; kept internal and off any permit-all list).

| Operation | Method + Path | Body | Auth | Behavior |
|---|---|---|---|---|
| `DRY_RUN` | `POST /api/v1/production/backfill/dry-run` | `BackfillJobRequest{operation=DRY_RUN, jobId?}` | ADMIN / BACKFILL_OPERATOR | Classifies full scope read-only; returns decision set; writes nothing. Honors flag OFF (inert result). |
| `EXECUTE` | `POST /api/v1/production/backfill/execute` | `BackfillJobRequest{operation=EXECUTE, jobId, confirmationToken, dryRun=false}` | ADMIN / BACKFILL_OPERATOR | Requires dry-run performed + operator confirmation. If resolved Eligible=0 → deterministic `ZERO_ELIGIBLE_NO_WRITE` refusal (no writes). Otherwise calls committed execute. |
| `RESUME` | `POST /api/v1/production/backfill/resume` | `BackfillJobRequest{operation=RESUME, jobId, confirmationToken}` | ADMIN / BACKFILL_OPERATOR | Resumes a non-terminal job from `last_successful_entry_id`; requires dry-run + confirmation; zero-eligible refusal applies. |
| `ROLLBACK` | `POST /api/v1/production/backfill/{jobId}/rollback` | (jobId path) | ADMIN / BACKFILL_OPERATOR | Additive-only rollback via committed `rollback(jobId)`; deletes only backfill-created `prod_*` rows; never `production_entry`/stock. |
| `STATUS` | `GET /api/v1/production/backfill/{jobId}` | — | ADMIN / BACKFILL_OPERATOR | Returns job-level state via committed `stateOf(jobId)` + reconciliation status (read-only). |

**Request contract (conceptual `BackfillJobRequest`):**
```text
operation:          DRY_RUN | EXECUTE | RESUME | ROLLBACK | STATUS
jobId:              UUID string (server-generated if absent for DRY_RUN)
dryRun:             boolean (default true; EXECUTE/RESUME must carry false + confirmation)
confirmationToken:  string — explicit operator acknowledgement captured from a prior DRY_RUN result
                     (never a secret; not persisted durably; used to gate write ops)
correlationId:      string — caller idempotency key for the request
actor:              NEVER accepted from body — always derived from the authenticated server-side principal.
```

**Response contract:**
- `BackfillJobResponse{ operation, jobId, dryRun, executionGateOpen, status, reconciliation, decisions[], zeroEligible, reason }`
- Zero-eligible execution result explicitly signals a deterministic outcome (`ZERO_ELIGIBLE_NO_WRITE` or equivalent) with all invariants asserted.

No secrets are exposed. No public/anonymous path. No scheduler/startup trigger.

---

## 7. Authorization Model

| Role | Authorized? | Enforcement |
|---|---|---|
| `ADMIN` | Yes | Committed `RbacAspect`/`RbacService` admin bypass; `CurrentUserRoles.hasAnyRole("ADMIN","BACKFILL_OPERATOR")` includes it. Fully functional via committed seeders. |
| `BACKFILL_OPERATOR` | Yes (enforcement-level) | Added to the same check via `CurrentUserRoles.hasAnyRole(...)`. **Registration** (a `roles` table row + `user_roles` assignment) is a runtime/seed-data step using the committed in-app RBAC (`RbacController.createRole`) or committed seeders — NOT a schema migration, NOT a dependency on uncommitted restructuring. Not performed by P3.4 code. |
| Unauthorized (other roles) | No | Rejected with `AccessDeniedException`. |
| Anonymous / unauthenticated | No | Rejected (committed `anyRequest().authenticated()` + method-level check). |

- **Actor identity** is always the authenticated server-side `SecurityContextHolder` principal (`CurrentUserRoles.username()`, fallback `"system"`).
- **Actor impersonation prevention:** the request body never carries `actor`; the controller ignores any such field.
- **SecurityConfig is NOT modified**; the committed method-level RBAC is reused. The uncommitted restructuring hunk (actuator health path) is NOT absorbed.

---

## 8. Mandatory Safety Gates

1. **Flag OFF by default:** `production.backfill.enabled` remains `${PROD_BACKFILL_ENABLED:false}`; `ProductionBackfillService.backfill()` returns inert when OFF. `production.normalized-ops.enabled` untouched.
2. **Dry-run-before-write:** `EXECUTE`/`RESUME` require a prior `DRY_RUN` + operator `confirmationToken`; otherwise refused.
3. **Authenticated actor:** server-side principal only.
4. **Role authorization:** ADMIN / BACKFILL_OPERATOR only.
5. **Zero-eligible refusal:** if resolved Eligible=0, deterministic no-write refusal (`ZERO_ELIGIBLE_NO_WRITE`).
6. **No scheduler:** no `@Scheduled` triggers backfill (verified none exists).
7. **No startup trigger:** no `CommandLineRunner`/`ApplicationRunner`/`@PostConstruct` in the control layer; seeders are unrelated to backfill execution.
8. **Concurrency protection:** committed `@Version` optimistic lock on `prod_backfill_progress.claim`.
9. **Idempotency:** committed natural-key upsert (`entry_number`, `job_id+entry_number`) + terminal no-op.
10. **Rollback isolation:** committed additive-only rollback; never touches legacy/inventory/stock/orders.

---

## 9. State Model

Reuse the **committed P3.3 status vocabulary** (single, authoritative):
`NOT_STARTED, RUNNING, PAUSED, FAILED, COMPLETED, RECONCILIATION_FAILED, ROLLED_BACK` (from `ProductionBackfillProgressService`).

Per-entry outcomes (committed): `PROJECTED, ALREADY_PROJECTED, QUARANTINED, FAILED, SKIPPED, BLOCKED`.

No competing persistent state model is introduced. The control layer maps operations onto this vocabulary.

---

## 10. Zero-Eligible Behavior

Specified deterministic no-write behavior for an `EXECUTE`/`RESUME` whose resolved scan = **Eligible 0 / Quarantined 1**:
- Perform an explicit safe refusal/no-op with response outcome `ZERO_ELIGIBLE_NO_WRITE` (or equivalent).
- Guarantee: **no** normalized events, **no** `prod_execution_session`/`prod_operation_event`/`prod_output_event` writes, **no** `production_entry` modification, **no** inventory/stock modification, **no** quarantine resolution.
- Never execute writes merely to create a nominal empty backfill.
- Deterministic and testable (assert all write-table counts and `production_entry`/stock counts unchanged).

---

## 11. Rollback and Recovery

- **Additive-only rollback** via committed `ProductionBackfillService.rollback(jobId)`: deletes only the sessions the job `PROJECTED` (cascade op+output events) and marks the job `ROLLED_BACK`.
- **Never** modifies `production_entry`, inventory, `stock_balance`/`stock_ledger`, material, or production orders.
- Recovery scenarios (documented in P3.4 readiness): interrupted execution, partial execution (per-entry `REQUIRES_NEW` atomicity), restart/resume (`last_successful_entry_id`), concurrent attempts (`@Version`), duplicate execution (idempotent no-op), rollback eligibility, operator abort, audit evidence (`prod_backfill_progress` + `prod_backfill_entry_outcome`).
- No live rollback executed in this phase.

---

## 12. Dependency Boundary

| Dependency | Class | Notes |
|---|---|---|
| `ProductionBackfillService` | **A** | committed — reused |
| `ProductionBackfillEntryProcessor` | **A** | committed — reused |
| `ProductionBackfillEventWriter` | **A** | committed — reused |
| `ProductionBackfillProgressService` | **A** | committed — reused |
| `ProductionInputAuthorityResolver` | **A** | committed — reused |
| `ProductionBackfillProperties` | **A** | committed — reused (flag default false) |
| `ProductionBackfillDryRunService` | **A** | committed — reused |
| `ProdBackfillProgress` / `ProdBackfillEntryOutcome` + repos + V4/V5 | **A** | committed — reused |
| `CurrentUserRoles`, `RbacAspect`, `RequirePermission`, `JwtAuthFilter`, `RbacServiceBridge` | **A** | committed — reused (method-level RBAC) |
| `SecurityConfig` | **A** (committed, **do not modify**) | URL-level; unchanged |
| New control-layer controller + DTOs + validation + tests | **B** | new additive P3.4, depends only on A |
| `ProductionOrderController/Service`, `ProductionStockBoundary`, `InventoryIntegrationService`, `ProductionJobCardService` | **D → STOP** | broader uncommitted feature — prohibited |
| Inventory/stock/material/WIP/FG services | **E → STOP** | prohibited (invariant) |
| Any uncommitted restructuring (incl. Flyway/SecurityConfig hunk) | **C → STOP** | must not be absorbed |
| Frontend production code | **D → STOP** | prohibited |

Rule: P3.4 depends only on **A** and **B**. Any C/D/E = immediate STOP.

---

## 13. Exact File Boundary

**New allowed files (B):**
- `controller/ProductionBackfillController.java`
- `dto/backfill/BackfillJobRequest.java`, `dto/backfill/BackfillJobResponse.java` (additive DTOs)
- A thin command/validation component (e.g., `service/ProductionBackfillCommandService.java` or inline validation) — additive, depends only on A.
- New tests (`ProductionBackfillControllerIntegrationTest` etc.).
- `ProductionFRS/DOCUMENT_43_P3_4_Backfill_Operational_Control_Layer.md`.

**Files prohibited from modification:**
`ProductionBackfillService`, `ProductionBackfillEntryProcessor`, `ProductionBackfillEventWriter`, `ProductionBackfillProgressService`, `ProductionInputAuthorityResolver`, `ProductionBackfillProperties`, `ProdBackfillProgress`, `ProdBackfillEntryOutcome`, their repositories, all V4/V5 migrations, `SecurityConfig`, `application.yaml`, `application-prod.yaml`, `ProductionOrder*`, `ProductionStockBoundary`, `InventoryIntegrationService`, `ProductionJobCardService`, all frontend production code, all inventory/stock services, all RBAC committed files, all seeders.

Any modification requires a new explicit authorization.

---

## 14. Test Plan

Required new tests (implementation Step 7, authorized test scope only — no migrations, no real backfill on production):
1. ADMIN authorization.
2. BACKFILL_OPERATOR authorization (if safely registered at enforcement level).
3. Unauthorized-user rejection.
4. Anonymous rejection.
5. Actor server-side derivation.
6. Request actor impersonation prevention.
7. Dry-run mandatory enforcement (EXECUTE/RESUME without confirmation refused).
8. Flag OFF inertness.
9. Zero-eligible refusal (`ZERO_ELIGIBLE_NO_WRITE`).
10. No normalized writes on zero-eligible execution.
11. Concurrent invocation.
12. Duplicate invocation.
13. Failure/resume behavior.
14. Rollback isolation.
15. `production_entry` unchanged.
16. Inventory unchanged.
17. No scheduler invocation.
18. No startup invocation.

---

## 15. STOP Conditions

Immediate STOP if any of:
- Dependency classified C, D, or E is required.
- A migration (V6) or V4/V5 modification appears necessary.
- `production.backfill.enabled` default changes to true.
- Any flag is enabled.
- A scheduler/startup/`@PostConstruct` trigger is added to the control layer.
- Any `production_entry`/inventory/stock/material/WIP/FG write path is touched.
- Any quarantine resolution / record / migration for `PE/2026-27/00001`.
- Any DOCUMENT_18 P4 / normalized-cutover / FE / broader-production absorption.
- The uncommitted restructuring (Flyway/SecurityConfig hunk) is absorbed.
- Git commit/push/stage is attempted before the final verification report.

---

## 16. Implementation Order (authorized)

STEP 1 — Read-only baseline check (passed).
STEP 2 — RBAC architecture verification (passed).
STEP 3 — Create DOCUMENT_43 (this document).
STEP 4 — File-by-file implementation plan review (before writing code).
STEP 5 — Implementation (new controller/DTOs/validation/tests only; additive; no P3.3 refactor).
STEP 6 — Static safety review (no inventory/stock/order/job-card imports; no scheduler/startup; no flag/migration/SecurityConfig change).
STEP 7 — Run authorized test scope.
Final — Git boundary verification + complete implementation report; **STOP before staging/commit/push.**

---

## 17. Final Decision for This Phase

Proceed with implementation **only if** the implementation remains within:
```
Committed P3.3 dependencies (A)
+
New additive P3.4 components (B)
```
Any C/D/E introduction → immediate STOP and report.

**STOP GATE:** This specification does not itself execute backfill, run tests against live production data, run migrations, enable flags, modify inventory/stock/`production_entry`, resolve the quarantined record, or start DOCUMENT_18 P4. Await the completion of Steps 4–7 per the authorized implementation order.
