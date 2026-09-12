# DOCUMENT 16 — PRODUCTION TECHNICAL IMPLEMENTATION PLAN

| Field | Value |
|---|---|
| Document ID | DOCUMENT_16 |
| Title | Production Module Technical Implementation Plan |
| Functional Source of Truth | DOCUMENTS 01–15 (Approved Production FRS Baseline v1.0) |
| Technical Source of Truth | Existing Zyger ERP codebase (this analysis) |
| Technology Stack | React 19 + Vite (FE) · Spring Boot 4.1 / Java 25 / Gradle (BE) · PostgreSQL 16 (DB) |
| Baseline Version | 1.0 — Approved for Development |
| Status | Technical bridge — READ FOR REVIEW & APPROVAL before any coding |

> **Purpose.** This document maps the approved Production FRS (DOC 01–15) onto the **actual existing
> Zyger ERP codebase**. It is a **safe and precise bridge** (Approved FRS → Existing Codebase →
> Implementation). It does **not** redesign requirements, does **not** add requirements, and does
> **not** change approved decisions.
>
> **Guarantees.** This document:
> - Preserves the FRS as the single functional source of truth.
> - Reuses the existing codebase wherever it is production-quality and FRS-consistent.
> - Flags every conflict and marks each with a required technical decision — nothing is silently
>   rewritten, and nothing is created in parallel to an existing equivalent.
> - Classifies every component as **REUSE / EXTEND / REFACTOR / REPLACE / CREATE NEW**.
> - Produces **no SQL migrations, no source edits** — it is analysis and design only.

---

## EXECUTIVE SUMMARY — KEY FINDINGS

1. **The existing Zyger ERP already contains a substantial Production implementation**, backend
   controller `ProductionController` (+ services `ProductionRollupService`,
   `ProductionEntryValidationService`) and frontend pages under `src/pages/production/*`. It is
   **functional but not FRS-compliant** in architecture.
2. **Strong reusable engines exist** that align with the FRS:
   - `DocNumberService` + `doc_sequence`/`numbering_config` → server-side, FY-based, concurrency-safe
     numbering (FRS numbering rule).
   - `DocumentFacade` + `doc_status_history` + `DocumentWorkflowEngine` → universal document lifecycle
     (FRS workflow).
   - `WorkflowStateMachine.validateTransition(docType, status, action)` → state-machine guard
     (DOC 11 status dictionary).
   - `StockService.recordStockIn/Out/Adjustment` + `stock_balance`/`stock_ledger`/
     `posting_idempotency_key` → **controlled Inventory Transaction Engine** (FRS inventory-integrity rule).
   - `GlobalExceptionHandler` + `ApiEnvelope` + `AuditEntityListener` + `AuditFlushFilter` + audit tables.
3. **The single largest architectural conflict** is DEC-PROD-001. The FRS mandates a *hybrid
   final-part-centric workspace over **normalized operation-level events*** with a distinct
   operation-event model and **first-class Rejection/Scrap/Rework documents**. The existing
   `production_entry` is a **wide single-row entity** (good/rejected/scrap/rework as columns on one
   row) with `production_entry_material`/`production_entry_operator` child rows. This is a
   **CONFLICT → REQUIRES DECISION** (Section 5 lists both options with a recommendation).
4. **Frontend production screens bypass the service/hook layer**: they call `apiClient` directly,
   with inline TypeScript interfaces (no `src/types/production/*`, no `src/services/production-api.ts`,
   no `src/hooks/useProduction.ts`). Bringing FRS scope to a sustainable form requires introducing the
   layered service/hook/types pattern already used by Quality/Inventory.
5. **Controller-heavy backend**: `ProductionController` injects ~18 repositories directly and
   contains business logic (against FRS layering: *Controllers must not contain business logic*).
6. **No Production features risk "duplicate architecture"** because the FRS specifies *different,
   additional* document types (Rejection, Scrap, Idle/Stoppage, Deviation, Pending, Conversion,
   Disassembly) that the existing code models only partially.

---

# PART 1 — EXISTING CODEBASE ANALYSIS

Classify each existing component: **REUSE / EXTEND / REFACTOR / REPLACE / CREATE NEW**.

## 1.1 Backend — Project & Configuration

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `build.gradle` | `zyger-erp-backend/build.gradle` | Spring Boot 4.1 / Java 25, JPA, Security, Validation, WebMVC, Flyway, Lombok, JJWT, OpenPDF, springdoc, Cache, Actuator, Testcontainers | **REUSE** | None for Production; add MapStruct only if the team opts for it (optional) | Tech baseline |
| `settings.gradle` | `zyger-erp-backend/settings.gradle` | Single-module build | **REUSE** | None | Tech baseline |
| `application*.yaml` | `src/main/resources/` | datasource, JPA (`ddl-auto` validate), Flyway enable, server port 9090 | **REUSE** | None | Tech baseline |
| `GlobalExceptionHandler` | `config/GlobalExceptionHandler.java` | `@RestControllerAdvice` mapping OptimisticLock/IllegalState/IllegalArgument/Security/BusinessRule/RateLimit/Validation errors | **REUSE** | Add Production-specific `BusinessRuleException` codes if needed | DOC 13 error contract |
| `ApiEnvelope` | `common/ApiEnvelope.java` | Uniform response envelope | **REUSE** | Ensure Production responses follow it | DOC 13 envelope |
| `CorrelationIdFilter` | `config/CorrelationIdFilter.java` | Trace correlation id | **REUSE** | None | — |
| `PlantScopingFilter` | `config/PlantScopingFilter.java` | Multi-plant scoping | **REUSE** | Production queries must be plant-scoped | NUM-PROD `{PLANT}` |
| `RateLimiter`/`RateLimitFilter` | `config/` | API rate limiting | **REUSE** | None | — |
| `IdempotencyAspect`/`Idempotent` | `common/` | Idempotent writes | **REUSE** | Apply to Production write endpoints | DOC 13 envelope; inventory integrity |
| `AuditEntityListener`/`AuditFlushFilter`/`AuditLogCollector` | `config/` | JPA + batch audit capturing (audit_logs, master_audit_log) | **REUSE** | New Production entities must use `@EntityListeners(AuditEntityListener.class)` | DOC 12 audit; DOC 11 reversals |
| `SchedulingConfig` | `config/SchedulingConfig.java` | Scheduled jobs (OEE, escalations, low stock, overdue WOs) | **REUSE** | Add Production-specific scheduled jobs in Production scope (e.g. pending reconciliation) | DOC 14; planning layer |

## 1.2 Backend — Security & Authorization

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `SecurityConfig` | `security/SecurityConfig.java` | Filter chain, JWT, endpoint security | **REUSE** | Register `/api/v1/production/**` per existing policy | DOC 13 auth |
| `JwtAuthFilter`, `JwtService`, `CurrentUserRoles` | `security/` | JWT authentication, current-role resolution | **REUSE** | None | DOC 13 auth |
| `RbacAspect` + `@RequirePermission` + `RbacServiceBridge` | `security/` | RBAC permission enforcement | **REUSE** | Add Production permissions consistent with `rbac.ts` (already has `production` module) | DOC 09 roles; DOC 11 VALIDATED role |
| Permission tables | `permissions`, `role_permissions`, `user_screen_permissions` | Role/screen permission storage | **REUSE** | Seed any new Production screen keys | DOC 09 screen roles |

## 1.3 Backend — Document / Numbering / Workflow Engines (HIGH REUSE)

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `DocNumberService` | `service/DocNumberService.java` | Server-side doc numbering: `next(docType)`, `next(docType,prefix)`, `nextFy(prefix)`, `nextNumberFromConfig(docType,plantId)`, `peek`, `allocate` | **REUSE** | Production doc types (PO/WO/JC/Entry/Rejection/Scrap/Conversion/Disassembly/Deviation/Idle/Stoppage/Return) registered in numbering engine | DOC 07 §21 (NUM-PROD-*); requires server-side, concurrency-safe, reserved-not-reused |
| `doc_sequence`, `numbering_config` | `V1__baseline.sql` | Sequence/config storage for numbering | **REUSE** | Add production doc-type rows | DOC 12 `num_reservation` (align naming) |
| `DocumentFacade` | `service/DocumentFacade.java` | Universal document registry (`isRegistered`, `getByNumber`, `toRow`) | **REUSE** | Register production docs | DOC 11 lifecycle; DOC 12 |
| `DocumentWorkflowEngine`, `DocumentValidationService`, `DocumentPaginationService`, `DocumentRowMapper` | `service/` | Generic doc workflow/validation/pagination | **REUSE** | None | DOC 11; DOC 13 |
| `WorkflowStateMachine` | `service/WorkflowStateMachine.java` | `validateTransition(docType,currentStatus,action)`, `canTransition`, `getAllowedActions` | **REUSE** | Populate Production status-dictionary transitions per DOC 11 §1–2 | DOC 11; WF-GAP-001..006 |
| `doc_status_history` | `V1__baseline.sql` | Status transition history | **REUSE** | Production writes status history via this table | DOC 11, DOC 12 |

## 1.4 Backend — Inventory Transaction Engine (HIGH REUSE — alignment with FRS rule)

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `StockService` | `service/StockService.java` | **Controlled inventory engine**: `recordStockIn/Out/Adjustment`, `releaseQcHold`, `disposeHeldStock`, `verifyStockAvailability`, balances view | **REUSE (core)** | Production must call this engine for every movement (issues, receipts, returns) — **never direct `stock_balance` update** | DOC 10 BR-PROD-INV-*; DOC 12 §13; DEC-PROD-003 |
| `stock_balance`, `stock_ledger`, `posting_idempotency_key` | `V1__baseline.sql` | Balance + ledger + idempotency storage | **REUSE** | None | DOC 12 §13 inventory-transaction integrity |
| `StockController` | `controller/StockController.java` | Stock endpoints | **REUSE** | None | — |

## 1.5 Backend — Existing Production Implementation (CONFLICT / EXTEND / REFACTOR)

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `ProductionController` | `controller/ProductionController.java` | Job Card CRUD + workflow; Production Entry CRUD + workflow; Conversion, Return, Log Sheet, Idle Time; Production reports (rejection/rework/idle/machine/operator summaries) | **REFACTOR** (major) | **Business logic lives in the controller and directly injects ~18 repositories — violates FRS layering.** Extract orchestration into Production services; controllers become thin | DOC 13; DOC 10; layering rule |
| `ProductionRollupService` | `service/ProductionRollupService.java` | Rollup/derived production aggregates (OEE/costing) | **EXTEND** | Align with operation-event model + first-class rejection/scrap/rework docs | DOC 03 §8 OEE; DOC 12 |
| `ProductionEntryValidationService` | `service/ProductionEntryValidationService.java` | Validation for production entry | **EXTEND** | Align validation with FRS BRs (BR-PROD-ENTRY-*, BR-PROD-004 late-entry) | DOC 10; DOC 09 XF-* |
| `JobOrderReconciliationService` | `service/JobOrderReconciliationService.java` | WO/JC reconciliation | **EXTEND** | Keep; reconcile to QTY-RECONCILE semantics | DOC 10 decision function |
| `ProdSafetyCheck` | `config/ProdSafetyCheck.java` | Production safety guard | **REUSE** | None | — |
| Existing production entities | `entity/*` (`JobCard`, `JobCardSubjob`, `ProductionEntry`, `ProductionEntry*`, `ProductConversion*`, `ProductionReturn`, `ProductionLogSheet`, `ProductionLogActivity`, `IdleTimeEntry`, `WorkOrder*`, `ProductionBOM*`, `RouteSheet*`, `MaterialPlan*`) | Current data model | **SEE PART 5** | Models do not match DOC 12 `prod_*` normalized op-event model | DOC 12 |

## 1.6 Backend — Existing Planning / Masters

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `PlanningController` | `controller/PlanningController.java` | Work Order, BOM, Route Sheet, Material Plan, FG Possible, Machine Load, ECR, Gap Analysis, Cost Estimation | **EXTEND / REUSE** | Work Order modelling must align with TERM-PROD-001 (PO=planning, WO=execution) | DOC 07 §02; TERM-PROD-001 |
| `PlanningMasterController`, `MasterController`, `MasterDataController` | `controller/` | Item, Machine, Work-Center, Operation, Process, Supplier, Party, Store/Rack/Bin, Plant masters | **REUSE** | Masters looked up/validated by Production — no duplication | DOC 03 §5 masters |
| Item Master tables | `item_master`, `item_group`, `item_supplier`, `bom_mapping`, `item_bom_component`, `multi_level_bom` | Item + BOM | **REUSE** | Production consumes BOM for MRP/material (BR-PROD-MATL) | DOC 03 §5; BR-PROD-MATL-001 |
| Route Sheet tables | `route_sheet`, `route_operation`, `route_operation_inspection`, `route_operation_tool` | Routing | **REUSE** | Production consumes route for operation events | DOC 03 §5 |
| Store/Rack/Bin | `store_master`, `rack_master`, `bin_master`, `location_master` | Physical storage | **REUSE** | Production issues material from these | DOC 03 §5 |
| Shop floor | `shop_floor_entry` | Shop-floor entry | **REUSE/REFACTOR** | Align with FRS Production Entry (may conflict — see PART 5) | DOC 08 SCR-PROD-ENTRY |

## 1.7 Frontend — Foundation & Shared

| Component | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `axiosClient` | `src/api/axiosClient.ts` | Axios instance; token injection; envelope unwrap; 401/403/409 handling; retry | **REUSE** | Production API calls must go through it | DOC 13 |
| `screenRegistry.tsx` | `src/config/screenRegistry.tsx` | Lazy screen registry `SCREEN_REGISTRY` | **EXTEND** | Register new Production screens | DOC 08/09 |
| `navigation.ts` | `src/config/navigation.ts` | Nav tree; already has `production` group | **EXTEND** | Add missing Production screens under `production` | DOC 08 |
| `rbac.ts` | `src/config/rbac.ts` | Roles/permissions; already has `production` module + actions | **REUSE** | Add any new screen-level permissions | DOC 09 |
| `AuthContext` / `RequirePermission` | `src/contexts/AuthContext.tsx`, `src/components/auth/RequirePermission.tsx` | Auth + permission gate | **REUSE** | Gate new screens | DOC 09 |
| `StatusBadge`, `WorkflowStatusStepper`, `FormActions`, `ConfirmActionModal`, `AuditHistoryDrawer`, `SkeletonLoader`, `ErrorBoundary`, `ItemSearchDropdown`, `ConflictModal` | `src/components/common/` | Shared UI primitives (status, workflow, forms, audit, loading, errors, 409) | **REUSE** | Adopt in all new Production screens | DOC 08/09/11 |
| `ToastContext`, `getApiErrorMessage`, `useFormValidation` | `src/contexts`, `src/utils`, `src/hooks` | Toasts, error text, basic validation | **REUSE/EXTEND** | FRS requires richer validation (DOC 09 XF-*) | DOC 09 |

## 1.8 Frontend — Existing Production Pages

| Page | Location | Current Responsibility | Reusability | Required changes | FRS dependency |
|---|---|---|---|---|---|
| `JobCardScreen` | `src/pages/production/job-card/JobCardScreen.tsx` | JC list + form + subjobs + workflow (monolithic ~700 lines) | **REFACTOR** | Split into template/render components; route to service/hooks | SCR-PROD-JOBCARD-* |
| `ProductionEntryScreen` (+ modals) | `src/pages/production/production-entry/*` | Production entry + operator/rejection/rework reason modals | **REFACTOR** | Map to DEC-PROD-001 final-part workspace over op-level events; use service/hooks | SCR-PROD-ENTRY-* |
| `ProductConversionScreen` | `product-conversion/` | Conversion entry | **EXTEND** | Wire to service/hooks; keep | SCR-PROD-CONV-* |
| `ProductionReturnScreen` | `production-return/` | Return entry | **EXTEND** | Wire to service/hooks | SCR-PROD-RETURN |
| `ProductionLogScreen` | `production-log/` | Log sheet | **EXTEND** | Wire to service/hooks | SCR-PROD-LOG-* |
| `IdleTimeScreen` | `idle-time/` | Idle time | **EXTEND** | Wire to service/hooks | SCR-PROD-IDLE-* |
| `ProductionPendingScreen` | `production-pending/` | Pending | **EXTEND** | Wire to service/hooks | SCR-PROD-PEND-* |
| `ProductionDashboard` | `production/dashboard/` | Production dashboard | **REUSE/EXTEND** | Add FRS KPIs | DOC 14 |
| `JobCardKanban` | `production/kanban/` | Kanban | **REUSE** | None | — |
| `ProductionBomScreen` | `production/bom/` | BOM (under production) | **REUSE** | none | — |

> **Frontend gap:** there is **no** `src/services/production-api.ts`, **no** `src/hooks/useProduction.ts`,
> and **no** `src/types/production/*`. Production pages call `apiClient` directly with inline
> interfaces. Quality/Inventory demonstrate the intended layered pattern. This is a required
> FRONTEND REFACTOR to keep FRS scope maintainable. (CREATE NEW service/hooks/types.)

## 1.9 Frontend — Missing Screens (CREATE NEW)

Screens required by DOC 08/09 that have **no** existing page — all **CREATE NEW**, following the
Quality `Page/List/Form` trio + `planningDocConfigs.ts` config pattern where applicable:

| New Screen | FRS ref | Location to create | Notes |
|---|---|---|---|
| Production Order (PO, Composite, Rework, Short Close) | SCR-PROD-ORDER-001..004 | `src/pages/production/order/` | Merged with Work Order; TERM-PROD-001 |
| Job Card Kanban (exists) | — | reuse | |
| Material Request (MREQ/Addl/Other/Consumable) | SCR-PROD-MREQ-001..003, SCR-PROD-CONSUMABLE-001 | `src/pages/production/material-request/` | |
| Material Consumption | SCR-PROD-CONSUME-001 | `src/pages/production/material-consumption/` | |
| Production Output | SCR-PROD-OUT-001 | `src/pages/production/output/` | Multiple-output |
| Rework screen | SCR-PROD-REWORK-001 | `src/pages/production/rework/` | |
| Rejection screen | SCR-PROD-REJ-001 | `src/pages/production/rejection/` | BR-PROD-REJ-001 |
| Scrap screen | SCR-PROD-SCRAP-001 | `src/pages/production/scrap/` | BR-PROD-SCRAP-001 |
| Line Stoppage | SCR-PROD-STOP-001 | `src/pages/production/stoppage/` | + idle (exists) |
| Deviation / Delay / Non-Conformity | SCR-PROD-DEV-001, DLVY-001, NCONF-001 | `src/pages/production/deviation/` | |
| WIP / Pending (Pending exists) | SCR-PROD-WIP-001, PEND-001 | `src/pages/production/wip/` | |
| Item Change | SCR-PROD-ITEMCHG-001 | `src/pages/production/item-change/` | |
| Disassembly | SCR-PROD-DISASM-001 | `src/pages/production/disassembly/` | |
| Planning screens (Daily/Weekly/Monthly/Time-Bucket, WC, Capacity, Manpower, Budget, Forecast) | SCR-PROD-PLAN-001..006, SCR-PROD-WC-001/002, SCR-PROD-CAP-001 | `src/pages/production/planning/` | Phase P8 |
| OEE / Reports / Dashboards | — | `src/pages/production/reports/` | Phase P10 |

---

# PART 2 — ARCHITECTURE GAP ANALYSIS

Format: **FRS Requirement → Existing Implementation → Gap → Recommended Technical Action**

| FRS Requirement | Existing Implementation | Gap | Recommended Action |
|---|---|---|---|
| DEC-PROD-001: hybrid final-part-centric workspace over **normalized operation-level events** | `production_entry` is a **wide single row** (good/rejected/scrap/rework columns) with `production_entry_material`/`operator` child tables | No normalized `prod_operation_event` concept; rejection/scrap/rework are columns, not first-class documents | **CONFLICT → DECISION (Section 5).** Recommended: model FRS operation-event + first-class Rej/Scrap/Rework docs; migrate/interpret existing production_entry |
| `BR-PROD-REJ-001`/`BR-PROD-SCRAP-001`: first-class Rejection/Scrap **documents** (own number, lifecycle, authorization) | `production_entry` has `rejected_quantity`/`scrap_quantity`/`rework_quantity` columns; `production_entry_rejection`/`rework` child tables exist | Rejection/Scrap not independently-numbered/authorized documents | CREATE Rejection/Scrap document entities + numbered workflows (API-REJ/API-SCRAP) |
| `NUM-PROD-*` numbering + `num_reservation` reserved-not-reused | `DocNumberService` + `doc_sequence`/`numbering_config` exist | Table is named `num_reservation` in DOC 12 vs existing `doc_sequence`/`numbering_config`; conceptual parity exists | REUSE `DocNumberService`; align Production reservations to it (no new numbering engine) |
| DOC 11 status dictionary per entity | `WorkflowStateMachine` + workflow actions exist per controller; `doc_status_history` exists | Production entities may not all be registered with DOC 11 transitions | Register each Production doc with DOC 11 transitions in WorkflowStateMachine |
| Inventory-transaction integrity (no direct stock write) | `StockService` controlled engine + `stock_ledger` + `posting_idempotency_key` exists | **Already aligned — reuse, do not duplicate** | REUSE StockService for all Production issues/receipts/returns |
| Controllers must not contain business logic | `ProductionController` contains business logic and injects ~18 repos | FRS layering violation | REFACTOR: extract services (`ProductionOrderService`, `ProductionEntryService`, `MaterialRequestService`, `RejectionService`, `ScrapService`, etc.) |
| Field-wise validation (DOC 09 XF-*, 18-column contract) | Frontend uses `useFormValidation` (basic) + inline checks; no zod for production | Validation not centralized/rich | EXTEND: production zod schemas in `src/validation/schemas.ts` (or per screen) + server-side `DOC 09` validation |
| Production service layer + hooks + types (shakeout quality pattern) | Production pages call `apiClient` directly; no service/hooks/types | Missing layered frontend architecture | CREATE `src/services/production-api.ts`, `src/hooks/useProduction.ts`, `src/types/production/*` |
| Planning Layer (Day/Week/Month/TimeBucket/WC/Capacity/Budget/Forecast) | `PlanningController` has Machine Load, Material Plan, FG Possible, Cost Estimation; **no** bucket/time-capacity planning | Missing bucket- and capacity-planning features | CREATE planning-layer services/pages in Phase P8 (post reliable execution data) |
| OEE / PPM / manpower / machine / consumable / cost analytics | `OeeController` + `oee_daily` + `ProductionRollupService` + `machine_load_line` | Partial OEE; no FRS analytics bundle | EXTEND OEE/analytics in Phase P9 |
| Quality integration (PPAP status, NCR hand-off) | `QualityController`, `quality_ncr` exists | PPAP-block gating not wired into Production | EXTEND: Production→Quality rail (Phase P6/P9) |
| Maintenance hand-off (INT-GAP-004) | Maintenance module + `breakdown_*` + stoppage concepts exist | No production-stoppage→maintenance hand-off | EXTEND: `prod_stoppage.maintenance_ref` contract (external) |
| Masters (Item/Machine/WorkCenter/Operator/Route/BOM/Plant) | Master tables exist | Production must consume, not duplicate | REUSE |

## 2.1 Missing backend services (CREATE NEW)
- `ProductionOrderService` (PO/Composite/Rework/Short-Close) — TERM-PROD-001 alignment.
- `MaterialRequestService` (MREQ/Addl/Other/Consumable) + issue via StockService.
- `RejectionService`, `ScrapService` (first-class docs, BR-PROD-REJ-001/SCRAP-001).
- `IdleStoppageService`, `DeviationService`, `PendingService`, `ItemChangeService`, `DisassemblyService`.
- `PlanningLayerService` (bucket/capacity/manpower/budget/forecast).
- Production `-validator` classes for DOC 09 XF-* and BR authorization.

## 2.2 Missing APIs (from DOC 13)
Guidance — **do not duplicate existing endpoints.** Review DOC 13 `API-*` against existing
`/api/v1/production/**` and add only missing contracts (e.g. `API-REJ-*`, `API-SCRAP-*`,
`API-PLAN-*`, operation-event endpoints, material-request, disassembly/item-change).

## 2.3 Missing database tables
See PART 5. The FRS `prod_*` tables largely do **not** exist in the current schema (which uses
`production_entry_*`, `product_conversion_*`, etc.). Each is classified CREATE NEW / EXTEND / CONFLICT.

---

# PART 3 — PRODUCTION MODULE CODE ARCHITECTURE (Frontend)

Following the **existing** frontend conventions (feature folders under `src/pages/<module>/<feature>/`,
service/hooks/types layers, common components). No micro-features.

```
src/
  pages/production/
    order/                  Production Order (PO/Composite/Rework/Short-Close)
    job-card/               Job Card (exists) — refactor
    production-entry/       Production Entry — refactor to DEC-PROD-001
    material-request/       Material/Additional/Other/Consumable requests
    material-consumption/   Consumption
    output/                 Production Output / Multiple Output
    wip/                    WIP + Pending (Pending exists)
    rework/                 Rework
    rejection/              Rejection (new)
    scrap/                  Scrap (new)
    idle-time/              Idle (exists) + Line Stoppage
    deviation/              Deviation / Delay / NC
    return/                 Production Return (exists)
    conversion/             Conversion + Item Change + Disassembly
    planning/               Planning Layer (P8)
    reports/                OEE / Reports / Dashboards (P9/P10)

  services/production-api.ts      SERVICE LAYER (CREATE NEW)
  hooks/useProduction.ts          QUERY/MUTATION HOOKS (CREATE NEW)
  types/production/                TYPES (CREATE NEW)
  validation/productionSchemas.ts ZOD SCHEMAS (CREATE NEW)
  config/screenRegistry.tsx       EXTEND
  config/navigation.ts            EXTEND
```

Follow the **existing** patterns: `Page`/`List`/`Form` trio where appropriate, generic doc config
(`planningDocConfigs.ts`-style) for repetitive documents, `StatusBadge`/`WorkflowStatusStepper` for
DOC 11 status.

---

# PART 4 — BACKEND IMPLEMENTATION ARCHITECTURE

Follow the **existing** package layout `com...` (in.zygertechnology.zygererp). For every Production
domain (PO, JobCard, Entry, MaterialRequest, Rejection, Scrap, Rework, Idle/Stoppage, Deviation,
Conversion, ItemChange, Disassembly, WIP/Pending, Return, PlanningLayer), the structure is:

```
Controller (thin)  → Request DTO → Validator → Service (business logic) → Domain Entity → Repository
                       ↘ Mapper (DTO↔Entity) ↙                                     ↘ Mapper
```

**Rules:**
- Business logic lives in **Service/Domain** layer. **Controllers must not contain business logic.**
- DTOs: request/response separate, per existing convention.
- Mappers: reuse Pattern (manual mappers exist; MapStruct optional). No new mapping framework unless approved.
- Validators: per-domain validation services; enforce DOC 09 XF-* jobs line, DOC 10 BR authorization.
- Transactions: `@Transactional` at service boundary; write endpoints use idempotency aspect.
- Audit: entities use `@EntityListeners(AuditEntityListener.class)`.
- Numbering: every Production doc gets its number via `DocNumberService`.
- Workflow: every state change via `WorkflowStateMachine` + `doc_status_history`.
- Inventory: every movement via `StockService` (never direct balance update).

### 4.1 Domain service map (target)
| Domain | Controller (thin) | Service | ENTITIES map to DOC 12 `prod_*` |
|---|---|---|---|
| Production Order | `ProductionOrderController` | `ProductionOrderService` | `prod_order*` |
| Job Card | `JobCardController` (exists) | `ProductionJobCardService` (extract) | `prod_job_card`, `prod_subjob` |
| Production Entry | `ProductionEntryController` (exists) | `ProductionEntryService` (extract) | `prod_operation_event`, `prod_execution_session`, `prod_output_event`, `prod_log_entry` |
| Material Request/Consumption | `MaterialRequestController` | `MaterialRequestService` | `prod_req_*`, `prod_consumption_event` |
| Rejection | `RejectionController` | `RejectionService` | `prod_rejection*` |
| Scrap | `ScrapController` | `ScrapService` | `prod_scrap*` |
| Rework | `ReworkController` | `ReworkService` | `prod_rework_event` |
| Idle/Stoppage | `IdleStoppageController` | `IdleStoppageService` | `prod_idle`, `prod_stoppage` |
| Deviation/Delay/NC | `DeviationController` | `DeviationService` | `prod_deviation*`, `prod_delay_customer`, `prod_nconf` |
| WIP / Pending | `PendingController` | `PendingService` | `prod_*` derived views |
| Return | `ProductionReturnController` (exists) | `ReturnService` (extract) | `prod_*` + StockService |
| Conversion/ItemChange/Disassembly | `ConversionController` | `ConversionService` | `prod_conversion*`, `prod_item_change`, `prod_disassembly*` |
| Planning Layer | `PlanningLayerController` | `PlanningLayerService` | `prod_plan_*` |

---

# PART 5 — DATABASE IMPLEMENTATION PLAN

Compare DOC 12 `prod_*` against the **existing** baseline (`V1__baseline.sql`). Classification per
table: **EXISTS-REUSE / EXISTS-EXTEND / CREATE NEW / CONFLICT-REQUIRES-DECISION.**

> Because the existing schema models production with **different, workable tables** (`production_entry*`,
> `product_conversion*`, etc.) that do **not** carry DOC 12 `prod_*` names or the normalized
> operation-event shape, the **entire group is a CONFLICT requiring an explicit migration/map
> decision** (Section 5.2). Below are the DOC 12 `prod_*` tables with their disposition **assuming the
> recommended normalized model is adopted**; the alternative is to reuse/extend existing tables and map
> FRS fields onto them.

| DOC 12 table | Purpose | PK | Key FKs | Indexes / Uniques | Disposition | Related API / service |
|---|---|---|---|---|---|---|
| `prod_order`, `prod_order_line`, `prod_order_dates`, `prod_order_item`, `prod_order_x_member` | Production Order | id | work_order→wo, item→item_master, plant | unique order_no; idx plant/fy/status | CREATE NEW (or EXTEND existing `work_order`+`job_order`) | ProductionOrderService; API-PO-* |
| `prod_job_card` | Job Card | id | prod_order | unique jobcard_no | EXTEND existing `job_card` | JobCardService |
| `prod_subjob` | Subjob | id | prod_job_card | unique subjob_no | EXTEND existing `job_card_subjob` | JobCardService |
| `prod_operation_event` | Operation-level execution event (DEC-PROD-001) | id | prod_job_card / exec_session | idx operation/machine/operator | **CREATE NEW** (core gap) | ProductionEntryService; API-ENTRY-* |
| `prod_execution_session` | Execution session | id | prod_job_card | unique session_no | CREATE NEW | ProductionEntryService |
| `prod_output_event` | Output incl multiple-output weight/dest | id | operation_event / prod_order | idx item/dest | CREATE NEW | ProductionEntryService/OutputService |
| `prod_log_entry` | Production Log Sheet entry | id | prod_job_card | unique | EXTEND/CREATE | ProductionLogService |
| `prod_req_material(_line)`, `prod_req_addl(_line)`, `prod_req_other(_line)` | Material/Addl/Other requests | id | prod_order/item | unique req_no | CREATE NEW | MaterialRequestService; API-MREQ-* |
| `prod_consumable_consumption`, `prod_consumption_event` | Consumable + consumption | id | item/store | idx | CREATE NEW | ConsumptionService; API-CONSUME-* |
| `prod_rejection`, `prod_rejection_line` | Rejection document | id | prod_order/operation_event | unique rejection_no (`REJ-{plant}-{fy}-{seq}`) | **CREATE NEW** (first-class doc) | RejectionService; API-REJ-* |
| `prod_scrap`, `prod_scrap_line` | Scrap document | id | prod_order/operation_event | unique scrap_no | **CREATE NEW** (first-class doc) | ScrapService; API-SCRAP-* |
| `prod_rework_event` | Rework | id | operation_event | idx | CREATE NEW | ReworkService |
| `prod_idle` | Idle time | id | prod_job_card/machine | idx | EXTEND `idle_time_entry` | IdleStoppageService; API-IDLE-* |
| `prod_stoppage` | Line stoppage | id | machine/maintenance_ref | unique stoppage_no | CREATE NEW (align maintenance hand-off) | IdleStoppageService; API-STOP-* |
| `prod_deviation(_line)`, `prod_delay_customer` | Deviation / delay | id | prod_order | idx | CREATE NEW | DeviationService |
| `prod_nconf` | Non-conformity | id | operation_event/rejection | unique nconf_no | EXTEND `quality_ncr` | DeviationService/Quality rail |
| `prod_conversion(_line)` | Conversion | id | prod_order | unique conversion_no | **EXTEND/CONFLICT** `product_conversion*` | ConversionService; API-CONV-* |
| `prod_item_change` | Item change | id | prod_order | idx | CREATE NEW | ConversionService |
| `prod_disassembly(_line)` | Disassembly | id | prod_order | unique disasm_no | CREATE NEW | ConversionService |
| `prod_plan_rev`, `prod_plan_bucket(_line)`, `prod_plan_item_daily`, `prod_plan_demand`, `prod_plan_order_schedule` | Planning Layer | id | prod_order | idx | CREATE NEW (P8) | PlanningLayerService; API-PLAN-* |
| `prod_plan_wc(_load,_realloc)`, `prod_plan_budget(_line)` | WC load / budget | id | work_center | idx | CREATE NEW / EXTEND `machine_load_plan` | PlanningLayerService |
| `prod_document_audit` | Audit | id | — | idx owner | REUSE `audit_logs`/`master_audit_log` (align) | Audit components |

### 5.1 Crossref: existing tables → disposition
| Existing table | Disposition | Notes |
|---|---|---|
| `job_card`, `job_card_subjob` | EXTEND | Align to `prod_job_card`/`prod_subjob` semantics |
| `production_entry`, `production_entry_material`, `production_entry_operator`, `production_entry_rejection`, `production_entry_rework`, `production_entry_batch`, `production_entry_audit_log` | **CONFLICT → DECISION** | Wide-row model vs FRS normalized op-event model |
| `idle_time_entry`, `product_conversion*`, `production_return`, `production_log_sheet(_activity)`, `shop_floor_entry` | REFACTOR/EXTEND | Re-map to FRS fields |
| `work_order*`, `MaterialPlan*`, `RouteSheet*`, `ProductionBom*` | REUSE | Planning masters; align TERM-PROD-001 |
| `stock_balance`, `stock_ledger`, `posting_idempotency_key` | REUSE | Inventory engine (do not touch) |
| `doc_sequence`, `numbering_config`, `doc_status_history` | REUSE | Numbering/workflow (do not touch) |

### 5.2 DECISION — DEC-PROD-001 data model (REQUIRED)
> **Recommended:** Adopt the FRS normalized operation-event model (`prod_operation_event`,
> `prod_execution_session`, `prod_output_event`) as **new** tables, and map/interpret existing
> `production_entry*` data into them via a **backfill/migration** step (record-level mapping, not a
> destructive rewrite). Keep rejection/scrap/rework as **first-class documents** (new tables), sourced
> from existing `production_entry_rejection`/`rework` where data exists.
> **Alternative:** Reuse existing `production_entry*` wide-row tables and add the FRS operation-event
> + first-class doc tables as an **additive overlay** (no rewrite of existing rows).
> **Decision required from: Lead Architect + DB Owner.** This is the single blocking technical decision.

---

# PART 6 — API IMPLEMENTATION PLAN

Map DOC 13 `API-*` to the actual backend. Reuse existing `/api/v1/production/**` where compatible;
add only missing. For each new/in-scope API:

| API ID (DOC 13) | Endpoint (existing/proposed) | Controller | Service | Req DTO | Resp DTO | Authz | Tx boundary | BR deps | DB tables | FE consumer |
|---|---|---|---|---|---|---|---|---|---|---|
| API-PO-001..005 | existing `/api/v1/planning/work-order` (align to PO per TERM-PROD-001) + `/api/v1/production/orders` | ProductionOrderController | ProductionOrderService | `PROrderReq` | `PROrderRes` | roles per DOC 09 | service `@Transactional` | BR-PROD-ORDER | prod_order* | `order/` |
| API-JC-001..003 | existing `/api/v1/production/job-cards` | JobCardController | ProductionJobCardService | `JobCardReq` | `JobCardRes` | roles | service tx | BR-PROD-JOBCARD | prod_job_card, prod_subjob | `job-card/` |
| API-ENTRY-001..006 | existing `/api/v1/production/entries` (extend op-events) | ProductionEntryController | ProductionEntryService | `EntryReq` | `EntryRes` | roles | service tx | BR-PROD-ENTRY, BR-PROD-004, QTY-RECONCILE | prod_operation_event, prod_execution_session, prod_output_event, prod_log_entry | `production-entry/` |
| API-MREQ-001..004 | `/api/v1/production/material-requests` | MaterialRequestController | MaterialRequestService | `MReqReq` | `MReqRes` | roles | tx | BR-PROD-MATL | prod_req_* | `material-request/` |
| API-CONSUME-001/2 | `/api/v1/production/consumption` | MaterialRequestController | MaterialRequestService | `ConsumeReq` | `ConsumeRes` | roles | tx | BR-PROD-MATL | prod_consumption_event, prod_consumable_consumption | `material-consumption/` |
| API-REJ-001/2 | `/api/v1/production/rejections` | RejectionController | RejectionService | `RejectionReq` | `RejectionRes` | roles+auth | tx | BR-PROD-REJ-001 | prod_rejection* | `rejection/` |
| API-SCRAP-001/2 | `/api/v1/production/scraps` | ScrapController | ScrapService | `ScrapReq` | `ScrapRes` | roles+auth | tx | BR-PROD-SCRAP-001 | prod_scrap* | `scrap/` |
| API-IDLE-001 | existing `/api/v1/production/idle-time` | IdleStoppageController | IdleStoppageService | `IdleReq` | `IdleRes` | roles | tx | BR-PROD-STOP | prod_idle | `idle-time/` |
| API-STOP-001 | `/api/v1/production/stoppages` | IdleStoppageController | IdleStoppageService | `StoppageReq` | `StoppageRes` | roles | tx | BR-PROD-STOP | prod_stoppage | `stoppage/` |
| API-CONV-001..003 | existing `/api/v1/production/conversions` (extend item-change/disasm) | ConversionController | ConversionService | `ConvReq` | `ConvRes` | roles | tx | BR-PROD-CONV/DISASM | prod_conversion*, prod_item_change, prod_disassembly* | `conversion/` |
| API-PLAN-001..008 | `/api/v1/production/planning/*` | PlanningLayerController | PlanningLayerService | `PlanReq` | `PlanRes` | roles | tx | BR-PROD-PLAN/WC/CAP | prod_plan_* | `planning/` |
| API-QUERY-001..003 | existing `/api/v1/production/dashboard`, reports | — | ProductionRollupService | — | — | roles | read tx | — | derived views | dashboards |

> **Envelope/error/pagination:** all responses must use `ApiEnvelope` + `GlobalExceptionHandler` +
> DOC 13 pagination (existing `PageDto` shape). 409 optimistic locking via existing ConflictModal.

---

# PART 7 — FRONTEND IMPLEMENTATION PLAN

For each Production screen: **Screen ID → Route → Feature folder → Page comp → Form comp → Table/grid →
API hooks → Validation → Permission → Loading → Error → Status/Audit.**

> **Route note:** Navigation is tab-driven via `SCREEN_REGISTRY` + `navigation.ts` (not per-screen
> `<Route>`). Each new screen needs a `screenId` entry in both, plus `canScreen` gating.

| Screen | Route(screenId) | Folder | Page | Form comp | Grid | API hooks | Validation | Perm | Loading | Error | Status/Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Production Order | `production-order` | `order/` | PO Screen | POForm | POList | `useProductionOrder` (new) | zod | prod:Create | Skeleton | toast | StatusStepper + AuditDrawer |
| Job Card | `job-card` (exists) | `job-card/` | JobCardScreen (refactor) | JCForm | JCList | `useProduction` (new) | zod/useFormValidation | prod:Create | Skeleton | toast | StatusStepper + Audit |
| Production Entry | `production-entry` (exists) | `production-entry/` | EntryScreen (refactor) | EntryForm final-part | EntryGrid op-events | `useProduction` (new) | zod | prod:Create | Skeleton | toast | Status + Audit |
| Material Request | `material-request` | `material-request/` | MReqScreen | MReqForm | MReqList | `useProduction` | zod | prod:Create | Skeleton | toast | Status + Audit |
| Consumption | `material-consumption` | `material-consumption/` | ConsumeScreen | ConsumeForm | ConsumeList | `useProduction` | zod | prod:Create | Skeleton | toast | Status |
| Rejection | `rejection` | `rejection/` | RejectionScreen | RejForm | RejList | `useProduction` | zod | prod:Create + auth | Skeleton | toast | StatusStepper + Audit |
| Scrap | `scrap` | `scrap/` | ScrapScreen | ScrapForm | ScrapList | `useProduction` | zod | prod:Create + auth | Skeleton | toast | StatusStepper + Audit |
| Rework | `rework` | `rework/` | ReworkScreen | ReworkForm | ReworkList | `useProduction` | zod | prod:Create | Skeleton | toast | Status |
| Idle/Stoppage | `idle-time` (exists) | `idle-time/` | IdleScreen | IdleForm | IdleList | `useProduction` | zod | prod:Create | Skeleton | toast | Status |
| Deviation/NC | `deviation` | `deviation/` | DeviationScreen | DevForm | DevList | `useProduction` | zod | prod:Create | Skeleton | toast | Status + NC |
| WIP/Pending | `production-pending` (exists) | `wip/` | Pending/WIP screen | — | PendingGrid | `useProduction` | read-only | prod:View | Skeleton | toast | Status |
| Conversion | `product-conversion` (exists) | `conversion/` | ConversionScreen | ConvForm | ConvList | `useProduction` | zod | prod:Create | Skeleton | toast | Status |
| Planning Layer | `production-planning` | `planning/` | PlanningScreen | PlanForm | PlanList | `useProductionPlanning` | zod | prod:Create | Skeleton | toast | Status |
| Reports/OEE | `production-reports` | `reports/` | ReportScreen | — | ReportGrid/Charts | `useProductionReport` | zod | prod:View/Export | Skeleton | toast | — |

> **UI:** reuse `StatusBadge`, `WorkflowStatusStepper`, `FormActions`, `ConfirmActionModal`,
> `AuditHistoryDrawer`, `SkeletonLoader`, `ItemSearchDropdown`, `ConflictModal`, toast, custom CSS
> classes. Do **not** introduce a UI library (existing app is hand-rolled custom CSS).

---

# PART 8 — IMPLEMENTATION ORDER

Convert DOCUMENT 15 phases into exact technical order. **P1→P10; do not build downstream before deps.
Reuse engines first.**

## P1 — Foundation & Shared Integration
- **Continue/verify reuse:** `DocumentFacade`, `DocNumberService`, `WorkflowStateMachine`,
  `StockService`, `GlobalExceptionHandler`, `ApiEnvelope`, `AuditEntityListener`, RBAC.
- **Backend (BE):** register Production doc-types in numbering + status dictionary (DOC 11) +
  `WorkflowStateMachine` transitions; audit wiring; plant scoping.
- **DB:** no new tables needed; add Production rows to `numbering_config`/`doc_status_history` seeds only (migration in P1).
- **API:** confirm DOC 13 envelope/pagination adhered by Production endpoints.
- **FE:** create `src/types/production/*`, `src/services/production-api.ts`, `src/hooks/useProduction.ts`;
  register `screenRegistry`/`navigation`.
- **Tests:** DOC 14 unit+integration for numbering/workflow/audit; FE type-check + lint.
- **DB schema notes:** this phase may carry the DEC-PROD-001 DB decision only if approved (see 5.2).

## P2 — Production Order
- **BE:** `ProductionOrderService` + controller; align with `PlanningController` work-order (TERM-PROD-001); validation chain (DOC 09 XF-*).
- **DB:** `prod_order*` CREATE NEW (or EXTEND `work_order`), migration.
- **API:** API-PO-*; **FE:** `order/` screen.
- **Tests:** TC for PO lifecycle; qty reconcile.

## P3 — Job Card & Execution
- **BE:** extract `ProductionJobCardService` from `ProductionController`; operation/machine/operator allocation.
- **DB:** EXTEND `job_card`/`job_card_subjob`; **FE:** refactor `JobCardScreen`.
- **Tests:** JC issue/complete; subjob.

## P4 — Core Production Entry (DEC-PROD-001)
- **BE:** `ProductionEntryService`; operation-event engine (`prod_operation_event`,
  `prod_execution_session`, `prod_output_event`); quality decision + next-operation; rework/multiple-output/log.
- **DB:** CREATE NEW op-event tables (per 5.2 decision); backfill/map existing `production_entry*`.
- **API:** API-ENTRY-*; **FE:** refactor `ProductionEntryScreen` to final-part workspace.
- **Tests:** TC for op-events, qty reconcile, late-entry (BR-PROD-004), quality gate.

## P5 — Material & Inventory Integration
- **BE:** `MaterialRequestService`, ConsumptionService; all issues via `StockService` (never direct).
- **DB:** `prod_req_*`,`prod_consumption_event` CREATE NEW; **FE:** material-request/consumption screens.
- **Tests:** inventory-integrity (no direct stock write), idempotency.

## P6 — Rework / Rejection / Scrap
- **BE:** `RejectionService`, `ScrapService`, `ReworkService` (first-class docs; authorization).
- **DB:** `prod_rejection*`, `prod_scrap*`, `prod_rework_event` CREATE NEW; backfill from existing.
- **API:** API-REJ-*/API-SCRAP-*; **FE:** rejection/scrap/rework screens.
- **Tests:** TC-12/13 authorization + reversal restrictions + QTY-RECONCILE.

## P7 — WIP / Return / Conversion / Disassembly
- **BE:** `PendingService`, `ReturnService` (extract), `ConversionService` (item-change/disassembly).
- **DB:** `prod_item_change`, `prod_disassembly*`, wip/return mapping; EXTEND/CONFLICT `prod_conversion*`.
- **FE:** wip/pending, return, conversion/item-change/disassembly screens.
- **Tests:** pending reconcile (BR-PROD-ENTRY-001), conversion/disassembly reconcile.

## P8 — Planning Layer
- **BE:** `PlanningLayerService` (bucket/day/week/month/time-bucket, WC load/realloc, capacity, manpower, budget, forecast).
- **DB:** `prod_plan_*` CREATE NEW; **FE:** planning/ screens.
- **Tests:** capacity utilization, no overload without alert.

## P9 — Capacity / OEE / Analytics
- **BE:** extend `OeeController`+`ProductionRollupService` for FRS OEE/PPM/manpower/machine/consumable/cost; Quality rail (PPAP block, NCR), Maintenance-hand-off (INT-GAP-004).
- **DB:** derived views; **FE:** reports/OEE screens.
- **Tests:** TC for OEE formula (Availability×Perf×Quality), analytics.

## P10 — Reports / QA / UAT / Go-Live
- **BE:** report APIs (plan-vs-actual, cost); **FE:** dashboards/plan-vs-actual/MIS.
- **QA:** full RTM trace (DOC 14 TC-01..29), UAT, go-live runbook, rollback plan.
- **Exit:** Definition-of-Done per DOC 15 §8.

---

# PART 9 — REUSE AND CHANGE REGISTER

Decision: **REUSE / EXTEND / REFACTOR / REPLACE / CREATE NEW.** FRS refs per DOC 01–15.

| Component | Current Location | Current Purpose | Decision | Reason | Required change | Risk | FRS refs |
|---|---|---|---|---|---|---|---|
| `DocNumberService`+`doc_sequence`/`numbering_config` | `service/`, DDL | Server-side numbering | **REUSE** | FRS-compliant (server-side, reserved-not-reused) | Register Production doc types | Low | DOC 07 §21; DOC 12 §? |
| `DocumentFacade`+`doc_status_history` | `service/`, DDL | Universal doc lifecycle | **REUSE** | Aligns DOC 11 | Register Production docs | Low | DOC 11 |
| `WorkflowStateMachine` | `service/` | State-machine guard | **REUSE/EXTEND** | DOC 11 dictionary | Add Production transitions | Low | DOC 11; WF-GAP-* |
| `StockService`+`stock_balance`/`stock_ledger`/`posting_idempotency_key` | `service/`, DDL | Controlled inventory engine | **REUSE** | FRS inventory-integrity rule satisfied | Use for all Production movements | Low | DOC 10 BR-PROD-INV-*; DOC 12 §13 |
| `GlobalExceptionHandler`+`ApiEnvelope` | `config/`,`common/` | Error + envelope | **REUSE** | DOC 13 | None | Low | DOC 13 |
| `AuditEntityListener`/`AuditFlushFilter` | `config/` | Audit trail | **REUSE** | DOC 12 audit | New entities register | Low | DOC 12 |
| `RbacAspect`+`@RequirePermission`+permissions tables | `security/` | RBAC | **REUSE/EXTEND** | DOC 09 roles | Seed Production screens | Low | DOC 09 |
| `ProductionController` | `controller/` | Production CRUD+workflow+reports | **REFACTOR** | Business logic in controller violates layering | Extract services; thin controller | **High** | DOC 10/13 layering |
| `ProductionEntryValidationService` | `service/` | Entry validation | **EXTEND** | DOC 10/09 XF-* | Align BR validation | Medium | DOC 09/10 |
| `ProductionRollupService` | `service/` | Rollups/OEE | **EXTEND** | DOC 12/03 §8 | Align op-events | Medium | DOC 03 §8 |
| `production_entry*` tables | `V1__baseline.sql` | Wide-row production entry | **CONFLICT** | vs DEC-PROD-001 normalized op-events | Decision 5.2; backfill/map | **High** | DEC-PROD-001; DOC 12 |
| `job_card`,`job_card_subjob` | DDL | JC | **EXTEND** | FRS JC | Align fields | Medium | DOC 09 §144–173 |
| `idle_time_entry` | DDL | Idle | **EXTEND** | FRS idle | Align | Low | DOC 09 §440 |
| `product_conversion*` | DDL | Conversion | **EXTEND/CONFLICT** | FRS conversion | Add item-change/disasm | Medium | DOC 09 §398 |
| `production_return`,`production_log_sheet` | DDL | Return/Log | **EXTEND** | FRS | Align fields | Low | DOC 09 |
| `work_order*`,`route_sheet*`,`production_bom*`,`material_plan*` | DDL | Planning masters | **REUSE** | TERM-PROD-001 | Align PO/WO | Medium | TERM-PROD-001 |
| `OeeController`+`oee_daily` | `controller/`,DDL | OEE | **EXTEND** | DOC 03 §8 | Add availability/perf/quality | Medium | DOC 03 §8 |
| Production pages | `src/pages/production/*` | Screens | **REFACTOR/EXTEND** | FRS scope; no service layer | Add service/hooks/types; split monoliths | Medium | DOC 08/09 |
| `screenRegistry.tsx`,`navigation.ts`,`rbac.ts` | `src/config/` | Routing/nav/RBAC | **EXTEND** | DOC 08/09 | Add screens | Low | DOC 08/09 |
| Shared UI components | `src/components/common/` | Primitives | **REUSE** | DOC 08/09 | Adopt | Low | DOC 08/09 |
| FE service/hooks/types for production | (missing) | — | **CREATE NEW** | No service layer | Create `production-api.ts`,`useProduction.ts`,`types/production/*` | Medium | DOC 13/14 |

---

# PART 10 — DEVELOPMENT SAFETY RULES

These rules govern implementation (enforced before any coding):

1. **No existing module may be modified without dependency analysis.** Any change to shared engines
   (`DocNumberService`, `StockService`, `WorkflowStateMachine`, RBAC) requires a dependency-impact review.
2. **No production code may directly update inventory balances.** All stock movements must go through
   `StockService`/`stock_ledger`/`posting_idempotency_key`. No `UPDATE stock_balance` from Production.
3. **All Production transactions must follow DOCUMENT 11 workflows** (status dictionary + state machine).
4. **All Production tables must follow DOCUMENT 12** (no parallel/duplicate transaction models).
5. **All APIs must follow DOCUMENT 13** (envelope/pagination/error).
6. **All development tasks must trace to DOCUMENT 15** (no unbacked work).
7. **Every code change must have a rollback strategy** (migrations forward+reverse; feature flags).
8. **Existing working modules must not be broken** (regression of Inventory/Quality/Planning blocked).
9. **Run relevant tests before and after each implementation phase** (DOC 14 TC-* + existing suites).
10. **No large-scale automated refactor without explicit approval.** The `ProductionController`/
    frontend-monolith refactors proceed incrementally, phase by phase.

---

# PART 11 — OUTSTANDING TECHNICAL DECISIONS (Gate to coding)

| # | Decision | Recommended default | Owner |
|---|---|---|---|
| D1 | **DEC-PROD-001 data model (CONFLICT, blocking)** — adopt new normalized `prod_operation_event`/`prod_execution_session`/`prod_output_event` tables + first-class Rej/Scrap docs with backfill of existing `production_entry*`, **or** additive overlay reusing existing wide-row tables | Adopt normalized op-event tables (FRS architecture), additive overlay/backfill | Lead Architect + DB Owner |
| D2 | Production Order representation — new `prod_order*` vs extend existing `work_order`/`job_order` (TERM-PROD-001) | Align existing `work_order` as PO planning + execution instance; add `prod_order*` if needed | Architect |
| D3 | First-class Rejection/Scrap/Rework tables (new) + mapping of existing `production_entry_rejection`/`rework` data | CREATE NEW first-class documents; seed/migrate existing data | DB Owner |
| D4 | MapStruct vs existing manual mappers | Keep existing manual mapper style; MapStruct only if approved | Team |
| D5 | Numbering: reuse `DocNumberService` (recommended) vs new `num_reservation` table per DOC 12 | Reuse `DocNumberService`; align naming | Architect |

> **Coding must not begin until D1 (and D2) are approved** and DOCUMENT 16 is reviewed and accepted.

---

**END OF DOCUMENT 16 — PRODUCTION TECHNICAL IMPLEMENTATION PLAN**

This document is a design/analysis bridge only. It modifies **no** application source, **no** database
schema and **no** migrations. No implementation starts until DOCUMENT 16 is reviewed and the
outstanding technical decisions (D1–D5) are approved.