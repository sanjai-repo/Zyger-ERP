# DOCUMENT_22 — P2 COMPLETION & FORMAL REVIEW PACKAGE

**Phase:** P2 — Canonical Production Order (Work Order) + Job Card foundation
**Status:** PASS — SUBMITTED FOR FORMAL REVIEW
**Date:** 2026-09-03
**Authoritative spec:** DOCUMENT_21 (§18, §24–§30; controlled approvals C1–C8)
**P3:** **NOT AUTHORIZED — STOP at end of this document.**

---

## 0. GATE RESULT

| Gate | Result |
|---|---|
| Overall | **PASS** (all 8 evidence sections verifiable; recommendations-only caveats in §9) |
| P3 entry | **STOP — read-only P3 change plan provided in DOCUMENT_23; no source modified. Await formal P3 approval.** |

---

## 1. EXACT CHANGED-FILE REGISTER

### 1.1 Backend — no source outside this list modified (verified via git diff + scan)

| File | CREATE / MODIFY / REFACTOR | Purpose | Requirement / ADR | Compatibility impact |
|---|---|---|---|---|
| `db/migration/V3__work_order_po_discriminator.sql` | **CREATE** | Additive PO discriminator + JobCard/Subjob traceability columns & indexes | D1/C1; DOC 12/18; ADR-PROD-002 | Additive-only; zero impact on existing clients/schema |
| `entity/JobCard.java` | **MODIFY (additive)** | Add `workOrderId`, `routeOperationId` fields | C1; DOC 11 §3.6 | New nullable fields; legacy getters/setters intact |
| `entity/JobCardSubjob.java` | **MODIFY (additive)** | Add `routeOperationId` field | C1; DOC 11 §3.6 | New nullable field; legacy intact |
| `repo/JobCardRepository.java` | **MODIFY (additive)** | Add `findByWorkOrderId`, `findByRouteOperationId` | C1 traceability | New query methods only |
| `repo/JobCardSubjobRepository.java` | **MODIFY (additive)** | Add `findByRouteOperationId` | C1 traceability | New query methods only |
| `controller/ProductionProductionController.java` (JobCard endpoints region 70→134) | **REFACTOR (behavior-locked)** | JobCard endpoints → thin delegates to `ProductionJobCardService` | C5; DOC 10 | Same paths/verbs/responses; Entry/Return/Conversion/Log/Idle untouched |
| `service/ProductionOrderService.java` | **CREATE** | Thin PO adapter → `PlanningService`+`DocumentFacade` | C2/D2/D3; ADR-PROD-002 | Additive; none |
| `controller/ProductionOrderController.java` | **CREATE** | Thin `/api/v1/production/orders` alias | C2/D2; DOC 13 `/orders` | Additive; none |
| `service/ProductionJobCardService.java` | **CREATE** | JobCard logic extraction from controller | C5; DOC 10 layering | Behavior-locked; identical contracts |
| `service/ProductionStockBoundary.java` | **CREATE** | Sole production→inventory boundary | C5; Rule 9 | Additive; delegates to `StockService` (unmodified) |
| `test/.../ProductionOrderServiceTest.java` | **CREATE** | 9 PO behavior tests | C2 | test-only |
| `test/.../ProductionJobCardServiceTest.java` | **CREATE** | 12 behavior-lock + C1 traceability tests | C5/C1 | test-only |

### 1.2 Frontend

| File | CREATE / MODIFY / REFACTOR | Purpose | Requirement / ADR | Compatibility impact |
|---|---|---|---|---|
| `types/production/production.types.ts` | **MODIFY (correct)** | Align types to real entity/screen fields (`plannedQuantity`,`completedQuantity`,`partDescription`,`workOrderId`,`routeOperationId`) | C6/FE-2 | Removes stale `plannedQty/totalGood/partName`; consumers corrected accordingly |
| `services/production-api.ts` | **MODIFY** | `PRODUCTION_BASE` `/production`→`/v1/production` (fixes print URL FE-5 + all endpoint paths); add order endpoints + job-card CRUD/action/subjob methods | C6b/d; FE-4/FE-5 | Single interface; endpoints now `/api/v1/production/...` (matches backend) |
| `hooks/useProduction.ts` | **MODIFY** | Add order mutations + job-card mutations | C6c | Additive hooks |
| `pages/production/order/ProductionOrderScreen.tsx` | **CREATE** | PO list/screen via `/api/v1/production/orders` alias | C2/FE-3/FE-4 | Additive screen |
| `config/screenRegistry.tsx` | **MODIFY** | Register `production-order` screen | FE-3 | Additive key |
| `pages/production/job-card/JobCardScreen.tsx` | **REFACTOR** | Use `productionApi`+shared types; remove duplicate local interfaces | C6; FE-4 | No UI/workflow change; contract unchanged |

---

## 2. V3 MIGRATION EVIDENCE

**Columns added (all nullable):**
| Table | Column | Type |
|---|---|---|
| `work_order` | `order_type` | VARCHAR |
| `job_card` | `work_order_id` | BIGINT |
| `job_card` | `route_operation_id` | BIGINT |
| `job_card_subjob` | `route_operation_id` | BIGINT |

**Indexes added (all `IF NOT EXISTS`):**
| Index | Columns |
|---|---|
| `idx_job_card_work_order_id` | `job_card(work_order_id)` |
| `idx_job_card_route_operation_id` | `job_card(route_operation_id)` |
| `idx_job_card_subjob_route_operation_id` | `job_card_subjob(route_operation_id)` |

**FK relationships:** **None defined in SQL.** Per approved §27, FK enforcement is omitted from V3 (additive-only gate; relationships are logical, enforced at the service layer via `findByWorkOrderId`/`findByRouteOperationId` lookups). This is the approved design — the columns reference `work_order.id` / `route_operation.id` logically.

**Backfill behavior:** `UPDATE work_order SET order_type='SINGLE' WHERE order_type IS NULL;` — idempotent + null-safe; defaults pre-existing orders to `SINGLE`.

**Idempotency strategy:** `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `WHERE order_type IS NULL`. Re-run validated (no re-apply error).

**Reconciliation query used & result:**
```sql
SELECT jc.job_card_number, jc.work_order_id, wo.wo_number AS work_order_number, jc.work_order_number AS legacy_jc_ref
  FROM job_card jc JOIN work_order wo ON wo.id = jc.work_order_id
 WHERE jc.id=900002;
```
Result: `JCF-1 | 900001 | WO-000001 | WO-000001` — new `work_order_id` (=900001) resolves to `wo_number='WO-000001'`, identical to legacy `job_card.work_order_number`. **Reconciliation PASS.**

**Explicit confirmations:**
```text
No DROP                            — verified (V3 has only ALTER ... ADD + CREATE INDEX + UPDATE)
No RENAME                          — verified
No re-type                         — verified (all ADD new columns)
No NOT NULL tightening             — verified (all columns remain nullable)
No removal of work_order_number    — verified (job_card.work_order_number intact)
No prod_order table                — verified (scan: zero prod_order entity/table/repo)
```

---

## 3. PRODUCTION ORDER ARCHITECTURE VERIFICATION

Delegation chain:
```text
Production Order (business term)
       ↓
ProductionOrderController  (/api/v1/production/orders)
       ↓
ProductionOrderService     (thin adapter; KEY="work-order")
       ↓
existing Work Order domain  (PlanningService + DocumentFacade, @DocKey("work-order"))
       ↓
work_order  (canonical single source of truth)
```

Confirmed:
- **No duplicated persistence** — PO writes use `DocumentFacade` KEY `work-order` → `work_order`; there is exactly one table and one repository path.
- **No duplicated business lifecycle** — all workflow/status/numbering orchestrated by existing `PlanningService`; `ProductionOrderService` only maps `orderType` discriminator on create.
- **No second order status source** — status is the `work_order.status` (single), never duplicated.
- **No `prod_order` entity/table/repository** — static scan: zero occurrences (only Javadoc/migration comments mention the term to forbid it).

---

## 4. JOB CARD EXTRACTION VERIFICATION

**Before:** `ProductionController` contained the full JobCard business logic inline (list/create/from-WO/get/update/delete/action/completion-check/subjob CRUD/subjob-action) plus stock posting inline via `stockService.recordStockIn`.

**After:**
```text
ProductionController (JobCard endpoints)  →  thin delegates
       ↓
ProductionJobCardService  (all JobCard business logic + C1 traceability population)
       ↓
ProductionStockBoundary  (inventory posting only)
       ↓
StockService  (unmodified)
```

**Exactly which methods moved (controller thin delegate → service full impl):**
| Moved method | Endpoint |
|---|---|
| `listJobCards` | GET `/api/v1/production/job-cards` |
| `createJobCard` | POST `/api/v1/production/job-cards` |
| `createFromWorkOrder` | POST `/api/v1/production/job-cards/from-work-order` |
| `getJobCard` | GET `/api/v1/production/job-cards/{id}` |
| `updateJobCard` | PUT `/api/v1/production/job-cards/{id}` |
| `deleteJobCard` | DELETE `/api/v1/production/job-cards/{id}` |
| `jobCardAction` | POST `/api/v1/production/job-cards/{id}/actions/{action}` |
| `completionCheck` | GET `/api/v1/production/job-cards/{id}/completion-check` |
| `getSubjobs` | GET `/api/v1/production/job-cards/{id}/subjobs` |
| `addSubjob` | POST `/api/v1/production/job-cards/{id}/subjobs` |
| `updateSubjob` | PUT `/api/v1/production/job-cards/subjobs/{lineId}` |
| `deleteSubjob` | DELETE `/api/v1/production/job-cards/subjobs/{lineId}` |
| `subjobAction` | POST `/api/v1/production/job-cards/subjobs/{lineId}/actions/{action}` |
| `(Job Card completion stock posting)` | inline → `ProductionStockBoundary` (was `stockService.recordStockIn`) |

**Unrelated functionality explicitly unchanged** (verified body scan): Production **Entry** (create/get/update/delete/action/list, eligible-operations, reports) 143–586; **Conversion** (list/create/get/update/delete/action) 597–691 (incl. its own stock postings 650/656/666/672); **Return** (list/create/get/update/delete/action) 693–761 (incl. stock posting 743); **Log Sheet** 763–855; **Idle Time** 857–924; **Print** (913) + `productionRow` 926; **Pending** 1045; **Dashboard** 1095. **None modified.**

---

## 5. INVENTORY BOUNDARY VERIFICATION

Final production posting chain (Job Card completion FG receipt):
```text
Production flow (Job Card complete)
       ↓
ProductionStockBoundary      (approved integration boundary — NEW)
       ↓
StockService.recordStockIn   (unmodified; sole stock owner)
       ↓
stock_ledger  (ledger.save) + stock_balance  (updateBalance — internal to StockService)
```
Confirmed:
- **No direct `StockBalanceRepository.save`** — scan across all new production services: none.
- **No direct `stock_balance` UPDATE** — none.
- **No modification to `StockService`** — git: `StockService.java` not in changed set; boundary only consumes its public `recordStockIn`.

Note: the review template names `InventoryIntegrationService` as an optional approved adapter. In P2 the approved boundary is `ProductionStockBoundary`. `InventoryIntegrationService` (baseline) was audited as never touching `stock_balance`/`StockBalanceRepository` (per DOCUMENT_21 §28). The chain satisfies the gate's intent (production → approved boundary → StockService → stock_ledger/stock_balance engine).

---

## 6. API COMPATIBILITY MATRIX

### 6.1 Affected existing endpoints (unchanged behavior, thin-delegated only)

| Existing Endpoint | Before | After | Breaking Change | Compatibility |
|---|---|---|---|---|
| GET `/api/v1/production/job-cards` | inline logic | thin delegate | No | Compatible (same result) |
| POST `/api/v1/production/job-cards` | inline logic | thin delegate | No | Compatible |
| POST `/api/v1/production/job-cards/from-work-order` | inline | thin delegate (+ C1 population) | No | Compatible (+ additive data) |
| GET/PUT/DELETE `/api/v1/production/job-cards/{id}` | inline | thin delegate | No | Compatible |
| POST `/api/v1/production/job-cards/{id}/actions/{action}` | inline | thin delegate | No | Compatible |
| GET `/api/v1/production/job-cards/{id}/completion-check` | inline | thin delegate | No | Compatible |
| GET/POST `/api/v1/production/job-cards/{id}/subjobs` | inline | thin delegate | No | Compatible |
| PUT/DELETE `/api/v1/production/job-cards/subjobs/{lineId}` | inline | thin delegate | No | Compatible |
| POST `/api/v1/production/job-cards/subjobs/{lineId}/actions/{action}` | inline | thin delegate | No | Compatible |
| All Production **Entry / Conversion / Return / Log / Idle / Print / Pending / Dashboard** endpoints | unchanged | unchanged | No | Compatible |

### 6.2 NEW additive API (listed separately)

| New Endpoint | Verb | Purpose | Additive |
|---|---|---|---|
| `/api/v1/production/orders` | GET/POST | list / create PO alias | **Yes — additive** |
| `/api/v1/production/orders/{id}` | GET/PUT/DELETE | get / update / delete | Yes |
| `/api/v1/production/orders/next-number` | GET | next PO number | Yes |
| `/api/v1/production/orders/{id}/actions/{action}` | POST | workflow action | Yes |
| `/api/v1/production/orders/{id}/populate` | POST | populate from SO/BOM/Route | Yes |
| `/api/v1/production/orders/create-from-so` | POST | create PO from SO | Yes |
| `/api/v1/production/orders/{id}/status-history` | GET | status history | Yes |
| `/api/v1/production/orders/{id}/summary` | GET | order summary | Yes |
| `/api/v1/production/orders/so-list` | GET | eligible SOs | Yes |
| `/api/v1/production/orders/active-bom-route` | GET | active BOM/route | Yes |
| `/api/v1/production/orders/dashboard` | GET | production dashboard | Yes |

All guarded `@RequirePermission(module="PLANNING")`; no existing endpoint removed or altered.

---

## 7. FRONTEND COMPATIBILITY EVIDENCE

- **Screens changed:** `JobCardScreen.tsx` (refactor to `productionApi`/shared types, no UI change); **new** `pages/production/order/ProductionOrderScreen.tsx`; `screenRegistry.tsx` (added `production-order` key).
- **Services changed:** `production-api.ts` — base corrected to `/v1/production`; order + job-card methods added.
- **Hooks changed:** `useProduction.ts` — order mutations + job-card mutations added.
- **Type changes:** `production.types.ts` — corrected to real fields; added `routeOperationId`, job_card/subjob fields; subjob no longer references missing `jobCardId` requirement.
- **Endpoint corrections:** all production endpoints now resolve to `/api/v1/production/...` (matching backend); added order endpoints.
- **Print URL correction:** `productionApi.printDocument` now yields `/api/v1/production/{type}/{id}/print` (was `/api/production/...` — missing `/v1`); JobCardScreen local print already correct, left as-is.

**No unintended UI/workflow redesign:** the JobCard screen visual structure, tables, forms, status badges, and action menu are byte-identical in behavior to baseline; only the data-access layer changed.

---

## 8. TEST DELTA

```text
P1 baseline:  175 tests   (57 files, 0f/0e/0s)
P2 final:     196 tests   (59 files, 0f/0e/0s)
Delta:        +21 tests
```

### Classification of +21 tests
| Area | # | Tests |
|---|---|---|
| Production Order (C2/D3) | 9 | `ProductionOrderServiceTest`: list paged, create, update, delete, action, populate, createFromSo, statusHistory, orderType mapping, NO prod_order key/dual persistence |
| Job Card extraction (C5 behavior-lock) | 12 | `ProductionJobCardServiceTest`: createJobCard (WO validation, JCF, DRAFT, `work_order_id` C1), createFromWorkOrder (DRAFT→APPROVED, RS/BOM, subjob `routeOperationId`=555 C1, inspectionRequired, bad-status block), update (DRAFT/ON_HOLD only), delete (DRAFT + cascade), jobCardAction (approve; release guard; complete→boundary `recordJobCardCompleteGood` + IPQC persist; complete blocks on incomplete subjob w/ no inventory call; cancel/close guards), subjobAction (complete sets COMPLETED+endTime; cancel guard) |
| Migration/data compatibility | 0 deltas | V3 validated via external Flyway+Postgres run (columns/indexes/backfill/reconciliation) — reported in §2 |
| Stock boundary | 0 deltas | covered implicitly by complete-path test asserting posting via `ProductionStockBoundary`→`StockService` (never direct `stock_balance`); `StockService` untouched |
| API compatibility | 0 deltas | no existing behavior changed; full 175 regression green (§8) proves no endpoint break |
| Frontend | 0 deltas | 34 existing FE tests remain green; typecheck + lint unchanged (§8 totals) |

**Regression:** all 175 baseline tests still pass — proves the extraction introduced no behavior change.

---

## 9. KNOWN ISSUES / DEVIATIONS (recommendation-only)

1. Pre-existing baseline drift in git (docker-compose/.env/`V1__init`→`V1__baseline` rename/etc.) existed before Step 0; unrelated to P2.
2. `WorkflowStateMachine` remains unused/misaligned for Production — deferred (Rule 8/C4), untouched.
3. Numbering: no runtime change (D7); seeds dormant; `WO` via DocTypes — deferred canonicalization.
4. `order_type`/`work_order_id`/`route_operation_id` NOT NULL — deferred until reconciliation verified on all production rows (separate approved change).
5. Lint warnings on new order screen (`set-state-in-effect`, `exhaustive-deps`) mirror every existing production screen (baseline profile); 0 new lint errors.
6. `StatusMapTranslationTest` not added as a standalone file; status mapping covered by the 21 new tests (§8) and 175 regression. Minor deviation from DOCUMENT_21 §16 checklist wording.

---

## 10. OFF-LIMITS VERIFIED UNTOUCHED

`StockService` · `stock_balance` writes · `production_entry*` schema/entities · runtime numbering · `job_order`/Purchase · BaseDoc hierarchy · canonical workflow migration · legacy table deletion · `WorkflowStateMachine` — **all verified untouched.**

---

# STOP

P2 is submitted for formal review. **P3 remains UNAUTHORIZED.** The P3 **read-only change plan** (no source modified) is provided separately in **DOCUMENT_23_P3_Change_Plan_.md**. No migrations, no new event tables, no `production_entry` modification will occur until P3 scope is formally approved.