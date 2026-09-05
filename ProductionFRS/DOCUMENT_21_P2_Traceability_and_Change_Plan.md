# DOCUMENT_21 — P2 Final Change Plan (25 sections)
# Canonical Production Order (WorkOrder) / Job Card

| | |
|---|---|
| **Module** | Production |
| **Phase** | P2 — Canonical Production Order / Job Card |
| **Date** | 2026-09-03 |
| **Status** | **READ-ONLY ANALYSIS COMPLETE — PLAN PENDING APPROVAL (NO IMPLEMENTATION)** |
| **Predecessor** | DOCUMENT_20 (P1 gate APPROVED) |
| **Authoritative lineage** | ADR-PROD-002 (`work_order` canonical), DOC 18 §149–173 (P2 scope), User P2 Rules 1–12 |

> This is the FINAL P2 Change Plan, produced after completing the 8 mandatory read-only
> inspections. **No source/entity/controller/migration/API/frontend/config/FRS file was modified.**
> Implementation begins only upon explicit user approval.

---

## 1. EXECUTIVE FINDING

The canonical **Production Order is the existing `work_order`**, owned by **`PlanningController` + `PlanningService`**
(persistence via `DocumentFacade`), **not** by `ProductionController`. `JobCard` / `JobCardSubjob` are the production-domain
execution documents that reference `work_order` by loose **string** (`work_order_number`, no FK).

Three critical facts drive this plan:
1. **`job_order` is a Purchase-module subcontract order** (prefix `JO`, vendor/job-worker), a **completely distinct domain**
   with zero field overlap with `work_order`. It must never be conflated (§5).
2. **`numbering_config` is already consulted** by `DocNumberService.resolvePrefix` for the **1-arg** `numbers.next(docType)`
   path, but **all production flows use the 2-arg `numbers.next(docType, prefix)`** (JCF/PE/PC/PR/PLS/ITE) which **bypasses**
   the config → the **P1 numbering seeds are dormant/unreachable** (§6, §7).
3. **Three unsynced status vocabularies** (WorkOrder, JobCard, Subjob) plus a **misaligned `WorkflowStateMachine`** table
   all diverge from DOC 11's canonical vocabulary. Per Rule 8, **no new vocabulary, no state-machine change** in P2 (§8, §9).

**P2 recommendation:** An additive, backward-compatible alignment on `work_order` + Job Card:
- **V3**: add `work_order.order_type` discriminator (+backfill), `job_card.route_operation_id` and nullable `job_card.work_order_id`,
  `job_card_subjob.route_operation_id` and nullable `job_card_subjob.job_card_id` FK. Additive only.
- **NEW** thin `ProductionOrderController` + additive `/api/v1/production/orders` alias (reuses `work_order`); **NEW** `ProductionOrderService`
  and `ProductionJobCardService` (behaviour-locked extraction). No `prod_order` table.
- **FE**: correct the stale/orphaned P1 types, wire `job-card/` + new `order/` via `productionApi`/`useProduction`.
- **Defer**: WorkflowStateMachine, status-vocabulary change, normalized op-event engine (`prod_execution_session`/`prod_operation_event`) → P3+.

---

## 2. ACTUAL CURRENT ARCHITECTURE DIAGRAM

```
                        ┌──────────────────────────────────────────────────────────────┐
                        │ PLANNING MODULE (canonical owner of work_order)              │
   sales_order ───────► │ PlanningController  ── PlanningService ── DocumentFacade    │  (create-from-so, populate)
                        │        │                    │  (create/action/populate)      │
                        │        └─ work_order (table work_order, @DocKey "work-order")│
                        │               │ bomId/bomCode/bomRevision → ProductionBOM    │  (BOM→materials)
                        │               │ routeId/routeSheetCode/routeRevision → Route │  (Route→operations)
                        │               │ WorkOrderOperation, WorkOrderMaterial,       │
                        │               │ WorkOrderStatusHistory                        │
                        └───────────────┼──────────────────────────────────────────────┘
                                        │ (WorkOrder.status: DRAFT/SUBMITTED/APPROVED/RELEASED/IN_PROCESS/ON_HOLD/COMPLETED/CLOSED/CANCELLED)
                                        ▼
                        ┌──────────────────────────────────────────────────────────────┐
                        │ PRODUCTION MODULE (consumer / executor)                      │
                        │ ProductionController.createFromWorkOrder (L96-180)          │
                        │     work_order_number (STRING, docNo/woNumber, NO FK)        │
                        │     ▼                                                        │
                        │  job_card (table job_card)  ─┐  (auto-generates subjobs)     │
                        │     │  └─ routeSheetNumber, bomNumber (copied)               │
                        │     │                                                        │
                        │     ▼                                                        │
                        │  job_card_subjob (FROM RouteSheet.operations / RouteOperation)│
                        │     │  operationCode/sequence/machine/WC (routeOperationId NOT persisted)│
                        │     ▼                                                        │
                        │  production_entry (entry; references workOrderNumber/jobCardNumber/subjobNumber strings)│
                        └──────────────────────────────────────────────────────────────┘
```
**Pervasive risk:** all `work_order` / `job_card` / subjob references across the production entities are **loose strings**
(`work_order_number`, `job_card_number`, `subjob_number`), no FKs (§11, §12).

---

## 3. WORKORDER OWNERSHIP MAP (Inspection 1)

| Layer | Owner | Evidence (file:line) | Role |
|---|---|---|---|
| Entity | `WorkOrder` | `entity/WorkOrder.java:11` (`@DocKey "work-order"`) | Canonical PO; extends `BaseDoc` |
| Controller | **`PlanningController`** | `controller/PlanningController.java:19,43-92` | Canonical CRUD + `/work-order/*` + `/{type}/actions` |
| Controller (read-only) | `PlanningMasterController` | `controller/PlanningMasterController.java:36,146,455,653,940,...` | MRP/load/gap/cost/where-used reads |
| Controller (read-only consumer) | `ProductionController` | `controller/ProductionController.java:45-46,75-78,96-180` | Reads WO for JobCard; non-canonical status write L112-117 |
| Service (canonical) | `PlanningService` | `service/PlanningService.java:17,36,391,1369,1484` | create/action/populate/numbering-side-effects |
| Persistence engine | `DocumentFacade` | `service/DocumentFacade.java:47-62,461-505,630-636` | doc-type→class registry, create/update, `docNo` numbering |
| Repository | `WorkOrderRepository` | `repo/WorkOrderRepository.java:8` (extends `BaseDocRepository`) | `findByItemCode/BomId/Status/WoNumber` |
| APIs | `GET/POST/PUT/DELETE /api/v1/planning/work-order…`, `/create-from-so`, `/populate`, `/actions`, reports | `PlanningController.java` | Canonical order APIs |
| FE | `pages/planning/workorder/WorkOrderScreen.tsx` (1758 ln) | `WorkOrderScreen.tsx:78-80,149,395,…` (`apiClient.get('/v1/planning/work-order/…')` inline) | Order creation UI (planning module) |

**Key conclusion:** `ProductionController` does **NOT** own `work_order`. Any P2 `ProductionOrderService` must delegate to the
existing Planning path (single source of truth, Rule 5). The only non-canonical write — `ProductionController:112-117`
(DRAFT→APPROVED side-effect) — must be surfaced as a risk (§23).

---

## 4. WORKORDER → JOB CARD → SUBJOB TRACEABILITY (Inspection 2, Rule 6)

| Arrow | Actual relationship | FK / ID / String | Owning table | Creation point | Deletion behavior | Consistency validation | Risk |
|---|---|---|---|---|---|---|---|
| WorkOrder → BOM | `bomId`+`bomCode`+`bomRevision` snapshot | `bom_id` (FK-less Long), `bom_code`, `bom_revision` | `work_order` | generic create / `populateFromBomAndRoute` (`PlanningService:1386-1434`); `snapshotBomRouteRevision` on release (`787-808`) | `validateBomCanBeDeleted` blocks delete if WO references it (`PlanningService:1702-1709`) | no FK; `bomCode/bomRevision` may be null until release/populate | stale/blank bom ref; no referential integrity |
| WorkOrder → Route | `routeId`+`routeSheetCode`+`routeRevision` snapshot | `route_id` (FK-less Long), `route_sheet_code`, `route_revision` | `work_order` | `populateFromBomAndRoute` (`1436-1476`); release snapshot (`798-807`) | route not deleted if referenced (implied by WO checks) | no FK; revision snapshot may lag | stale/blank route ref |
| WorkOrder → RouteOperation (WO lines) | `WorkOrderOperation` collection | `@ManyToOne(doc)` FK `doc_id` (`WorkOrderOperation:11-13`); `route_operation_id` traceability (`:41-42`) | `work_order_operation` | `populateFromBomAndRoute` (`1445-1470`) | cascade ALL + orphanRemoval from WO (`WorkOrder.java:69-70`) | `route_operation_id` saved correctly | cleared+rebuilt on every populate → history loss (`wo.getOperations().clear()` `1473`) |
| WorkOrder → JobCard | **STRING** `work_order_number` | `job_card.work_order_number` (`JobCard:25-26`) **NO FK** | `job_card` | `ProductionController.createFromWorkOrder` (`96-180`); manual create validates `findByWoNumber` (`75-78`) | only DRAFT JC deletable (`202-208`); subjobs cascade via manual delete (`206`) | lookup `findByWoNumber` + docNo/woNumber case-insensitive fallback (`102-108`); stores `docNo` preferentially (`121`) | **string, no FK** → orphaned JC if WO number changes; dual lookup fragile |
| JobCard → Subjob | `JobCardSubjob` collection | `@ManyToOne(jobCard)` FK `job_card_id` (`JobCardSubjob:21-24`); **routeOperationId NOT set** | `job_card_subjob` | `from-work-order` per `RouteOperation` (`156-174`); manual `addSubjob` (`492-513`) | subjob deletable only PENDING/RELEASED (`526-533`); cascade from JC delete (`206`) | `routeOperationId` NOT persisted (gap) | **no persisted subjob↔route-op link** (contra DOC 11 §3.6) |
| Subjob → ProductionEntry | **STRING** `job_card_number` + `subjob_number` | `production_entry.job_card_number`, `.subjob_number` (`ProductionEntry:46-50`) | `production_entry` | `createProductionEntry` (`574-605`) | entry reversal (`reverse` action `862-900`) | `getEligibleOperations` matches `findByJobCardJobCardNumber` (`633-661`) | string refs; entry reversal adjusts subjob qty in place |

---

## 5. JOBORDER TERMINOLOGY / CONFLICT ANALYSIS (Inspection 3)

**Deterministic finding: `job_order` is a PURCHASE-module subcontract/Job-Work order, NOT a production concept, and is NOT a duplicate of `work_order`.**

| Aspect | `JobOrder` (job_order) | `WorkOrder` (work_order) |
|---|---|---|
| Module | **Purchase** (`DocTypes.java:96` under "// Purchase module" 91-99) | **Planning** (`DocTypes.java:107` under "// Planning module" 104-108) |
| Owning controller | `PurchaseController` (`:35-41`, `/job-orders/...`) | `PlanningController` |
| Semantics | External vendor/job-worker processing, send-out/return | Internal shop-floor manufacturing |
| Evidence fields | `supplierJobWorker`, `subcontractor`, `supplier`, `jobWorkType`, `paymentTerms`, `email`, `expectedReturnDate`, `attachmentFileName` (`JobOrder.java:9-24`) | `itemCode`, `bomId`, `routeId`, `salesOrderId`, `productionLine`, `batchLotNo`, quantity lifecycle (`WorkOrder.java`) |
| Child documents | `JobOrderItem`, `JobOrderSchedule`, `JobOrderMaterialIssue` → `JoDc/JoInward/LoInward/SubcontractInvoice` | `WorkOrderOperation`, `WorkOrderMaterial`, `WorkOrderStatusHistory` → `JobCard/JobCardSubjob/ProductionEntry` |
| Link to production | only loose string `productionReference` (`JobOrder.java:19`) — not FK | n/a |
| Referenced by JobCard? | **NO** (JobCard only `work_order_number`) | YES (`work_order_number`) |
| Referenced by ProductionEntry? | **NO** (only `work_order_number`) | YES |

**Zero field-level overlap** between the two ecosystems (no entity holds both a `jobOrder*` and a `workOrder*` link).
**Conclusion:** Keep `job_order` entirely separate. Do not merge/rename/delete. Any "Job Order" term in the FRS must be
qualified as (a) Subcontract/Job-Work JO (Purchase) vs (b) Manufacturing WorkOrder (Planning/Production).
**Data-model hazard if conflated:** wrong module ownership, wrong lifecycle (sent→received vs released→completed),
wrong downstream documents, identifier prefix collision (`JO-*` vs `WO-*`).

---

## 6. CURRENT NUMBERING ARCHITECTURE (Inspection 4)

Two distinct numbering paths exist in `DocNumberService`:

| Path | Method | Key/sequence | Format | Config-aware? |
|---|---|---|---|---|
| Legacy 2-arg | `next(docType,prefix)` (`DocNumberService:60-77`) | `doc_sequence` keyed `docType/year` | `PREFIX-YYYY-NNNN` | **NO** (explicit prefix bypasses `resolvePrefix`) |
| Legacy 1-arg | `next(docType)` (`:30-34`) → `resolvePrefix` (`:36-57`) | `doc_sequence` keyed `docType/year` | `PREFIX-YYYY-NNNN` | **YES** — `resolvePrefix` reads `numberingConfigs.findByDocType` first (L39-44), falls back to `DocTypes` |
| Config (FRS) | `nextNumberFromConfig(docType,plantId)` (`:120-164`) | `doc_sequence` keyed `docType[/Pplant]/year` | `PREFIX-PLANTCODE-YYYY-NNNNN` | **YES** (drives everything) |
| FY | `nextFy(prefix)` (`:191-209`) | `doc_sequence` keyed `PREFIX:fyLabel` | `PREFIX/FY/00001` | n/a |

### Answers to the 5 sub-questions
- **A. Does `numbers.next(...)` delegate to `DocNumberService`?** — YES. `numbers` in both controllers is the injected `DocNumberService` bean; `ProductionController` calls `numbers.next("job-card","JCF")` etc. (2-arg).
- **B. Is `numbering_config` currently consumed?** — ONLY via `resolvePrefix` (the 1-arg `next`/`allocate`/`peek` path), e.g. the WorkOrder `docNo` path through `DocumentFacade.nextNumberFor`→`numbers.next(key)` (1-arg). No other consumer exists; `nextNumberFromConfig` itself is **never called** by any controller (grep confirmed 0 call sites outside the service+tests).
- **C. Are the P1 production seeds reachable?** — **NO.** The 6 seeded doc-types (`job-card`→JC, `production-entry`→PE, etc.) are consumed **only** by `ProductionController` using the **2-arg** form (`numbers.next("job-card","JCF")`, `…("production-entry","PE")`, `…("product-conversion","PC")`, `…("production-return","PR")`, `…("production-log-sheet","PLS")`, `…("idle-time-entry","ITE")` — `ProductionController:84,120,578,1031,1127,1198,1292`). The 2-arg form bypasses `resolvePrefix`, so the seeded config prefixes (JC/PE/CV/PR/PL/ID) are **dormant**. Also `"work-order"` was **not seeded** in P1, so WorkOrder still uses `WO` from `DocTypes`.
- **D. Do JCF and seeded JC conflict?** — Not at runtime today (JCF used via 2-arg, JC seed unused). But they are **semantically duplicative** prefixes; once the config path is adopted (`nextNumberFromConfig`/1-arg), `job-card` would resolve to **JC** not **JCF**. This is the intended FRS migration, but it is a **breaking change** for existing `JCF-*` records unless handled additively.
- **E. Recommended single canonical numbering path** — Adopt `DocNumberService.nextNumberFromConfig(docType, plantId)` (FRS format, doc_sequence-backed, plant-scoped) as the **single** production numbering path, driven by `numbering_config`. Migration must be **additive**: seed/prefix-override so new docs use config prefixes while keeping a compat prefix for legacy `JCF*` sequences untouched. **No `numbers.next(docType,prefix)` 2-arg hard-coded prefixes** in new code. (No code change in P2 analysis.)

---

## 7. NUMBERING DECISION RECOMMENDATION (Inspection 4)

| # | Decision | Rationale | P2 action |
|---|---|---|---|
| N-1 | Keep `work-order` numbering on the 1-arg/config path (currently `WO` via `DocTypes`, config not seeded) | single source of truth; no P1 seed for work-order | Optionally seed `work-order`→`WO` into config so `resolvePrefix`/`nextNumberFromConfig` resolve identically (additive) |
| N-2 | Migrate production doc-numbers **incrementally** to `nextNumberFromConfig` via new services, NOT the legacy 2-arg controller path | Rule 5/11 single canonical path; additive | In NEW `ProductionOrderService`/`ProductionJobCardService` use `nextNumberFromConfig`; leave `ProductionController` 2-arg calls untouched (off-limits) |
| N-3 | **No JCF→JC runtime change in P2** | seeds dormant; changing now is breaking | Keep both; document; plan re-seed/prefix migration for a later approved phase |
| N-4 | Flag P1 seed prefix mismatch (`job-card` seeded JC but legacy uses JCF; `production-entry` seeded PE matches; `product-conversion` seeded CV but legacy PC) as a **documented deviation** | ADR-PROD-003 prefix canon vs legacy | Record in plan; require explicit approval before any prefix switch |

---

## 8. CURRENT WORKFLOW ARCHITECTURE (Inspection 5)

- **WorkOrder** statuses driven by `PlanningService.workOrderAction` (`PlanningService:391-514`), NOT the state machine:
  `DRAFT, SUBMITTED, REJECTED, APPROVED, RELEASED, IN_PROCESS, ON_HOLD, COMPLETED, CLOSED, CANCELLED` (+SHORT_CLOSE→CLOSED).
- **JobCard** statuses driven by `ProductionController.jobCardAction` (`:210-414`), NOT the state machine:
  `DRAFT, APPROVED, RELEASED, IN_PROGRESS, ON_HOLD, QUALITY_HOLD, PRODUCTION_HOLD, COMPLETED (completion_status=COMPLETE), CLOSED, CANCELLED`.
- **JobCardSubjob** statuses driven by `ProductionController.subjobAction` (`:535-565`): `PENDING, RELEASED, IN_PROGRESS, ON_HOLD, QUALITY_HOLD, PRODUCTION_HOLD, COMPLETED, CANCELLED`.
- **ProductionEntry** (`ProductionEntry.java:135` comment; controller): `DRAFT, SUBMITTED, APPROVED, POSTED, REJECTED, CANCELLED, REVERSED` + `quality_status: PENDING, PASS, FAIL, HOLD, REVERSED`.
- **Conversion/Return/Log/Idle**: `DRAFT, SUBMITTED, VERIFIED/POSTED, COMPLETED, RECEIVED, CANCELLED, CLOSED`.
- **`WorkflowStateMachine`** (`WorkflowStateMachine.java:14-83`): has tables for `work-order`, `job-card`, `subjob`, `production-entry`, `product-conversion`, `production-return`. **But MISALIGNED** with the actual controllers:
  - `job-card` table starts at `PENDING` (L29) but controller uses `DRAFT/APPROVED` — machine never sees `DRAFT/APPROVED`.
  - `subjob` key (L39) is `"subjob"` but controller never calls `validateTransition` for subjobs.
  - `production-entry` table ends at `APPROVED` (L51) but controller has `POSTED/REVERSED` — not in machine.
  - **Router :** `ProductionController` never calls `stateMachine.validateTransition` for job-card/subjob/entry actions (verified — no call sites). So the machine is **aspirational/redundant** for Production today.

---

## 9. DOCUMENT 11 VOCABULARY RECONCILIATION TABLE (Inspection 5, Rule 8)

| Existing status | Entity | Existing meaning (code) | DOC 11 canonical meaning | KEEP / MAP / DEPRECATE / FUTURE |
|---|---|---|---|---|
| DRAFT | WorkOrder, JobCard | initial editable | DRAFT (doc) | KEEP (maps to doc DRAFT) |
| SUBMITTED | WorkOrder, PE, Conv, Return | awaiting approval | SUBMITTED (doc) | KEEP |
| PENDING_APPROVAL | — (absent in code) | — | canonical pre-approval state | **FUTURE** (DOC 11 adds; not in code; do not add now — Rule 8) |
| REJECTED | WorkOrder, PE | returned to draft edit | REJECTED (doc) | KEEP |
| APPROVED | WorkOrder, JC, PE, Conv | approved | APPROVED (doc); =RELEASED for execution | KEEP |
| RELEASED | WorkOrder, JC | released for exec | APPROVED + RELEASED (exec) | MAP (exec) |
| IN_PROCESS | WorkOrder | started | APPROVED + IN_PROGRESS (exec) | MAP |
| IN_PROGRESS | JC, Subjob | started | IN_PROGRESS (exec) | KEEP (exec) |
| ON_HOLD | WO, JC, Subjob | suspended | ON_HOLD (exec) | KEEP (== DOC 11 WF-GAP-002) |
| QUALITY_HOLD | JC, Subjob | quality block | (subsumed under ON_HOLD/QUALITY_PENDING) | **MAP** (to ON_HOLD/QUALITY) |
| PRODUCTION_HOLD | JC, Subjob | production block | (subsumed under ON_HOLD) | MAP |
| COMPLETED | WO, JC, Subjob, PE, Conv | final qty done | COMPLETED (exec) | KEEP |
| POSTED | PE, Conv | stock posted | (DOC 11: APPROVED→posting) | MAP (exec posted) |
| REVERSED | PE | reversing entry | REVERSED (doc) | KEEP |
| CLOSED | WO, JC, LS | archived/closed | CLOSED (doc) | KEEP |
| CANCELLED | WO, JC, Subjob, PE, Conv, Return | cancelled | CANCELLED (doc) | KEEP |
| RECEIVED | Return | return received | (DOC 11 RETURN disposition) | MAP |
| VERIFIED | Conv, Return | verified | (DOC 11 SUBMITTED→approval) | MAP |
| PENDING (subjob) | Subjob | initial subjob | CREATED / NOT_STARTED (exec) | **MAP/DEPRECATE** (DOC 11 uses CREATED/NOT_STARTED) |
| PENDING (quality) | PE.quality_status | awaiting qc | QUALITY_PENDING (op) | MAP |
| RELEASED (subjob) | Subjob | subjob released | READY (exec) | **MAP** (DOC 11 subjob READY) |

**Rule 8 honored:** This table is **read-only documentation**. No transitions are added, no second vocabulary is created,
`WorkflowStateMachine` is **not** modified. Any vocabulary migration is deferred to an approved later phase with a
documented mapping layer.

---

## 10. JOB CARD DOCUMENT ARCHITECTURE DECISION (Inspection 8)

**Current state:** `WorkOrder` extends `BaseDoc`/`DocEntity` (shared infrastructure: soft-delete, audit, `@Version`, docNo,
lifecycle, generic portal). **`JobCard` and `JobCardSubjob` do NOT extend `BaseDoc`** — they carry independent lifecycle/audit
fields, `@Version`, and loose-string parent refs.

| Option | Description | Benefits | Risks | Migration impact | Backward compat | Recommendation |
|---|---|---|---|---|---|---|
| **A — Retain current JobCard architecture** | Keep JobCard/Subjob as standalone entities | Zero schema/JSON change; screens & APIs untouched; lowest risk | No shared doc lifecycle; loose string refs; no soft-delete; no status-history; duplicated audit | None (baseline) | Full (existing) | **NOT FINAL — see C** |
| **B — Migrate JobCard→BaseDoc** | Reparent to `BaseDoc`/`DocEntity` | Unified lifecycle/audit/docNo/history; strong integrity | High blast radius: changes JSON shape, existing rows, generic doc infra; breaks screens; needs backfill of `docNo/deleted` | Large, breaking | Breaks existing JobCard APIs/UI without shim | **REJECT for P2** (too risky; defer to dedicated cleanup phase) |
| **C — Compatibility adapter / incremental alignment** | Additive alignment: add `work_order_id` nullable FK + `route_operation_id` on JC/subjob; keep own fields; expose a read `docNo`-like adapter | Moderate risk; gains traceability FK + subjob↔route link; additive & reversible; preserves screens | Some duplication (string+FK coexist) | Additive-only V3 columns (nullable); existing rows unaffected | Full (nullable cols, additive) | **RECOMMENDED for P2** (additive alignment now; full BaseDoc re-parent deferred) |

**Decision:** **OPTION C** for P2 — additive columns + incremental alignment. Option B deferred to a later, explicitly approved
cleanup phase. This yields the `route_operation_id` traceability DOC 11 requires without breaking the existing architecture.

---

## 11. BACKEND GAP ANALYSIS

| # | Gap | Evidence | P2 resolution |
|---|---|---|---|
| BG-1 | `JobCard`/`JobCardSubjob` not `BaseDoc`/`DocEntity` | `JobCard.java:11-16` | Option C (incremental): add FKs + traceability only; defer re-parent |
| BG-2 | `work_order_number` stored as loose string; no FK; dual-lookup fragility | `JobCard.java:25-26`; `ProductionController:102-108,121` | Add nullable `work_order_id` FK to JC (V3) + repository by id; keep string for compat |
| BG-3 | Subjob↔route-op link not persisted (`routeOperationId` missing) | `ProductionController:156-174` | Add `route_operation_id` to `job_card_subjob` (V3) + set in `ProductionJobCardService` |
| BG-4 | Business logic lives in `ProductionController` (violates DOC 10) | `ProductionController:68-565` | NEW `ProductionJobCardService` extraction (behaviour-locked) |
| BG-5 | No production-domain `ProductionOrderService`; WO owner is Planning | §3 | NEW thin `ProductionOrderService` delegating to Planning path |
| BG-6 | `WorkflowStateMachine` misaligned & unused for production | §8 | Defer; do not touch (Rule 8) |
| BG-7 | `itemCode` quirk: `createWorkOrderFromSO` stores `soItem.getItemName()` as `itemCode` | `PlanningService:1504` | Flag only (WO owner); P2 does not touch Planning |
| BG-8 | No unified status history for JobCard (vs WO `WorkOrderStatusHistory`) | `JobCard` has no `JobCardStatusHistory` | Additive `job_card_status_history` table (V3) OR reuse generic `doc_status_history`; decision below (DB-6) |

---

## 12. DATABASE GAP ANALYSIS

| # | Table | Current | Gap | P2 (V3, additive) |
|---|---|---|---|---|
| DB-1 | `work_order` | BaseDoc + quantity fields; `wo_type` free-text | No PO `order_type` discriminator | ADD `order_type varchar` (default 'SINGLE') + idempotent backfill |
| DB-2 | `job_card` | standalone; `work_order_number` string | No FK to `work_order`; no `route_operation_id` | ADD nullable `work_order_id bigint` FK, ADD nullable `route_operation_id bigint` |
| DB-3 | `job_card_subjob` | standalone; `@ManyToOne job_card_id` FK present | `route_operation_id` missing | ADD nullable `route_operation_id bigint`; (job_card FK already present) |
| DB-4 | `production_entry*` | legacy, off-limits in P2 | — | **No change in P2** (Rule 7) |
| DB-5 | `numbering_config` | P1 seed present (6 production doc-types, dormant) | `work-order` not seeded; prefix mismatches (JC vs JCF) | Optionally ADD `work-order`→`WO` seed row in V3 (additive); flag prefix deviations (N-4) |
| DB-6 | status history | WO has `work_order_status_history`; JC has none | JC lacks status audit | ADD `job_card_status_history` (additive) OR reuse generic `doc_status_history` (both additive; prefer generic reuse per ADR-PROD-003) |

---

## 13. API GAP ANALYSIS

| # | API gap | Current | P2 resolution |
|---|---|---|---|
| AP-1 | No production-domain "Production Order" endpoint expose | `/api/v1/planning/work-order…` (Planning) | ADD thin `ProductionOrderController` + additive alias `/api/v1/production/orders` reusing `work_order` (no dual-write; single source) |
| AP-2 | DOC 13 uses `/orders`, `/jobcards` new paths | existing `/api/v1/production/job-cards` | REUSE existing `/api/v1/production/job-cards*`; do **not** create dup `/jobcards`; alias only `/orders` |
| AP-3 | JobCard derives `routeOperationId` not returned | subjob JSON lacks it | additive field returned on create/read |
| AP-4 | `productionApi` print helper builds wrong URL | `services/production-api.ts:152-155` (`/production/<docType>/...` no `/api/v1`) | CORRECT in P2 FE refactor (use `/api/v1/production/job-cards/{id}/print`) |
| AP-5 | Envelope/2xx contract | `axiosClient` unwraps `{data,meta}` | unchanged; new endpoints use existing client |

---

## 14. FRONTEND GAP ANALYSIS (Inspection 6)

| # | FE gap | Evidence | P2 resolution |
|---|---|---|---|
| FE-1 | **P1 FE foundation is DORMANT** — no screen imports `productionApi`/`useProduction`/`types/production` | explore report: only the 3 P1 files self-import; `JobCardScreen.tsx:2` uses `apiClient` directly; same for `JobCardKanban.tsx`, `ProductionEntryScreen.tsx` | WIRE `job-card/` + new `order/` via `productionApi`/`useProduction` |
| FE-2 | **P1 types out of sync** — `plannedQty/totalGood/partName` vs real `plannedQuantity/completedQuantity/partDescription` | `types/production/production.types.ts` vs `JobCard.tsx:13-61` + entity | CORRECT `production.types.ts` to match the real entity/screen fields |
| FE-3 | No `order/` production screen | `WorkOrderScreen.tsx` is planning-only | NEW `pages/production/order/` using `/api/v1/production/orders` alias |
| FE-4 | Direct frontend→controller coupling (no service layer) | `JobCardScreen` calls `apiClient` inline | Route through `productionApi` (layering; DOC 10) |
| FE-5 | Print URL mismatch in P1 helper | §13 AP-4 | Fix in FE-1 refactor |

---

## 15. CREATE / EXTEND / REFACTOR / REUSE CLASSIFICATION

| Artifact | Class |
|---|---|
| `V3__work_order_po_discriminator.sql` (new migration) | **CREATE** (additive DDL/DML) |
| `service/ProductionOrderService.java` (NEW) | **CREATE** (thin alias wrapper, delegates to Planning) |
| `ProductionOrderController` (NEW) | **CREATE** (thin, single alias controller → DELEGATES to existing Planning path; no parallel impl per C2) |
| `service/ProductionJobCardService.java` (NEW) | **CREATE** (extraction of JobCard business logic) |
| `entity/JobCard.java`, `entity/JobCardSubjob.java` | **EXTEND** (add `work_order_id`, `route_operation_id`) |
| `ProductionController` JobCard endpoints | **REFACTOR** (behaviour-locked thin delegation ONLY; Entry/Return/Conv/Log/Idle untouched) |
| `types/production/production.types.ts` | **EXTEND/CORRECT** (align to real fields) |
| `services/production-api.ts`, `hooks/useProduction.ts` | **EXTEND/REUSE** (wire into screens) |
| `pages/production/order/` | **CREATE** |
| `pages/production/job-card/` | **REFACTOR** (to hooks; contract unchanged) |
| `WorkflowStateMachine` | **REUSE/DEFER** (no change) |
| `work_order` table/entity | **REUSE** (single source; additive column only) |

---

## 16. EXACT FILES PROPOSED FOR MODIFICATION (only upon approval)

Backend:
- `zyger-erp-backend/src/main/resources/db/migration/V3__work_order_po_discriminator.sql` (NEW)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionOrderService.java` (NEW)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/controller/ProductionOrderController.java` (NEW)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionJobCardService.java` (NEW)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/entity/JobCard.java` (EXTEND)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/entity/JobCardSubjob.java` (EXTEND)
- `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/controller/ProductionController.java` (JobCard endpoints only → thin delegation; behaviour-locked)
- New tests: `ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `StatusMapTranslationTest`, V3 migration validation

Frontend:
- `zyger-erp-frontend/src/types/production/production.types.ts` (CORRECT field names)
- `zyger-erp-frontend/src/services/production-api.ts` (fix print URL; add `order` endpoints; wire authz)
- `zyger-erp-frontend/src/hooks/useProduction.ts` (add order hooks; extend job-card hooks)
- `zyger-erp-frontend/src/pages/production/order/` (NEW)
- `zyger-erp-frontend/src/pages/production/job-card/JobCardScreen.tsx` (refactor to hooks, contract unchanged)

---

## 17. EXACT FILES EXPLICITLY OFF-LIMITS (Rule 5, 7, 8, 9, 11)

- `service/WorkflowStateMachine.java` — **no change** (Rule 8)
- `service/PlanningService.java`, `controller/PlanningController.java` — **no logic change** (WO canonical owner; P2 only adds alias/service that *delegates to* it)
- `controller/ProductionController.java` **non-JobCard endpoints** (Entry/Return/Conversion/Log/Idle) — **no change**
- `ProductionEntry`, `entry`, `production_entry*` tables/entities — **no change** (Rule 7)
- `service/StockService.java`, `StockBalanceRepository`, `stock_balance` — **no direct writes** (Rule 9)
- `V1__baseline.sql`, app YAML profiles, Hibernate mappings — **no change**
- `doc/DocTypes.java`, `DocNumberService` (no numbering code change in P2) — **no change**
- FRS documents — **no change** (unless an approved contradiction update)
- `job_order` / Purchase module — **no change** (distinct domain; never merge)

---

## 18. DATABASE MIGRATION IMPACT

**Scoped by C1 (D1) — strictly additive, exactly 4 columns:**

| Object | DDL (V3) | Nullable | Index | Condition |
|---|---|---|---|---|
| `work_order` | `ADD COLUMN order_type varchar` | YES | — | backfill idempotent + null-safe; **no NOT NULL** until reconciliation |
| `job_card` | `ADD COLUMN work_order_id bigint` | YES | **YES** (`idx_job_card_work_order_id`) | reconciliation vs `work_order_number` |
| `job_card` | `ADD COLUMN route_operation_id bigint` | YES | **YES** (`idx_job_card_route_operation_id`) | — |
| `job_card_subjob` | `ADD COLUMN route_operation_id bigint` | YES | **YES** (`idx_job_card_subjob_route_operation_id`) | — |

- **No DROP, no rename, no data deletion, no column re-type, no `NOT NULL`** (per C1). Legacy `work_order_number` kept for compatibility.
- Backfill `work_order.order_type = 'SINGLE' WHERE order_type IS NULL` is **idempotent and null-safe** (guarded `WHERE … IS NULL`).
- **Reconciliation verification (C1):** a query/report cross-checks legacy `job_card.work_order_number` string matches the resolved `job_card.work_order_id` WO number for all rows (see §22/§27).
- **Out of approved scope in P2:** the optional `work_order`→`WO` numbering_config seed and the optional `job_card_status_history` table from the earlier draft are **removed** — they are not in C1's 4-column list. (Numbering config seed requires its own approved future change; see C7.)
- Validated on a **disposable `postgres:16-alpine` + `flyway/flyway:10`** container (same GATE 4 approach).
- No impact on `production_entry*`, `stock_balance`, `work_order_operation`, `work_order_material`, `WorkOrderStatusHistory`.

---

## 19. API COMPATIBILITY IMPACT

- **Additive only.** New endpoints (`/api/v1/production/orders*`) and new JSON fields (`orderType`, `workOrderId`, `routeOperationId`) are additive; existing clients unaffected.
- Existing `GET/POST/PUT/DELETE /api/v1/production/job-cards*` and `/api/v1/planning/work-order*` **contracts unchanged** (behaviour-locked extraction proves identical outcomes).
- `ProductionController` JobCard refactor is contract-locked: same request/response shape.
- No deletion or redefinition of existing endpoints.

---

## 20. BACKWARD COMPATIBILITY STRATEGY

- All DB changes additive (nullable new columns), so existing rows/screens unaffected.
- Legacy 2-arg `numbers.next(docType, prefix)` calls in off-limits `ProductionController` remain untouched → no runtime numbering change.
- `work_order` remains the single source of truth; the `/api/v1/production/orders` alias is defensive (anti dual-write), disable-able.
- `job_order` (subcontract) and all Purchase flows intact.
- Screens: existing JobCard/WorkOrder screens unchanged; refactor routes through hooks with identical UI behaviour (js-only).
- Feature-flag pattern (DOC 18 §419): new writers gated behind a flag; disabling returns to legacy path; no drop.

---

## 21. TEST STRATEGY

- **Baseline pre-change tests run FIRST** (§28): backend 175 / frontend 34 / typecheck / lint 769 / static stock-write scan / **behaviour-lock "before" suite on `ProductionController` JobCard endpoints** — captured before extraction.
- New backend tests: `ProductionOrderServiceTest` (PO create/release/composite/rework/short-close via alias), `ProductionJobCardServiceTest` (JC issue/complete; subjob), `StatusMapTranslationTest`, V3 migration validation (disposable Postgres+Flyway, idempotency, null-safe backfill), **reconciliation test** (string `work_order_number` ↔ `work_order_id` cross-check, per C1).
- **Behaviour-lock regression (C5):** "before" AND "after" suites prove `ProductionController` JobCard endpoints produce identical outcomes post-extraction (endpoint contracts, status behavior, inventory posting behavior).
- Frontend: `npm run typecheck` clean; extend `npm test` for new `order/` + `job-card/` hook wiring (34 existing must stay green); `npm run lint` baseline unchanged.
- Static scan: no new direct `StockBalanceRepository`/`stock_balance` in P2 services (C5: `StockService` unmodified, inventory via the integration boundary only).

---

## 22. ROLLBACK STRATEGY

- Each change is additive and independently reversible:
  - DB: drop only the additive V3 columns/indexes (V3 reverse documented in §27; no data on existing rows changed beyond harmless `orderType` default). **`work_order_number` string always retained** — the reverse path re-enables full legacy operation (C1).
  - **Reconciliation (C1/§18):** before and after migration, run the string↔ID reconciliation report; it must pass (all `work_order_number` match resolved `work_order_id`) before `NOT NULL` is ever considered. If any row fails, stop and fix.
  - Services/controllers: new `ProductionOrderController` (single, thin alias) + `ProductionOrderService` disable-able (alias off, C2); `ProductionJobCardService` extraction rolled back by reverting `ProductionController` JobCard endpoints to inline (pre-extraction) and removing the new service class.
  - FE: `order/` page hidden; `job-card/` refactor is js-only (revert to direct apiClient if needed).
- No destructive SQL anywhere; reverse documented per migration (no DROP on legacy; reverse touches only additive P2 artifacts).

---

## 23. RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|---|---|---|
| Relabelling "Work Order"→"Production Order" surprises legacy users (DOC 18) | UX/confusion | Legacy term retained on planning screen; `order/` is a new alias screen |
| Controller→service extraction behaviour drift | Functional regression | Behaviour-lock regression suite; contract-locked endpoints |
| V3 on legacy `work_order` rows | Migration failure | Additive nullable cols; idempotent backfill; disposable-container validation |
| Loose-string `work_order_number` (no FK) persists | Integrity | Additive nullable `work_order_id` FK (does not break strings); string kept for compat |
| DOC 12 `prod_order` vs ADR-PROD-002 divergence | Architecture | No `prod_order`; escalated to Architect; documented deviation (ADR-002 + Rule 2 override) |
| `job_order` (subcontract) conflated with PO | Wrong-module corruption | §5: hard separation, never merge |
| P1 numbering seed prefixes dormant/no-op / prefix mismatch | Confusion/duplication | §7 N-3/N-4: no runtime switch in P2; document; require approval before prefix migration |
| Non-canonical WO status write in `ProductionController.createFromWorkOrder` (L112-117) promotes DRAFT→APPROVED | Side effect on WO | Flag; P2 does not change it (off-limits); route new flow to Planning owner for approval-driven promote |
| Second status vocabulary | Data inconsistency | Rule 8: no vocabulary change; read-only reconciliation table only (§9) |
| Direct stock writes in new services | Inventory corruption | Rule 9: new services route via `InventoryIntegrationService`/`StockService` only; static-scan gate |

---

## 24. P2 IMPLEMENTATION SEQUENCE (ordered; only after approval)

0. **Capture pre-change baseline + "before" behaviour-lock suite** (§28): record backend 175 / FE 34 / typecheck / lint 769 / static stock scan / existing JobCard endpoint behaviours. **Nothing modified.**
1. **V3** migration drafted (§27) + validated on disposable Postgres+Flyway: 4 additive columns + indexed FKs + null-safe idempotent `order_type` backfill + reconciliation verification (C1). No numbering seed / status-history table (out of approved scope).
2. **Entities**: extend `JobCard`/`JobCardSubjob` (additive fields + indexes)/repository methods; keep `work_order_number` strings (C1/C8).
3. **`ProductionJobCardService`**: extract JobCard create/update/actions/completion from `ProductionController` **incrementally** (C5, strict behavior lock: endpoint/status/inventory contract preserved, `StockService` not modified); refactor `ProductionController` JobCard endpoints to thin delegates.
4. **`ProductionOrderService`** + **`ProductionOrderController`** (single thin `/api/v1/production/orders` alias that **delegates to existing Planning owner**, NO parallel implementation, NO dual-write; C2).
5. **FE**: correct stale `production.types.ts`; add order endpoints+hooks; fix print URL; wire `job-card/` + new `order/` via `productionApi` (C6: no UI redesign, no workflow change, no duplicate interfaces, contracts reflected accurately).
6. **Tests**: run "after" behaviour-lock regression + new unit tests + migration/reconciliation validation + static stock-write scan + FE typecheck/test/lint.
7. Produce **P2 completion report (DOCUMENT_22)** with gate result (PASS/CONDITIONAL/FAIL) and **STOP** for P2 gate approval.

---

## 25. P2 STOP GATE — CONTROLLED APPROVALS (RESOLVED 2026-09-03)

**Action: DO NOT proceed beyond a presenting-change-set.**

Per User P2 Rules 1–12, implementation is **prohibited** until this plan was explicitly approved.
The 8 decisions were returned as **controlled approvals**. Status resolved; controlled constraints are now normative.

### Decision resolution

| # | Requested | Approval | Controlled conditions (normative) |
|---|---|---|---|
| D1 | V3 additive columns | **APPROVE WITH CONDITIONS** | ⚠️ §18/25-C1 |
| D2 | `/api/v1/production/orders` alias | **APPROVE WITH CONDITIONS** | ⚠️ §25-C2 |
| D3 | No `prod_order` table | **APPROVED** (unchanged) | `work_order` canonical; no 2nd PO source of truth |
| D4 | Option C incremental alignment | **APPROVED** (unchanged) | B rejected; do not change inheritance in P2 |
| D5 | `ProductionJobCardService` extraction | **APPROVE WITH STRICT BEHAVIOR LOCK** | ⚠️ §25-C5 |
| D6 | Frontend work | **APPROVE WITH SCOPE CONTROL** | ⚠️ §25-C6 |
| D7 | Runtime numbering | **APPROVED** (unchanged) | No runtime numbering change in P2; canonicalization deferred with dedicated testing |
| D8 | `job_order` out of scope | **APPROVED** (unchanged) | No schema/API/workflow/service/ownership change; treat as Purchase/Subcontract |

### Controlled conditions (normative — MUST be satisfied)

**C1 — V3 additive columns (D1):**
- Applies exactly: `work_order.order_type`, `job_card.work_order_id`, `job_card.route_operation_id`, `job_card_subjob.route_operation_id`.
- Strictly **additive** migration only — **no DROP, no RENAME, no semantic change** to existing columns.
- **Keep** legacy `work_order_number` string compatibility (do not drop/rename).
- Backfill must be **idempotent and null-safe**.
- **Do not add `NOT NULL`** until data reconciliation passes.
- **Add required indexes** (see §18).
- **Provide reconciliation verification** between legacy string references (`work_order_number`) and new IDs (`work_order_id`).

**C2 — `/api/v1/production/orders` alias (D2):**
- Must **reuse existing `work_order` domain/persistence**.
- Do **not duplicate** Work Order business logic.
- Do **not create a parallel controller/service implementation** (one thin alias controller delegating to the existing Planning owner).
- Existing Work Order APIs must remain **backward compatible**.
- Canonical terminology: **Production Order = business/domain terminology**; **Work Order = existing persistence/compatibility terminology**.

**C3 — No `prod_order` (D3):** `work_order` remains the canonical persistence model. No `prod_order` table, no second Production Order source of truth.

**C4 — Option C (D4):** Reject BaseDoc re-parenting in P2. Do not change inheritance structures during P2.

**C5 — `ProductionJobCardService` strict behavior lock (D5):**
- Preserve **all existing endpoint contracts**.
- Preserve **existing status behavior**.
- Preserve **existing inventory posting behavior**.
- Move Job Card business logic **incrementally**.
- Do **not modify `StockService`**.
- **Add regression tests before AND after** extraction.
- Target architecture:
  ```text
  ProductionController
          ↓
  ProductionJobCardService
          ↓
  Inventory integration boundary
          ↓
  StockService
  ```
- Do **not** refactor unrelated ProductionController functionality (Entry/Return/Conversion/Log/Idle untouched).

**C6 — Frontend scope control (D6):**
- Approved: (a) stale production type corrections, (b) Job Card service/hook integration, (c) Production Order service/hook integration, (d) print URL correction.
- **No Production UI redesign**.
- **No unnecessary workflow changes**.
- Backend DTO/API contracts must be reflected accurately (no drift).
- **No duplicate domain interfaces** (no parallel duplicate of `productionApi`/`useProduction`).

**C7 — Runtime numbering (D7):** No runtime numbering behavior change in P2. Do not switch existing code to `nextNumberFromConfig()` during P2. Canonical numbering migration remains a **separate future change** with dedicated concurrency, draft, refresh, and duplicate-number testing.

**C8 — `job_order` out of scope (D8):** Do not modify `job_order` schema/APIs/workflows/services/ownership boundaries. Treat as the existing Purchase/Subcontract domain.

### Required pre-implementation deliverables (before touching source)

1. **Final file-by-file modification list** (§26).
2. **Final V3 migration design** (§27).
3. **Pre-change baseline test results** (§28).
4. **Explicit mapping of each P2 change to ADR/DOC requirements** (§29).

After P2 implementation completes: **STOP and wait for review before starting P3.**

---

## 26. FINAL FILE-BY-FILE MODIFICATION LIST (deliverable 1)

### CREATE (backend)
| File | Class | Purpose (compliance) |
|---|---|---|
| `zyger-erp-backend/src/main/resources/db/migration/V3__work_order_po_discriminator.sql` | CREATE | V3 additive migration (§27) |
| `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionOrderService.java` | CREATE | Thin alias service → delegates to existing Planning owner; no duplicate logic (C2/D3) |
| `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/controller/ProductionOrderController.java` | CREATE | Single thin controller, `/api/v1/production/orders`, calls `ProductionOrderService` only (C2) |
| `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionJobCardService.java` | CREATE | Incremental JobCard business-logic extraction (C5) |
| `zyger-erp-backend/src/main/java/in/zygertechnology/zygererp/service/ProductionStockBoundary.java` | CREATE | **Inventory integration boundary** between JobCardService and StockService (C5 target arch) |
| Tests: `ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `StatusMapTranslationTest`, `V3MigrationValidationTest`, `WorkOrderIdReconciliationTest` | CREATE | Unit + migration + reconciliation coverage (§21) |

### EXTEND (backend — additive only)
| File | Class | Addition (compliance) |
|---|---|---|
| `entity/JobCard.java` | EXTEND | `workOrderId` (nullable FK → work_order), `routeOperationId` (nullable), indexed (C1) |
| `entity/JobCardSubjob.java` | EXTEND | `routeOperationId` (nullable), indexed (C1) |
| `repo/JobCardRepository.java` | EXTEND | lookup-by-`workOrerId`/`routeOperationId` (reconciliation, C1) |

### EXTEND (backend — thin delegation only, contract-locked)
| File | Class | Change |
|---|---|---|
| `controller/ProductionController.java` | REFACTOR (JobCard endpoints only) | Replace inline logic with `ProductionJobCardService` delegate; preserve endpoint/status/inventory contract; Entry/Return/Conversion/Log/Idle **untouched** (C5) |

### FRONTEND
| File | Class | Change (compliance) |
|---|---|---|
| `zyger-erp-frontend/src/types/production/production.types.ts` | CORRECT | Align stale field names to real backend DTO (C6a) |
| `zyger-erp-frontend/src/services/production-api.ts` | EXTEND | Add `order` endpoints; fix print URL; keep single interface (C6b/d) |
| `zyger-erp-frontend/src/hooks/useProduction.ts` | EXTEND | Add order hooks; job-card hook wiring (C6b/c) |
| `zyger-erp-frontend/src/pages/production/order/` | CREATE | PO list/screen via `/api/v1/production/orders` alias (C2/C6) |
| `zyger-erp-frontend/src/pages/production/job-card/JobCardScreen.tsx` | REFACTOR | Route through hooks; same UI behaviour; no redesign (C6) |

### OFF-LIMITS (no change — verbatim from §17)
`WorkflowStateMachine`, `PlanningService`, `PlanningController`, `ProductionController` non-JobCard endpoints, `production_entry*`, `StockService`, `StockBalanceRepository`, `stock_balance`, `V1__baseline.sql`, app YAML, Hibernate mappings, `DocTypes`, `DocNumberService`, FRS docs, `job_order`/Purchase module (D8).

---

## 27. FINAL V3 MIGRATION DESIGN (deliverable 2)

`V3__work_order_po_discriminator.sql` — **strictly additive, idempotent, null-safe** (C1):

```sql
-- work_order: PO discriminator (backfill idempotent + null-safe)
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS order_type VARCHAR;
UPDATE work_order SET order_type = 'SINGLE' WHERE order_type IS NULL;

-- job_card: additive nullable FK to work_order + route traceability
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS work_order_id BIGINT;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS route_operation_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_job_card_work_order_id      ON job_card(work_order_id);
CREATE INDEX IF NOT EXISTS idx_job_card_route_operation_id ON job_card(route_operation_id);

-- job_card_subjob: route traceability
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS route_operation_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_job_card_subjob_route_operation_id ON job_card_subjob(route_operation_id);
```

**Consistency with C1:** `IF NOT EXISTS` (idempotent); `WHERE order_type IS NULL` (null-safe); all columns nullable; **no NOT NULL**; **no DROP/RENAME/re-type**; **no `work_order_number` string removal**; **no numbering-config seed / no status-history table** (out of scope).

**Forward fill (NOT NULL decision deferred):** `order_type`/`work_order_id`/`route_operation_id` remain nullable. NOT NULL is considered **only after** the reconciliation report (§22) passes on all rows; that decision is a separate approved change, not part of V3.

**Reconciliation verification (C1):**
```sql
-- every job_card must have a consistent link
SELECT jc.id, jc.work_order_number, jc.work_order_id, wo.wo_number
FROM job_card jc LEFT JOIN work_order wo ON wo.id = jc.work_order_id;
```
Gate: for every row, `jc.work_order_number` (string) must equal the resolved `wo.wo_number` (by `work_order_id`); any mismatch → STOP. Relationship populates `work_order_id` from the existing `findByWoNumber`/`docNo` lookup at JobCard creation.

---

## 28. PRE-CHANGE BASELINE TEST RESULTS (deliverable 3)

**Captured on 2026-09-03, immediately before any source modification. Verified by re-run this session.**

| Check | Result | Detail |
|---|---|---|
| Backend unit/integration tests | **175 tests, 0 failures, 0 errors, 0 skipped** | 57 test files; `BUILD SUCCESSFUL` (`./gradlew test --rerun-tasks`) |
| Frontend tests | **34 passed** (5 files) | `npm run test` |
| Frontend typecheck | **PASS (exit 0)** | `tsc -b --pretty` |
| Frontend lint | **769 problems (31 errors, 738 warnings)** | pre-existing baseline; `1 error fixable` |
| **Production direct stock writes** | **NONE** | static scan: no `StockBalanceRepository`/`StockBalance` usage in `ProductionController`; `InventoryIntegrationService` never touches `stock_balance`/`StockBalanceRepository`; StockService-only elsewhere |
| P1 numbering seeds | DORMANT (no runtime effect) | `job-card`→JC/`production-entry`→PE/etc. seeded; production flows use 2-arg `numbers.next` (bypass) |
| `work-order` prefix | `WO` (DocTypes) | not seeded; config not consulted in 2-arg path |

**Baseline is the reference for the "before" behaviour-lock suite** (C5) and post-P2 regression comparison gate.

---

## 29. P2 CHANGE → ADR/DOC MAPPING (deliverable 4)

| P2 change | ADR/DOC requirement | Compliance |
|---|---|---|
| `work_order.order_type` + retained `work_order` canonical | ADR-PROD-002; Rule 2/5; DOC 18 V3 | ✓ P2 assigns PO discriminator, keeps WO as single source of truth |
| No `prod_order` table | ADR-PROD-002; DOC 12 conflict override; Rule 2; D3 | ✓ no second PO source of truth |
| `/api/v1/production/orders` alias → delegates to WO | DOC 13 `/orders`; DOC 18 P2 reuse directive; Rule 5; C2 | ✓ additive alias, no parallel implementation |
| `job_card.work_order_id`/`route_operation_id`, subjob `route_operation_id` | DOC 11 §3.6 subjob↔route traceability; C1 | ✓ additive FKs/traceability, reconciled vs string |
| `ProductionJobCardService` extraction + `ProductionStockBoundary` | DOC 10 layering; DOC 18; Rule 5; C5 | ✓ JobCard logic out of controller; inventory via boundary→StockService only (Rule 9) |
| JobCard/Subjob Option C (no BaseDoc re-parent) | Rule 11 additive/backward-compat; D4 | ✓ no inheritance change in P2 |
| FE layers (types/service/hooks/`)` + print URL fix | DOC 10; DOC 18 FE; C6 | ✓ mirrors DTO contracts; single interface; no redesign |
| No runtime numbering change / seeds dormant | Rule 10/11; D7 | ✓ no `nextNumberFromConfig` switch in P2; canonicalization deferred with dedicated testing |
| `job_order` untouched | Rule 2; D8 | ✓ Purchase/Subcontract domain fully separate |
| WorkOrder status non-canonical write (L112-117) | Rule 8; ADR-002 ownership | flagged only; not changed in P2; routed to Planning owner in future |

---

## 30. P2 END-OF-PHASE GATE

After implementation: produce **DOCUMENT_22 (P2 completion report)** with:
- Post-change baseline comparison vs §28 (backend/FE/typecheck/lint/stock-write scan).
- "After" behaviour-lock suite vs "before" — must show identical JobCard endpoint/status/inventory behaviour.
- V3 migration + reconciliation report (C1) results.
- Gate result: PASS / CONDITIONAL / FAIL.
- **STOP and wait for review before starting P3.** Do not proceed to P3 (op-event engine / `prod_execution_session` / `prod_operation_event`) without explicit P3 scope approval.

---
**End of P2 Final Change Plan (incl. pre-implementation deliverables §26–§30).** Controlled approvals recorded. Baseline verified. Awaiting no further gate — implementation proceeds on these approved specifications.