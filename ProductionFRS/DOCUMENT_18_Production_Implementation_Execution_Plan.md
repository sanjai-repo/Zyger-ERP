# DOCUMENT 18 — PRODUCTION IMPLEMENTATION EXECUTION PLAN

| Field | Value |
|---|---|
| Document ID | DOCUMENT_18 |
| Title | Production Implementation Execution Plan |
| Status | **AWAITING APPROVAL (STOP GATE)** |
| Inputs | DOCUMENT_15 (Backlog) · DOCUMENT_16 (Tech Plan) · DOCUMENT_17 (ADR Gate — APPROVED) |
| Approved architecture | DOCUMENT_17 ADR-PROD-001..005 (D1..D5 approved) |
| Target stack | React 19 + Vite · Spring Boot 4.1 / Java 25 / Gradle · PostgreSQL 16 |
| Behavior | Convert DOC 15/16/17 into an **exact, gated, reversible** implementation sequence. **No code/DDL per this document alone.** |

> **Purpose.** A controlled execution contract: every phase has objective, FRS/ADR refs, reuse/extend/
> refactor/create, DB/API/BE/FE/integration/migration/test changes, risks, rollback point, entry/exit
> criteria, and required approval. Implements all approved D1/D2/D3/D4/D5 decisions and the 20 critical
> safety rules.

---

## 1. APPROVED ARCHITECTURE BASELINE

- **Target execution model (D1/ADR-001):** normalized operation-level events as the authoritative
  source. `production_entry*` retained as legacy/compatibility (not deleted), read-only after cutover.
  Rollup/aggregates are derived views — no stored duplicate source of truth.
- **Canonical Production Order (D2/ADR-002):** existing `work_order` is the persistence table for the
  Production Order domain. No independent `prod_order` table, no duplicate entities. Terminology mapping
  in §3.
- **Document classification (D3/ADR-003):** per-document REUSE/EXTEND/REFACTOR/CREATE NEW register
  (first-class Rej/Scrap/Rework/Deviation/Stoppage/Consumption/Planning = CREATE NEW; others EXTEND/REFACTOR).
- **Numbering (D4/ADR-004):** REUSE `DocNumberService` + `doc_sequence` + `numbering_config`.
- **Inventory (D5/ADR-005):** REUSE `StockService` + `stock_ledger` + `posting_idempotency_key`.
  Production never writes `stock_balance` directly.

---

## 2. D1 / D2 IMPLEMENTATION INTERPRETATION

### 2.1 D1 — Data model interpretation (target event spine)
```
production_entry*  ──(legacy/compat, retained, read-only)──▶  historical/dashboards
                                                                 │
NEW AUTHORITATIVE (additive):                                  │  backfill (idempotent)
  prod_execution_session  ──▶  prod_operation_event             │
                                    │                           │
        prod_output_event           │                           │
        prod_rejection_event        │                           │
        prod_scrap_event            │                           │
        prod_rework_event           │                           │
                                    ▼                           │
       Production Rollup / Aggregate Views (derived)──◀────────┘
                                    │
        Inventory / Quality / Costing Integration
```
- `prod_execution_session` + `prod_operation_event` are the authoritative execution facts.
- First-class `prod_rejection_event`, `prod_scrap_event`, `prod_rework_event` carry own number +
  authorization (BR-PROD-REJ-001/SCRAP-001).
- Rollups derive from these events only (QTY-RECONCILE: `Processed = Accepted + Rejection + Rework + Scrap`).

### 2.2 D2 — Production Order interpretation
- Persistence table: **`work_order`** (extend with Production-Order discriminator: single/composite/rework).
- No `prod_order` table, no second entity. Existing `work_order` lifecycle (submit/approve/reopen/close)
  reused. Execution-level Work Order / Job Card follows TERM-PROD-001.

---

## 3. CANONICAL TERMINOLOGY MAPPING (D2 mandate)

| Business Term | UI Term | API Term | Java Domain/Class Term | Database Table | Legacy Term |
|---|---|---|---|---|---|
| Production Order | Production Order | Production Order (`/api/v1/production/orders`) | `ProductionOrder` (maps to existing `WorkOrder`) | `work_order` | Work Order (legacy compat only) |
| Composite Production Order | Composite Production Order | Production Order (type=COMPOSITE) | `ProductionOrder` (orderType=COMPOSITE) | `work_order` (discriminator) | — |
| Rework Production Order | Rework Production Order | Production Order (type=REWORK) | `ProductionOrder` (orderType=REWORK) | `work_order` (discriminator) | — |
| Work Order (execution instance) | Work Order / Job | Work Order (`/api/v1/production/work-orders`) | `WorkOrderExecution` | `work_order` / `job_card` | Work Order |
| Job Card | Job Card | Job Card | `JobCard` (existing) | `job_card` / `prod_job_card` | Job Card |
| Production Entry | Production Entry | Production Entry | `ProductionEntry` (repurposed as facade over events) | `prod_operation_event` (+ legacy `production_entry`) | Production Entry |

> Enforced: **no** `prod_order` table, **no** `ProductionOrderEntity` separate class, **no** duplicate
> numbering/workflow engines.

---

## 4. EXISTING-TO-TARGET COMPONENT MAPPING

Per DOC 16 Part 9, reconciled to approved ADRs:

| Component | Path | ADR ruling | Decision |
|---|---|---|---|
| `ProductionController` | `controller/` | D3 | **REFACTOR (incremental, P4+)** — thin-out; business logic → services |
| `ProductionEntry*` tables | `V1__baseline.sql` | D1 | **RETAIN (legacy/compat)** — read-only after cutover |
| `work_order` | DDL | D2 | **REUSE + EXTEND** (PO discriminator) |
| `DocsNumber/DocStatus` engine | `service/`, DDL | D4 | **REUSE** |
| `StockService`+ledger+idempotency | `service/`, DDL | D5 | **REUSE** (additive wrapper only) |
| Production pages | `src/pages/production/*` | D3 | **REFACTOR/EXTEND** via new service/hooks/types |
| FE service/hooks/types (missing) | — | D3 | **CREATE NEW** |

---

## 5. EXACT IMPLEMENTATION PHASES (P0–P13)

For every phase: Objective · FRS refs · ADR refs · Reuse / Extend / Refactor / New · DB · API · BE ·
FE · Integration · Migration impact · Tests · Regression · Risks · Rollback point · Entry criteria ·
Exit criteria · Required approval.

> **Cross-cutting safety (all phases):** no table delete; no destructive rename; no `stock_balance`
> writes; no duplicate entities/numbering/workflow; RBAC + audit enforced; migrations reversible;
> backfill idempotent + reconciled; tests must pass before next phase.

---

## PHASE P0 — Architecture Baseline & Safety

- **Objective:** Lock approved architecture + safety harness before any code. No feature code.
- **FRS refs:** DOC 07/10/17. **ADR refs:** 001–005.
- **Reuse:** existing env/tooling, current test infra. **Extend:** —. **Refactor:** —. **New:** decision-log
  + terminology map (this DOC §3) checked into repo.
- **DB:** none. **API:** none. **BE:** none. **FE:** none. **Integration:** none. **Migration impact:** none.
- **Tests:** confirm baseline test suite runs green (compileJava, backend tests, `tsc -b`, lint) — no
  Production code touched yet.
- **Regression:** full current suite.
- **Risks:** scope creep; environment drift. Mit: checklist sign-off.
- **Rollback point:** N/A (no change).
- **Entry criteria:** ADR approvals recorded; DOC 16/17 approved.
- **Exit criteria:** baseline green; terminology map + decision log committed; approval board signed.
- **Required approval:** Lead Architect + Tech Lead + QA lead.

## PHASE P1 — Foundation & Shared Integration

- **Objective:** Wire Production into shared engines; introduce FE service/hooks/types layer.
- **FRS refs:** DOC 07 §21, DOC 11, DOC 12, DOC 13, DOC 14. **ADR refs:** 004 (numbering), 003 (docs), 005 (inventory).
- **Reuse:** `DocNumberService`, `doc_sequence`, `numbering_config`, `doc_status_history`,
  `WorkflowStateMachine`, `StockService`(read-only intro), `AuditEntityListener`, RBAC, `ApiEnvelope`.
- **Extend:** `WorkflowStateMachine` (register Production transitions), `numbering_config` seed rows.
- **Refactor:** none yet. **New:** `InventoryIntegrationService` (additive wrapper reusing `StockService`);
  FE `src/services/production-api.ts`, `src/hooks/useProduction.ts`, `src/types/production/*`.
- **DB:** additive Flyway V2__numbering_status_seed.sql (rows only; **no DDL table drop**).
- **API:** confirm Production endpoints use DOC 13 envelope/pagination (no new endpoints yet).
- **BE:** register Production doc-types; plant-scoping; RBAC screen seeds.
- **FE:** new service/hooks/types; register new `screenId`s in `screenRegistry.tsx` + `navigation.ts`.
- **Integration:** inventory wrapper unit-tested against `StockService`.
- **Migration impact:** none (config seeds only).
- **Tests:** numbering continuity (TC-19); workflow transitions (TC-*); envelope; FE type-check + lint.
- **Regression:** full suite still green.
- **Risks:** first-touch on shared engine registrations. Mit: additive config only; no engine logic change.
- **Rollback point:** disable Production doc-type registrations; remove additive seed rows; FE layer unused.
- **Entry criteria:** P0 exit passed.
- **Exit criteria:** numbering/status/audit wired; FE layer in place; P1 tests green.
- **Required approval:** Tech Lead (BE)+ Lead FE.

## PHASE P2 — Canonical Production Order / Job Card

- **Objective:** Realize canonical Production Order on `work_order` (D2) + Job Card.
- **FRS refs:** DOC 07 §02, DOC 08 SCR-PROD-ORDER/JOBCARD, DOC 09 §77–173, TERM-PROD-001.
  **ADR refs:** 002 (PO), 003 (doc classify), 004.
- **Reuse:** `work_order`, `job_card`, `job_card_subjob`, `WorkflowStateMachine`, `DocNumberService`.
- **Extend:** `work_order` (additive PO discriminator/order-type column + any missing PO fields);
  `job_card`/`job_card_subjob` field alignment.
- **Refactor:** none (PDF doc-type first). **New:** `ProductionOrderService` (maps to `WorkOrder`),
  validate composite/rework/short-close; `ProductionJobCardService` extract.
- **DB:** additive V3__work_order_po_discriminator.sql (add columns; no drop/rename).
- **API:** Production Order endpoints (reuse `/api/v1/planning/work-order` + additive alias);
  Job Card endpoints reused.
- **BE:** thin `ProductionOrderController`/`JobCardController`; naming per §3.
- **FE:** `order/` + refactor `job-card/` to use service/hooks.
- **Integration:** none new.
- **Migration impact:** additive discriminator; existing `work_order` rows backfilled `orderType`
  (idempotent).
- **Tests:** PO create/release/composite/rework/short-close; JC issue/complete; subjob.
- **Regression:** existing work-order/job-card screens unaffected (additive).
- **Risks:** relabelling "Work Order"→"Production Order" may surprise legacy users. Mit: legacy term
  retained where required (§3).
- **Rollback point:** drop additive discriminator column (reversible); alias endpoint off.
- **Entry/Exit criteria:** P1 exit → P2 PO/JC green.
- **Required approval:** Planning/Production owner + Architect.

## PHASE P3 — Production Domain Event Foundation

- **Objective:** Introduce the normalized execution-session and operation-event base tables (additive).
- **FRS refs:** DOC 12 prod_execution_session/prod_operation_event; DEC-PROD-001; DOC 10.
  **ADR refs:** 001.
- **Reuse:** idempotency, audit, numbering. **Extend:** —. **Refactor:** —.
- **New:** Flyway V4__prod_execution_event.sql creating `prod_execution_session`, `prod_operation_event`
  (FK to order/job/op), first-class event metadata. **No data written yet** — tables are dormant until
  P4/P12 gate.
- **DB:** new tables only. **API:** none live. **BE:** entity + repository classes (no active writes).
- **FE:** none. **Integration:** none. **Migration impact:** additive.
- **Tests:** schema/constraint validation; empty-state integrity.
- **Regression:** full suite.
- **Risks:** none functional (dormant tables). Rollback: drop new tables (no data).
- **Entry/Exit:** P2 exit → events schema DDL reviewed + applied; P3 green.
- **Required approval:** DB Owner + Architect.

## PHASE P4 — Normalized Operation Execution Engine

- **Objective:** Stand up the operation-event write engine (authoritative execution model).
- **FRS refs:** DEC-PROD-001; DOC 10 BR-PROD-ENTRY/BR-PROD-004, QTY-RECONCILE; DOC 12; DOC 13 API-ENTRY.
  **ADR refs:** 001, 003.
- **Reuse:** `StockService` (read), `AuditEntityListener`, `DocNumberService`, `WorkflowStateMachine`.
- **Extend:** —. **Refactor:** begin **incremental** `ProductionController` → `ProductionEntryService`.
- **New:** `ExecutionSessionService`, `OperationEventService` (write path), first-class
  `Rejection/Scrap/ReworkEvent` write services (P7 completes authorization).
- **DB:** V5__prod_events_events.sql (output/rejection/scrap/rework event tables). **Feature-flagged writer.**
- **API:** additive op-event + output endpoints (DOC 13).
- **BE:** services; controllers thin. **FE:** `production-entry/` refactor to final-part workspace
  (behind flag). **Integration:** events → read-only stock availability checks.
- **Migration impact:** none (new model). Backfill deferred to P12 gate.
- **Tests:** op-event write; QTY-RECONCILE; late-entry (BR-PROD-004); quality gate per op.
- **Regression:** legacy `production_entry` path still active (feature flag off by default).
- **Risks:** dual write path temporarily (event vs legacy). Mit: flag; legacy stays authoritative until
  P12 gate.
- **Rollback point:** disable event-writer flag; legacy path unchanged in default.
- **Entry/Exit:** P3 exit → engine tested behind flag; P4 green.
- **Required approval:** Architect + Tech Lead + DB Owner.

## PHASE P5 — Production Entry & Output

- **Objective:** Final-part-centric Production Entry UI over op-events; output/multiple-output.
- **FRS refs:** DOC 08 SCR-PROD-ENTRY/OUT; DOC 09 §208–248, 319–355; DOC 12 prod_output_event.
  **ADR refs:** 001, 003.
- **Reuse:** shared UI (StatusBadge, WorkflowStatusStepper, FormActions), `StockService` (posting for
  FG receipt in P12 gate). **Extend:** `production-api.ts`. **Refactor:** `ProductionEntryScreen`. **New:**
  `output/` screen, output event endpoints.
- **DB:** V5 already; no new table. **API:** API-ENTRY/output (additive).
- **BE:** output-service wire. **FE:** entry+output screens behind flag.
- **Integration:** FG receipt via StockService only at cutover.
- **Migration impact:** none. **Tests:** entry→output; multiple-output weight/dest;
  reconciliation. **Regression:** legacy production_entry reads.
- **Risks:** UX divergence from legacy. Mit: parity checklist.
- **Rollback point:** flag off.
- **Entry/Exit:** P4 exit → P5 green.
- **Required approval:** Lead FE + Architect.

## PHASE P6 — Material Request & Consumption Integration

- **Objective:** Production material requests + controlled consumption via StockService.
- **FRS refs:** DOC 08 SCR-PROD-MREQ/CONSUMABLE/CONSUME; DOC 09 §249–318; DOC 10 BR-PROD-MATL;
  DOC 12 prod_req_*, prod_consumption_event. **ADR refs:** 003, 005.
- **Reuse:** `StockService`, `rm_issue`/`stock_issue_request` adjacent, `ItemSearchDropdown`. **New:**
  `MaterialRequestService`, `ConsumptionService`; DB `prod_req_material(_line)`,
  `prod_req_addl(_line)`, `prod_req_other(_line)`, `prod_consumption_event`,
  `prod_consumable_consumption` (V6). **FE:** `material-request/`, `material-consumption/` screens.
- **Integration:** all issues/receipts via `StockService` (never direct). Idempotency + audit enforced.
- **DB:** V6 additive. **API:** API-MREQ/CONSUME (additive).
- **Tests:** request→issue→stock-ledger chain; consumption reconcile; idempotency.
- **Regression:** stock engine unchanged.
- **Risks:** bypass. Mit: code-review rule + static ban on `stock_balance` writes.
- **Rollback point:** flag off; legacy request path intact.
- **Entry/Exit:** P5 exit → P6 green.
- **Required approval:** Architect + Inventory owner.

## PHASE P7 — Rejection / Scrap / Rework (first-class docs)

- **Objective:** First-class authorized Rejection/Scrap/Rework documents.
- **FRS refs:** FR-PROD-REJ-001/SCRAP-001; BR-PROD-REJ-001/SCRAP-001; DOC 09 §356–397; NUM-PROD-REJ.
  **ADR refs:** 001, 003, 004.
- **Reuse:** reason masters (`reject_reason_master`), `DocNumberService`, `WorkflowStateMachine`.
- **New:** `RejectionService`/`ScrapService`/`ReworkService`; DB `prod_rejection_event`,
  `prod_scrap_event`, `prod_rework_event` (V7); FE `rejection/`, `scrap/`, `rework/` screens.
- **API:** API-REJ-*/API-SCRAP-* (additive). **BE:** first-class workflows + authorization
  (AUTO/MANUAL scrap auth). **FE:** screens + approval.
- **Tests:** TC-12/13 authorization; reversal restriction post-capitalization; QTY-RECONCILE.
- **Migration impact:** backfill existing `production_entry_rejection`/`rework` child rows → first-class
  docs (idempotent, P12 gate).
- **Risks:** authorization scope. Mit: RBAC + supervisor override per DOC 09.
- **Rollback point:** flag off.
- **Required approval:** Architect + QA lead.

## PHASE P8 — Idle Time / Stoppage

- **Objective:** Idle + Line Stoppage (availability inputs for OEE).
- **FRS refs:** SCR-PROD-IDLE/STOP; DOC 09 §440–475; DOC 10 BR-PROD-STOP. **ADR refs:** 003.
- **Reuse:** `idle_time_entry`, `idle_reason_master`. **Extend:** → `prod_idle`. **New:**
  `IdleStoppageService`; `prod_stoppage` (V8); FE idle/stoppage. **API:** API-IDLE/STOP.
- **Integration:** stoppage→maintenance hand-off (`maintenance_ref`, INT-GAP-004) — external contract.
- **Tests:** idle capture; stoppage + maint-ref; feeds Availability.
- **Rollback point:** flag off. **Required approval:** Architect.

## PHASE P9 — Return / Conversion / Item Change / Disassembly

- **Objective:** Production Return via StockService; Conversion; Item Change; Disassembly.
- **FRS refs:** SCR-PROD-RETURN/CONV/ITEMCHG/DISASM; DOC 09 §398–439; BR-PROD-INV-003, CONV, DISASM.
  **ADR refs:** 003, 005.
- **Reuse:** `production_return`, `product_conversion*`. **Extend/Refactor:** these to FRS fields.
- **New:** `ConversionService` (item-change/disassembly); `prod_item_change`, `prod_disassembly(_line)`
  (V9). **FE:** return/conversion/item-change/disassembly screens.
- **Integration:** returns via StockService (Good/QC-Hold/Rejected + override per CLAR-PROD-003);
  Costing valuation (qty/loss only, CLAR-PROD-008).
- **Tests:** DISASM-RECONCILE, CONV-RECONCILE, return override. **Rollback point:** flag off.

## PHASE P10 — Planning Layer

- **Objective:** Production planning layer after execution data is reliable.
- **FRS refs:** SCR-PROD-PLAN/WC/CAP; DOC 09 §476–553; DOC 10 PLANNING; DOC 12 prod_plan_*. **ADR refs:** 003.
- **New:** `PlanningLayerService`; `prod_plan_*` (V10); FE `planning/`. **API:** API-PLAN-*.
- **Tests:** bucket planning, WC load/realloc, capacity utilization, budget, forecast.
- **Entry criteria:** execution data trusted (P7/P9 stable). **Rollback point:** flag off.

## PHASE P11 — OEE / KPI / Reports / MIS

- **Objective:** FRS analytics + dashboards.
- **FRS refs:** DOC 03 §8 (OEE/PPAP/MSL), DOC 12 views, DOC 14 reports. **ADR refs:** 003.
- **Reuse:** `OeeController`, `oee_daily`, `ProductionRollupService`, Recharts. **Extend:** to
  Availability×Performance×Quality. **New:** derived views (DB V11), report endpoints.
- **FE:** reports/OEE/mis screens. 
- **MSL (note):** per ASM-PROD-015 — MSL = Minimum Stock Level is **Inventory/Store-owned**
  (integration-only alert); **no Production MSL UI/MRP** is built. Keep out of scope.
- **Tests:** OEE formula; PPM; manpower/machine. **Rollback point:** flag off.

## PHASE P12 — Legacy Migration & Compatibility Validation

- **Objective:** Controlled backfill + reconciliation gate; event model becomes authoritative.
- **FRS refs:** DOC 12; ADR-001 §A–K. **ADR refs:** 001.
- **Reuse:** idempotency. **New:** backfill migration (V12): `production_entry*` → sessions/events +
  first-class Rej/Scrap/Rework, idempotent (guarded), generating numbers via DocNumberService (ADR-004).
- **Migration impact:** additive backfill; **no delete**; source retained.
- **Validation:** QTY-RECONCILE — `Σ(new events) == Σ(legacy rows)`; field mapping reviewed.
- **Gate:** **New event tables do NOT become active until this gate passes** (safety rule 19).
- **Tests:** reconciliation across all production_entry rows; drift = 0.
- **Risks:** mismatch. Mit: idempotent re-run + field-map sign-off.
- **Rollback point:** backfill is reversible (idempotent; source intact); writer remains flag-controlled.
- **After exit:** switch writer default to event model; legacy `production_entry` becomes **read-only**.
- **Required approval:** DB Owner + Architect + QA lead (acceptance) + domain owner.

## PHASE P13 — Full Regression & Production Readiness

- **Objective:** Final regression, integration verification, go-live.
- **FRS refs:** DOC 14 (TC-01..29), DOC 15 §8 DoD, DOC 16 safety rules, DOC 17 checklist. **ADR refs:** 001–005.
- **Tests:** full RTM trace; inventory-integrity static scan; PEAR/per-repos; UAT; rollback drill.
- **Regression:** all modules (Inventory/Quality/Planning/Maintenance) + full Production.
- **Risks:** cutover residual. Mit: runbook + rollback.
- **Exit criteria:** all DoD met; acceptance signed; go-live approved; legacy read-only enforced.
- **Required approval:** Program review board + QA.

---

## 6. DEPENDENCY GRAPH

```
P0 ─▶ P1 ─▶ P2 ─▶ P3 ─▶ P4 ─▶ P5 ─▶ P6 ─▶ P7
                                  │     │
                                  └─────┴─▶ P8 ─▶ P9 ─▶ P10 ─▶ P11
                                                        │
                                                        ▼
                                                P12 (gate) ─▶ P13
```
- Strict order: P0→P1→…→P13. P12 (migration gate) requires P4–P11 stable; P13 last.
- P7 depends on P4 (events) + P6 irrelevant. P10 requires execution data (P7/P9). P11 requires P8 (OEE inputs).

---

## 7. DATABASE MIGRATION SEQUENCE (additive, reversible, idempotent)

| Mig | Phase | Content | DDL type |
|---|---|---|---|
| V2 | P1 | numbering_config + doc_status_history seed rows | DML (rows) |
| V3 | P2 | `work_order` PO discriminator column (+ backfill orderType) | ALTER add column (additive) |
| V4 | P3 | `prod_execution_session`, `prod_operation_event` (dormant) | CREATE |
| V5 | P4 | `prod_output_event`, `prod_rejection_event`, `prod_scrap_event`, `prod_rework_event` | CREATE |
| V6 | P6 | `prod_req_material(_line)`, `prod_req_addl(_line)`, `prod_req_other(_line)`, `prod_consumption_event`, `prod_consumable_consumption` | CREATE |
| V7 | P7 | (first-class docs on V5 events) + indexes | CREATE idx |
| V8 | P8 | `prod_idle`, `prod_stoppage` | CREATE/EXTEND |
| V9 | P9 | `prod_item_change`, `prod_disassembly(_line)`, `prod_conversion*` alignment | CREATE/EXTEND |
| V10 | P10 | `prod_plan_*` | CREATE |
| V11 | P11 | derived aggregate views (WIP/pending/capacity/OEE/PPM) | CREATE VIEW |
| V12 | P12 | backfill `production_entry*` → events + first-class docs (idempotent) | DML (backfill) |

**Rule:** every migration has a documented reverse/detection; **no DROP**, **no destructive rename**.
Backfills carry `posting_idempotency_key` guard.

---

## 8. BACKEND IMPLEMENTATION SEQUENCE
P1: register numbering/status/audit; `InventoryIntegrationService` wrapper. →
P2: `ProductionOrderService`, `ProductionJobCardService`. →
P4: `ExecutionSessionService`, `OperationEventService`, thin-entry controllers. →
P6: `MaterialRequestService`, `ConsumptionService`. →
P7: `RejectionService`, `ScrapService`, `ReworkService`. →
P8: `IdleStoppageService`. →
P9: `ReturnService`, `ConversionService`. →
P10: `PlanningLayerService`. →
P11: analytics/services. All controllers thin (per DOC 10 layering); business logic in services/domain.

## 9. FRONTEND IMPLEMENTATION SEQUENCE
P1: `production-api.ts`, `useProduction.ts`, `types/production/*`; register screens. →
P2: `order/` + refactor `job-card/`. →
P5: refactor `production-entry/` + new `output/`. →
P6: `material-request/`, `material-consumption/`. →
P7: `rejection/`, `scrap/`, `rework/`. →
P8: idle/stoppage. → P9: return/conversion/item-change/disassembly. → P10: planning. →
P11: reports/OEE/MIS. All in existing custom-CSS UI, no new UI library.

## 10. API IMPLEMENTATION SEQUENCE
Additive per phase (DOC 13): P2 PO; P4 op-event/output; P6 MREQ/CONSUME; P7 REJ/SCRAP; P8 IDLE/STOP;
P9 CONV/DISASM/RETURN; P10 PLAN; P11 report/OEE. Existing APIs remain compatible; legacy write path
removed only in P12 gate via deprecation window.

## 11. INTEGRATION IMPLEMENTATION SEQUENCE
- Inventory: wrapper + StockService (P1/P6/P9/P12 gate). Never direct writes.
- Quality: PPAP block / NCR hand-off (P7/P11). Engineering: BOM/Route read (P2). Maintenance:
  stoppage→maint hand-off (P8, INT-GAP-004 external). Costing: Conversion valuation (P9).

## 12. DATA MIGRATION / BACKFILL SEQUENCE
- P2: `work_order` orderType backfill. P12: `production_entry*`→events + first-class docs backfill
  (idempotent + reconciled). Legacy retained read-only post-cutover. No destructive step.

## 13. TEST SEQUENCE
Per-phase tests gate entry to next. P0 baseline. P1 numbering/workflow/FE types. P2 PO/JC.
P4 op-events/QTY-RECONCILE/BR-PROD-004. P6 material+idempotency. P7 Rej/Scrap auth (TC-12/13).
P11 OEE. P12 reconciliation (drift=0). P13 full RTM (TC-01..29) + regression + UAT.

## 14. REGRESSION PROTECTION STRATEGY
- Additive-only changes; feature flags keep legacy path default-active until P12 gate.
- Full suite before/after each phase (backend tests, `tsc -b`, lint) — DOC 16 safety rule 9.
- Static scan bans `stock_balance` writes from Production (D5).
- Per-phase regression tests listed; legacy `production_entry` read paths tested unaffected.

## 15. ROLLBACK CHECKPOINTS
| Phase | Checkpoint | Rollback |
|---|---|---|
| P1/P2/P4–P11 | feature flag per new writer | disable flag → legacy path active; no drop |
| P12 | migration gate | backfill idempotent + reversible; writer remains flag-controlled; source intact |
| P13 | cutover | runbook rollback to flag-off state (DR) |

## 16. GIT COMMIT STRATEGY
- One branch per phase (`feat/prod/P{n}-<name>`); commit per focused unit; no mega-commits.
- Feature flags PR-first behind `properties`; migrations committed with revert doc alongside.
- Legacy code only removed in P12 with migration cutover PR; all others additive.
- Conventional commits; PR requires passing CI (compile, tests, tsc, lint).

## 17. FEATURE FLAGS / COMPATIBILITY STRATEGY
- `prod.feature.eventWrite` (P4), `prod.feature.firstClassDocs` (P7), `prod.feature.planning` (P10),
  `prod.feature.eventAuthoritative` (P12, default OFF until gate passes).
- Legacy APIs + legacy writer remain until P12 gate. No UI/API break until deprecation window.

## 18. PER-PHASE DEFINITION OF DONE
Each phase exits only when: (a) all acceptance criteria of its tasks (DOC 15) pass; (b) traceability
intact; (c) DB/API/BE/FE/integration changes reviewed; (d) tests + regression green; (e) rollback
point documented; (f) approval signed. Full DoD per DOC 15 §8 applies.

## 19. PER-PHASE FILES ALLOWED TO CHANGE
Additive/new files per phase: FE `production-*.ts`, `useProduction.ts`, `types/production/*`, new
`pages/production/<feature>/*`; backend new services/controllers/entities/repos; migrations V2–V12;
config seeds; `screenRegistry.tsx`/`navigation.ts`/`rbac.ts` seeds; `work_order` additive columns.

## 20. PER-PHASE FILES EXPLICITLY FORBIDDEN TO CHANGE
Until P12 gate + sign-off: `production_entry*` DDL + `ProductionEntry*` entities (read-only),
`StockController`/`StockService` core logic, `SecurityConfig`, JWT, existing live endpoints'
contracts, `numbering_config`/`doc_sequence` engine logic, core `DocNumberService` behavior,
existing Inventory/Quality/Planning/Maintenance production flows. No broad refactors.

## 21. PRODUCTION DATA SAFETY CHECKLIST
- No DROP/rebase destructive ALTER. 
- No direct `stock_balance` write from Production.
- Backfill idempotent (idempotency key) + QTY-RECONCILE validation.
- `production_entry*` retained + readable throughout.
- `stock_ledger` immutable; audit retained.
- Rollback always to a flag-off, data-intact state.

## 22. PRE-DEPLOYMENT CHECKLIST
- All flags default-safe (legacy active) except after P12 gate.
- Reconciliation drift = 0. 
- Full regression + RTM (TC-01..29) green.
- Rollback runbook tested (DR drill). 
- Terminology map (§3) applied in UI/API/docs. 
- Approvals for each phase recorded. 
- Go-live approval from program review board.

---

# STOP GATE

**No application source, migration, or DDL is changed by DOCUMENT 18.** Implementation may not begin
until approval.

## 23. Stop-gate report

**1. Implementation phase summary:** P0–P13 controlled sequence — P0 baseline/safety, P1 foundation,
P2 PO/JobCard, P3 event schema base, P4 op-execution engine, P5 entry/output, P6 material/consumption,
P7 rejection/scrap/rework, P8 idle/stoppage, P9 return/conversion/disassembly, P10 planning,
P11 OEE/reports/MIS, P12 legacy migration+compat gate, P13 regression/readiness.

**2. Dependency summary:** strict chain P0→P1→…→P13. P12 (migration gate) requires P4–P11 stable.
P10 requires trusted execution data. P11 requires P8 (idle) + P9 inputs. No parallel phase bypasses a
dependency.

**3. Highest risks:**
- R1 Physical D1 cutover (wide-row→events) — mitigated by additive backfill + QTY-RECONCILE drift=0 gate.
- R2 `ProductionController`/monolith-screen refactor regression — incremental + feature-flagged + full suite.
- R3 Inventory-bypass in new services — static ban + StockService-only rule + code-review.
- R4 Terminology confusion (WorkOrder vs ProductionOrder) — explicit §3 map + legacy term retention.

**4. First files that will be modified (after approval):**
- `Service` (new): `InventoryIntegrationService` (additive).
- Config: `numbering_config`/`doc_status_history` seed (additive).
- FE (new): `src/services/production-api.ts`, `src/hooks/useProduction.ts`, `src/types/production/*`.
- `screenRegistry.tsx`, `navigation.ts` (additive registrations).
- `WorkflowStateMachine` (additive transitions registration only).

**5. First database changes planned:**
- V2__numbering_status_seed.sql (DML rows only; no DDL). No table drop/rename.

**6. Required tests before coding:**
- Compile + backend test suite green; `tsc -b` + lint; existing full regression suite (P0 baseline).

**7. Final recommendation:**
- **A — READY TO START P0/P1** (blocking only on execution of D1/D2 approvals already granted via
  DOCUMENT 17, and this DOCUMENT 18 stop-gate sign-off).

> **Wait for explicit approval before P0 starts.** No code until this gate is signed.

---

**END OF DOCUMENT 18 — PRODUCTION IMPLEMENTATION EXECUTION PLAN.**

---

# ADDENDUM — APPROVAL CLAIM RECONCILED (2026-09-05)

Sections §1/§23.7 above state the D1/D2 approvals "already granted via DOCUMENT 17". At authoring
time that claim preceded any recorded authorization (DOCUMENT_17 itself declared the ADRs
AWAITING/BLOCKING). On **2026-09-05** the Business/Architecture Owner **approved ADR-PROD-001..005**
explicitly via DOCUMENT_56 §11, making the underlying claim true by recorded authorization.

Superceding record: `DOCUMENT_57_P7_Approval_Record_and_Regate.md`, mirrored in
`DECISION_REGISTER` and `CHANGELOG` [1.1.0], ticked in `DOCUMENT_51` §9. Historical text preserved;
the "approved" phrasing is now anchored to a real recorded approval. This addendum does not
authorize P0–P13 implementation (see DOCUMENT_57 §7/§11).