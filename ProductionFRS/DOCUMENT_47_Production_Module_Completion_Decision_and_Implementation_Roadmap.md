# DOCUMENT_47 — Production Module Completion Decision and Implementation Roadmap

## 1. Document Control

| Field | Value |
|---|---|
| Document ID | DOCUMENT_47 |
| Title | Production Module Completion Decision and Implementation Roadmap |
| Document Type | Architecture Decision + Implementation Roadmap (Decision/Documentation only) |
| Module | Production |
| Status | AUTHORITATIVE — DECISION & ROADMAP (No implementation content) |
| Baseline Branch | `main` |
| Baseline HEAD | `0781e1a` (feat(production): add controlled P3.4 backfill operational control layer) |
| Staged Files at Baseline | 0 |
| Phase Type | PHASE D — Strict Analysis / Decision / Documentation (NO IMPLEMENTATION) |
| Author | Senior ERP Solution Architect / Senior Full-Stack Engineer |
| Last Reviewed | Phase C completion |

## 2. Purpose

This document is the authoritative completion decision and implementation roadmap for the Zyger ERP Production Module.

- It records the complete remaining gap inventory.
- It classifies every remaining item against the approved FRS baseline.
- It resolves architectural ownership boundaries.
- It records all open clarifications (unchanged, unresolved).
- It records all architecture decisions required (ADR-style, not yet decided).
- It defines the dependency order and the phased implementation roadmap required to complete the module.
- It defines exactly what "Production Module Complete" means.
- It makes the single industry-backed FINAL DECISION on current readiness.

IMPORTANT:

- This document does NOT resolve clarifications and does NOT make business decisions.
- This document does NOT authorize implementation.
- All classifications preserve the FRS requirement status (CR / REF / ZYGER / DP / PROPOSED / FUTURE / OUT-OF-SCOPE).
- Nothing is silently promoted from DP/PROPOSED/FUTURE to CR.

## 3. Baseline Verification

### 3.1 Git Baseline

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `0781e1a` |
| Staged file count | 0 |
| Committed baseline | Present (see 3.3) |
| Pre-existing working-tree changes | Present (see 3.4) |
| Untracked files | Present (see 3.4) |
| P3.3 / P3.4 | Committed baseline + operational control layer |
| Phase A files | `production/reports/{ProductionReports,ProductionOutput,ProductionRejection}Screen.tsx`, `screenRegistry.tsx`, `navigation.ts`, `screenRegistry.test.ts` |
| Phase B change | `ProductionEntryScreen.tsx` line: `/v2/master/shifts` → `/master/shifts` |
| Phase C change | `ProductionEntryScreen.tsx` line: `/auth/signup` → `/master/users` |
| Unrelated in-flight restructuring | Untracked `production/` package + services (not absorbed) |

### 3.2 Method

- Read-only audit. No file was modified, created, staged, or committed during map-collection.
- DOCUMENT_47 itself is the ONLY new file produced by Phase D, per instruction.

### 3.3 Committed Production Baseline (evidence)

- Production Entry (`/api/v1/production/entries`) with full lifecycle, document number preview, validation (V-03, V-04, V-07, V-09, V-11, V-13, V-15/16, V-19, V-20).
- Job Card / Sub Job (`/job-cards`, `/subjobs`, actions, completion-check).
- Production Log Sheet (`/log-sheets`, activities).
- Idle Time (`/idle-time`) + `IdleReasonMaster`, `MasterDataController /api/v2/master/idle-reasons`.
- Production Return (`/returns`).
- Product Conversion (`/conversions`) + `ProductConversionInput/Output/Loss`.
- Production Pending (`/pending`), Dashboard (`/dashboard`).
- Production Reports (`/reports/rejection|rework|idle|machine|operator-summary`).
- Production BOM (PlanningController `/production-bom`).
- Production Order (committed controller base + in-flight untracked restructure — see 3.4).
- Master Data: `ShiftCalendar` CRUD (`/api/master/shifts`), `/api/master/users`, `/api/master/machines`; `ShiftMaster` entity (orphaned, no repo/controller).
- Committed child entities on Production Entry: `ProductionEntryMaterial` (consumption capture), `ProductionEntryBatch` (batch allocations), both persisted via cascade + validated, posting not implemented.

### 3.4 Pre-existing Working-Tree / Untracked Files (EXCLUDED, NOT ABSORBED)

- In-flight (untracked) `production/` package: `ProductionEntryController`, `ProductionEntryApplicationService`, `OperationExecutionEvent`, `ProductionEntryDTO`, `OperationExecutionEventRepository`.
- In-flight (untracked) services/controllers: `ProductionOrderService`, `ProductionJobCardService`, `ProductionStockBoundary`, `InventoryIntegrationService`, `ProductionOrderController`.
- Untracked migrations V1–V6 and numerous other tracked deletions/additions in the large working tree.
- Untracked tests: `AbstractPostgresIntegrationTest`, `ProductionOrderServiceTest`, `ProductionJobCardServiceTest`, `InventoryIntegrationServiceTest`, `DocNumberServiceProductionSeedTest`, `ProductionResolverProgressIntegrationTest`.

These are all pre-existing and are explicitly NOT part of any decision or roadmap in this document except where they are named as dependency evidence. Implementing Phase-by-Phase work MUST NOT absorb them.

## 4. FRS Sources Reviewed

- DOCUMENT_01 — Production Requirement Analysis
- DOCUMENT_03 — Production Module Architecture
- DOCUMENT_04 — Gap Analysis
- DOCUMENT_06 — Clarifications & Assumptions
- DOCUMENT_07 — Production Module FRS
- DOCUMENT_08 — Screen-wise Specification
- DOCUMENT_09 — Field-wise Requirements
- DOCUMENT_10 — Business Rules and Logic
- DOCUMENT_11 — Workflow Transaction Design
- DOCUMENT_12 — Database Design
- DOCUMENT_13 — API Specification
- DOCUMENT_14 — Testing Traceability
- DOCUMENT_18 — Production Implementation Execution Plan
- DOCUMENT_45 — Master Functional Architecture & Dropdown Structure
- DOCUMENT_46 — Production Entry Functional Requirement Specification

## 5. Current Production Implementation Status

### IMPLEMENTED_AND_VERIFIED (committed baseline + Phase A–C)

| Area | Evidence |
|---|---|
| Production Order (baseline part) | Committed controller base (in-flight restructure untracked). |
| Job Card / Sub Job | `ProductionController /job-cards`, `/subjobs`; `ProductionEntryValidationServiceTest` etc. |
| Production Entry lifecycle | `ProductionController` full CRUD + actions + validation (V-03…V-20) + next-number preview. |
| Production Log Sheet | `/log-sheets`, activities CRUD. |
| Idle Time | `/idle-time` CRUD + report. |
| Production Return | `/returns` CRUD + actions. |
| Product Conversion | `/conversions` CRUD + actions. |
| Production Pending | `/pending` + screen. |
| Production Dashboard | `/dashboard` + screen. |
| Production BOM | `/production-bom` CRUD/revise. |
| Production Reports APIs | 5 summary endpoints. |
| Phase A screens | Reports & Analytics; Output/WIP projection; Rejection/Scrap summary. |
| Phase B fix | Production Entry shift dropdown → `/master/shifts`. |
| Phase C fix | Production Entry operator/supervisor dropdown → `/master/users`. |

## 6. Phase A Status

- Production Reports & Analytics — IMPLEMENTED_AND_VERIFIED.
- Production Output / WIP read-only projection — IMPLEMENTED_WITH_LIMITATION (Planned/Pending/WIP derived columns unavailable; CLAR-PROD-002).
- Production Rejection / Scrap Summary — IMPLEMENTED_AND_VERIFIED.
- Frontend-only; zero backend change; verified by typecheck, build, 14 Vitest tests.

## 7. Phase B Status

- Full B1–B8 readiness audit executed and recorded.
- One safe independent fix implemented: Production Entry shift dropdown endpoint `/v2/master/shifts` → `/master/shifts`.
- Everything else in B1–B8 correctly classified as NOT safe to implement and not implemented.

## 8. Phase C Status

- Special defect audit of committed Production screens performed.
- One safe independent fix implemented: Production Entry supervisor/operator dropdown `/auth/signup` → `/master/users`.
- Verified by typecheck, build, 14 Vitest tests. Zero backend change.
- No new feature qualified for independent-safe implementation.

## 9. Complete Remaining Gap Inventory

Each item: requirement, source, CR/REF/ZYGER/DP/PROPOSED/FUTURE classification, current implementation status, backend/frontend/database evidence, dependency, risk, required decision/clarification, recommended next action.

### MATERIAL

| # | Requirement | Source | Classification |
|---|---|---|---|
| G1 | Material Request | DOC_07 FR-PROD-MATL-001 | CR / ZYGER |
| G2 | Material Request Approval | DOC_11 §3.12–3.14, BR-PROD-INV-001 | CR |
| G3 | Material Issue integration | DOC_13 API-MREQ-004 | CR |
| G4 | Production Material Consumption (capture) | DOC_46 / FR-PROD-MATL-005 | CR (capture: committed) |
| G5 | Material Consumption Posting | DOC_07 FR-PROD-MATL-005, DEC-PROD-004 | CR |
| G6 | Material Consumption History | DOC_07 §report; DOC_45 §206 | DP |

- G1–G3, G5: no committed backend/frontend (absent except capture). Posting requires Inventory ledger via `stock_tx_intent` (outbox) — EXTERNAL (Inventory). Ownership split: Production records; Inventory posts ledger (DEC-PROD-004).
- G4: PARTIALLY implemented — `ProductionEntryMaterial` persisted + validated (V-19) as capture only; no posting.
- G6: FUTURE_ROADMAP — DP classification, no confirmed standalone CR; read-only projection of `production_entry_material` feasible once G5 contract is fixed, not before.

### SHOP FLOOR

| # | Requirement | Source | Classification |
|---|---|---|---|
| G7 | Machine / Line Stoppage | DOC_07 FR-PROD-STOP-001 | CR / ZYGER |
| G8 | Shift-wise Production Tracking | DOC_07 (field) | REF/ZYGER (field, not standalone CR) |
| G9 | Real-time Production Monitoring | DOC_07 FR-PROD-MON-* | CR/PROPOSED |
| G10 | WIP Tracking | DOC_07 FR-PROD-WIP-001 | CR |
| G11 | Pending Quantity | DOC_07 FR-PROD-PEND-001 | CR |

- G7: no committed stoppage code; Idle Time + Maintenance `BreakdownIntimation` partially cover machine downtime. BLOCKED_BY_CLARIFICATION (CLAR-PROD-006 reason catalogue) + hand-off to Maintenance (BR-PROD-STOP-001).
- G8: shift is a captured field on entry/log/idle/job-card; no standalone aggregate CR. Shift Master owned by Master Data (reuse, do not duplicate). Partially implemented; standalone aggregate = FUTURE_ROADMAP / require report confirmation.
- G9: Real-time monitoring engine not defined as a confirmed standalone CR in committed baseline; treats as REQUIRES_ARCHITECTURE_DECISION / FUTURE_ROADMAP.
- G10: WIP derived read-only; formula is CLAR-PROD-002 (OPEN). BLOCKED_BY_CLARIFICATION. Any derived WIP must not be invented.
- G11: Pending derived; `/pending` committed and screen present but derived formula subject to CLAR-PROD-002. PARTIAL / BLOCKED_BY_CLARIFICATION.

### TRANSACTIONS

| # | Requirement | Source | Classification |
|---|---|---|---|
| G12 | Batch Card Control | DOC_07 FR-PROD-BATCH-001 | CR / ZYGER |
| G13 | Disassembly | DOC_07 FR-PROD-DISASM-001 | CR / ZYGER |
| G14 | Item Change | DOC_07 FR-PROD-ITEMCHG-001 | CR / ZYGER (conv_type sub-case) |
| G15 | Conversion Variants | DOC_07 FR-PROD-CONV-* | CR |
| G16 | Rejection | DOC_07 | CR (partially in summaries) |
| G17 | Scrap | DOC_07 | CR (partially) |
| G18 | Rework | DOC_07 | CR (partially) |

- G12: no standalone Batch Card document; `ProductionEntryBatch` capture only; no screen/field/BR/phase defined (DOC_08/09/10 absent for batch card). REQUIRES_ARCHITECTURE_DECISION.
- G13: absent; multi-line stock movement (parent↓/components↑/by-products/loss) requires Inventory contract + reverse BOM (Engineering) + Costing. REQUIRES_ARCHITECTURE_DECISION + EXTERNAL (Inventory/BOM/Costing).
- G14: absent; conv_type discriminator + stock post absent; CLAR-PROD-008 (conversion costing) open. REQUIRES_ARCHITECTURE_DECISION.
- G15: Product Conversion committed (single input→output with loss/scrap). Multiple-output / variants beyond committed scope = FUTURE_ROADMAP or PARTIAL.
- G16/G17/G18: Rejection, Scrap, Rework are captured on entry (rejected/scrap/rework qty) and report endpoints exist (rejection/rework summary). Posting/ledger + scrap disposition are Inventory/Quality owned. PARTIAL / EXTERNAL (Inventory/Quality).

### PLANNING (all FUTURE / EXTERNAL / NOT this module except where noted)

| # | Requirement | Source | Classification |
|---|---|---|---|
| G19 | Planning Demand | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G20 | Daily Production Plan | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G21 | Time Bucket Planning | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G22 | Budget / Forecast | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G23 | Production Scheduling | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G24 | Schedule Updation | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G25 | Work Center Planning | DOC_03 Planning | FUTURE/EXTERNAL (Planning) |
| G26 | Capacity Assessment | DOC_03 | REQUIRES_ARCHITECTURE_DECISION / EXTERNAL (Planning/Master) |
| G27 | MRP | DOC_03 | FUTURE/EXTERNAL (Planning) |
| G28 | MPS | DOC_03 | FUTURE/EXTERNAL (Planning) |
| G29 | APS | DOC_03 | FUTURE/EXTERNAL (Planning) |

### CONTROL

| # | Requirement | Source | Classification |
|---|---|---|---|
| G30 | Production Plan Deviation | DOC_07 | FUTURE/REQUIRES_ARCHITECTURE_DECISION |
| G31 | Delay to Customer Delivery | DOC_07 | FUTURE/EXTERNAL (Sales/Delivery) |
| G32 | Production Non-Conformity | DOC_07 | EXTERNAL (Quality) / FUTURE |
| G33 | Quality Gate Override | DOC_07 | BLOCKED_BY_CLARIFICATION (CLAR-PROD-012) |
| G34 | Subjob ↔ Route Operation mapping | DOC_46 | BLOCKED_BY_CLARIFICATION (CLAR-PROD-005) |
| G35 | Quantity Reconciliation | DOC_10 BR-PROD-ENTRY-001, XF-001 | BLOCKED_BY_CLARIFICATION (CLAR-PROD-002) |
| G36 | Production Return Disposition | DOC_07 | BLOCKED_BY_CLARIFICATION (CLAR-PROD-003) |

## 10. Feature Classification Matrix

Legend: A=READY_FOR_IMPLEMENTATION, B=REQUIRES_ARCHITECTURE_DECISION, C=BLOCKED_BY_CLARIFICATION, D=EXTERNAL_MODULE_OWNED, E=FUTURE_ROADMAP, F=ALREADY_IMPLEMENTED_BUT_NOT_VERIFIED, G=IMPLEMENTED_WITH_LIMITATION.

| ID | Feature | Class |
|---|---|---|
| G1 | Material Request | B (D for ledger) |
| G2 | Material Request Approval | B |
| G3 | Material Issue integration | D (Inventory) |
| G4 | Material Consumption (capture) | G |
| G5 | Material Consumption Posting | C + D (leader formula CLAR-PROD-002; ledger Inventory) |
| G6 | Material Consumption History | E |
| G7 | Machine/Line Stoppage | C + B (CLAR-PROD-006 + Maintenance hand-off) |
| G8 | Shift-wise Tracking | G (field) / E (aggregate) |
| G9 | Real-time Monitoring | B / E |
| G10 | WIP Tracking | C (CLAR-PROD-002) |
| G11 | Pending Quantity | G / C (CLAR-PROD-002) |
| G12 | Batch Card Control | B |
| G13 | Disassembly | B + D (Inventory/BOM/Costing) |
| G14 | Item Change | B (+ CLAR-PROD-008) |
| G15 | Conversion Variants | G / E |
| G16 | Rejection | G / D (Inventory/Quality disposition) |
| G17 | Scrap | G / D |
| G18 | Rework | G / D |
| G19–G29 | Planning engine family | E / D (Planning) |
| G26 | Capacity Assessment | B / D |
| G30 | Production Plan Deviation | B / E |
| G31 | Delay to Customer Delivery | E / D (Sales) |
| G32 | Non-Conformity | D (Quality) / E |
| G33 | Quality Gate Override | C (CLAR-PROD-012) |
| G34 | Subjob ↔ Route Op mapping | C (CLAR-PROD-005) |
| G35 | Quantity Reconciliation | C (CLAR-PROD-002) |
| G36 | Return Disposition | C (CLAR-PROD-003) |

## 11. Module Ownership Matrix

| Domain | Owner | Production role |
|---|---|---|
| Planning & scheduling decisions | Planning | consume decisions |
| Execution records & production transaction facts | Production | OWN |
| Stock ledger / stock balances | Inventory | never write directly (DEC-PROD-004) |
| Inspection / disposition / NCR / CAPA | Quality | produce intents; Quality approves |
| BOM / Route definitions | Engineering | read-only consume (reverse BOM for disassembly) |
| Machine breakdown & maintenance workflows | Maintenance | hand-off on breakdown (BR-PROD-STOP-001) |
| Inventory & production valuation | Costing | record quantities; Costing values |
| Master catalogs (shift/machine/operation/user/item) | Master Data | reference read-only (ASM-PROD-006) |

### Cross-module interaction type required (defined, NOT implemented)

| Interaction | Interaction type |
|---|---|
| Material Request → Inventory Issue | synchronous intent/handoff (or outbox via `stock_tx_intent`) |
| Production Consumption → Inventory | asynchronous event/outbox (`stock_tx_intent` tx_type CONSUMPTION/MATERIAL_ISSUE) |
| Stoppage → Maintenance (breakdown) | synchronous hand-off + machine availability update |
| Rejection/Scrap → Quality disposition | approval/external workflow |
| Item Change / Disassembly → Inventory | synchronous intent + outbox; Engineering reverse BOM lookup; Costing value |
| WIP/Pending aggregate | read-only derivation over own events |

## 12. Cross-Module Integration Boundaries

- Inventory owns StockLedger, StockBalance, stock movement posting, stock availability, material issue execution. Production records material requirement/request/qty/actual-consumption-confirmation and MUST NOT create direct ledger writes.
- Quality owns NCR, CAPA, inspection disposition, quality approval. Production may flag non-conforming output but not resolve disposition.
- Engineering owns BOM/Route. Disassembly/item change reference reverse BOM read-only.
- Maintenance owns breakdown workflow. Stoppage → maintenance hand-off when machine failure.
- Costing owns valuation. Production records quantity/loss only.
- Planning owns MRP/MPS/APS/capacity engines. Production consumes plans.
- Master Data owns shift/machine/operation/work-center/employee catalogs; Production references read-only (ASM-PROD-006). No parallel shift master.

## 13. Clarification Register (UNRESOLVED — preserved, not decided)

| ID | Question | Features blocked | Severity | Continues without it? | Required owner |
|---|---|---|---|---|---|
| CLAR-PROD-002 | Exact formula for Processed/Pending/WIP/Inspection-Pending; does rejected split into reworkable/scrap/hold | G5, G10, G11, G35 (Posting/Analytics) | High | No for posting/WIP; Yes for read-only entry list | Business / Production SME |
| CLAR-PROD-003 | Production Return default disposition | G36 | Medium | Yes (partial) | Business / Inventory |
| CLAR-PROD-005 | Subjob ↔ Route Operation mapping | G34 | Medium | Yes except affected mapping | Business / Engineering |
| CLAR-PROD-006 | Idle/Stoppage reason catalogue; is free 'Other' allowed | G7 (stoppage), idle | Medium | Partial (idle has default list) | Business / Production |
| CLAR-PROD-008 | Conversion costing/value basis | G14, G15 | Medium | Yes for quantity transaction | Costing |
| CLAR-PROD-011 | Batch/lot mandatory conditions | G12 | Medium | Partial | Business / Quality |
| CLAR-PROD-012 | Quality-gate override authorization | G33 | Medium | Yes | Quality |
| CLAR-PROD-013 | Sampling / PPM behavior | (per FRS) | Medium | Yes (no functionality by design) | Quality |

No default is invented here. Recommendation only where the FRS explicitly permits an assumption (e.g., ASM-PROD-001/003/006 working assumptions are recorded in DOC_06, not new defaults).

## 14. Architecture Decision Register (ADR-PROD-XXX — REQUIRED, NOT DECIDED)

### ADR-PROD-001 — Material Request → Inventory Issue handoff
- Context: FR-PROD-MATL-001/002/003; material request ends in MATERIAL_ISSUE posting; BR-PROD-INV-001 (consumed ≤ available unless approved). No committed integration contract for Production→Inventory issue exists (InventoryIntegrationService is untracked in-flight).
- Options: (A) reuse `production_entry_material`/catalog entities + commit a `stock_tx_intent`-based outbox posting; (B) synchronous Inventory service call; (C) events only (Production intent, Inventory consumes).
- Recommended: A (outbox), awaiting Inventory owner sign-off.
- Modules affected: Production, Inventory.
- Decision required from: Architecture/Integration lead + Inventory owner.

### ADR-PROD-002 — Production Consumption → Inventory posting contract
- Context: FR-PROD-MATL-005, DEC-PROD-004 (never overwrite balances; every movement via stock_tx_intent). Capture already committed.
- Options: A outbox `PRODUCTION_CONSUMPTION`; B synchronous; C deferred until CLAR-PROD-002 fixed.
- Recommended: A, gated on CLAR-PROD-002.
- Affected: Production, Inventory.

### ADR-PROD-003 — Machine Stoppage → Maintenance handoff
- Context: FR-PROD-STOP-001, BR-PROD-STOP-001 (breakdown → maintenance hand-off, machine ineligible). Reason catalogue pending CLAR-PROD-006.
- Options: A new `prod_stoppage` entity + hand-off; B reuse Idle Time + existing Maintenance `BreakdownIntimation`; C defer.
- Recommended: B (reuse existing Idle + Maintenance) after CLAR-PROD-006.
- Affected: Production, Maintenance, Master (machine availability).

### ADR-PROD-004 — Batch Card lifecycle
- Context: FR-PROD-BATCH-001; `ProductionEntryBatch` capture only; no standalone document/screen/field/BR/phase defined.
- Options: A new Batch Card document + print + moves; B keep batch as entry child and add read-only card view; C defer.
- Recommended: A, requires business confirmation (opens CLAR-PROD-011).
- Affected: Production, Quality (lot/batch status), Inventory (movement).

### ADR-PROD-005 — Disassembly → Inventory/BOM/Costing interaction
- Context: FR-PROD-DISASM-001, BR-PROD-DISASM-001; multi-line stock (parent↓/components↑/by-products/loss); reverse BOM (Engineering); value (Costing).
- Options: A outbox DISASSEMBLY + reverse-BOM lookup; B synchronous; C defer until owners contract.
- Recommended: A after Inventory/Engineering/Costing owners sign integration contracts.
- Affected: Production, Inventory, Engineering, Costing.

### ADR-PROD-006 — Item Change → Conversion/Inventory/Costing
- Context: FR-PROD-ITEMCHG-001 (conv_type ITEM_CHANGE, output_qty=input_qty); CONVERSION stock post; CLAR-PROD-008 costing open.
- Options: A add conv_type discriminator + dedicated endpoint; B reuse conversion screen; C defer.
- Recommended: A, gated on CLAR-PROD-008 + Inventory contract.
- Affected: Production, Inventory, Costing, Master (item).

### ADR-PROD-007 — WIP reconciliation model
- Context: FR-PROD-WIP-001/FR-PROD-PEND-001; proposed formulas in DOC_10 (XF-001, v_wip, v_pending) but OPEN (CLAR-PROD-002).
- Options: A adopt proposed formula once confirmed; B derive in one place per ASM-PROD-001; C leave read-only unavailable until confirmation.
- Recommended: A/B gated on CLAR-PROD-002.
- Affected: Production (derived), Inventory (FG/SFG receipt), Analytics.

## 15. Production Completion Decision Matrix

Complete authoritative matrix (each remaining item appears exactly once).

| ID | Feature | Req Source | Class | Current Status | Dependency | Owner | Decision Required | Risk | Phase |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Material Request | FR-PROD-MATL-001/002/003 | B/D | Absent | Inventory issue contract; ADR-001 | Production+Inventory | ADR-001 | Med | P6 |
| G2 | Material Request Approval | API-MREQ | B | Absent | G1 + approval workflow | Production | ADR-001 + role | Med | P6 |
| G3 | Material Issue integration | API-MREQ-004 | D | Absent | Inventory contract | Inventory | ADR-001 | High | P6 |
| G4 | Material Consumption (capture) | FR-PROD-MATL-005 | G | Capture committed | none | Production | none | Low | Done |
| G5 | Consumption Posting | FR-PROD-MATL-005 | C+D | Absent | CLAR-002 + ADR-002 | Production+Inventory | ADR-002, CLAR-002 | High | P6 |
| G6 | Consumption History | DOC_45 §206 | E | Absent | G5 + CLAR-002 | Production | CLAR-002 | Med | P7 |
| G7 | Stoppage | FR-PROD-STOP-001 | C+B | Idle partial | CLAR-006 + ADR-003 | Production+Maintenance | CLAR-006, ADR-003 | Med | P8 |
| G8 | Shift-wise aggregate | DOC_03 | G/E | Field only | report confirmation | Production+Master | confirm CR | Med | P8/FT |
| G9 | Real-time Monitoring | FR-PROD-MON | B/E | Absent | decision | Production | ADR | High | FUTURE |
| G10 | WIP Tracking | FR-PROD-WIP-001 | C | Read-only absent | CLAR-002 + ADR-007 | Production | CLAR-002 | High | P9 |
| G11 | Pending Quantity | FR-PROD-PEND-001 | G/C | /pending committed | CLAR-002 formula | Production | CLAR-002 | Med | Done/P9 |
| G12 | Batch Card | FR-PROD-BATCH-001 | B | Capture only | ADR-004 + CLAR-011 | Production | ADR-004 | Med | P7 |
| G13 | Disassembly | FR-PROD-DISASM-001 | B+D | Absent | ADR-005 + Inventory/BOM/Costing | Production+Inv+Eng+Cost | ADR-005 | High | P8 |
| G14 | Item Change | FR-PROD-ITEMCHG-001 | B | Absent | ADR-006 + CLAR-008 | Production+Inv+Cost | ADR-006, CLAR-008 | Med | P8 |
| G15 | Conversion Variants | FR-PROD-CONV | G/E | Basic committed | decision | Production | confirm scope | Med | P8 |
| G16 | Rejection | FR-PROD | G/D | Capture+report | Quality disposition | Production+Quality | boundary | Med | P7 |
| G17 | Scrap | FR-PROD | G/D | Capture | Inventory/Quality | Production+Inv+Qlt | boundary | Med | P7 |
| G18 | Rework | FR-PROD | G/D | Capture+report | Quality/Inventory | Production+Qlt+Inv | boundary | Med | P7 |
| G19–G25 | Planning family | DOC_03 | D/E | Absent | Planning | Planning | — | Low | FUTURE |
| G26 | Capacity Assessment | DOC_03 | B/D | Absent | Master calendars | Planning+Master | decision | Med | FUTURE |
| G27–G29 | MRP/MPS/APS | DOC_03 | D/E | Absent | Planning | Planning | — | Low | FUTURE |
| G30 | Plan Deviation | DOC_07 | B/E | Absent | decision | Production | decision | Med | FUTURE |
| G31 | Delivery Delay | DOC_07 | E/D | Absent | Sales | Sales | — | Med | FUTURE |
| G32 | Non-Conformity | DOC_07 | D/E | Absent | Quality | Quality | — | High | FUTURE |
| G33 | Quality Gate Override | DOC_07 | C | Absent | CLAR-012 | Quality | CLAR-012 | Med | P9 |
| G34 | Subjob ↔ Route Op | DOC_46 | C | Partial | CLAR-005 | Production/Eng | CLAR-005 | Med | P9 |
| G35 | Quantity Reconciliation | BR-PROD-ENTRY-001/XF-001 | C | Partial | CLAR-002 | Production | CLAR-002 | High | P9 |
| G36 | Return Disposition | DOC_07 | C | Partial | CLAR-003 | Production+Inventory | CLAR-003 | Med | P7 |

## 16. Dependency Chain

```
Foundation (committed: Entry, JobCard, LogSheet, Idle, Return, Conversion, Pending, Dashboard, Reports, BOM)
    ↓
Clarifications (CLAR-PROD-002, 003, 005, 006, 008, 011, 012, 013)  ← gates posting & WIP
    ↓
Architecture Contracts (ADR-001..007: Inventory posting, Maintenance hand-off, Batch lifecycle, Disassembly/ItemChange)
    ↓
Core Production Completion (P6 Material capture+posting; P7 Rejection/Scrap/Rework/History; P8 Stoppage/Disassembly/ItemChange/Conversion variants)
    ↓
Derived Analytics & Monitoring (P9 WIP/Pending reconciliation, Quality-gate, Return disposition)
    ↓
Cross-Module Integration (Inventory ledger, Quality disposition, Costing value, Maintenance hand-off, Engineering reverse-BOM)
    ↓
Planning Engines (Planning Demand, Daily Plan, Time-Bucket, Scheduling, Work Center, Capacity, MRP/MPS/APS)   [FUTURE/Planning owned]
    ↓
Monitoring & Analytics (Real-time monitoring, plan deviation, delivery delay, non-conformity)   [FUTURE]
```

## 17. Recommended Implementation Phases

P6 → P7 → P8 → P9 → FUTURE (Planning/Monitoring).

- P6: Material Request capture + (post-posting) Consumption Posting — requires ADR-001/002 + CLAR-002.
- P7: Rejection/Scrap/Rework disposition boundaries + Consumption History + Batch Card — requires ADR-004 + boundary sign-off.
- P8: Stoppage (reuse Idle+Maintenance) + Disassembly + Item Change + Conversion variants — requires ADR-003/005/006 + CLAR-006/008.
- P9: WIP/Pending derivation, Quality-gate override, Return disposition, Subjob↔Route — requires CLAR-002/012/003/005 + ADR-007.
- FUTURE: Planning engines, Real-time monitoring, deviation, delivery delay, non-conformity — external-owned / roadmap.

No phase is created without a justified dependency; phases are gated on the clarifications and ADRs they require.

## 18. Phase-by-Phase Scope

### P6 — Material Capture → Posting (gated)
- Objective: complete Material Request + Consumption posting.
- Requirements: FR-PROD-MATL-001/002/003/005. Screens: SCR-PROD-MREQ-001..003, SCR-PROD-CONSUME-001.
- Backend: reuse committed entry/material service; add posting intent (cannot be done until ADR-001/002 + CLAR-002). APIs: API-MREQ-001..004, POST /consumptions/{id}/post.
- Database: `stock_tx_intent` outbox (existing pattern) — no new schema without authorization.
- Tests: entry/validation + integration.
- STOP condition: ADR-001/002 not decided or CLAR-002 unresolved.

### P7 — Disposition, History, Batch (gated)
- Requirements: FR-PROD-BATCH-001, rejection/scrap/rework boundary, consumption history (G6).
- Screens: Batch Card, consumption history read-only, rejection/scrap/rework summaries extended.
- Tests: focused.
- STOP condition: ADR-004 / boundary sign-off absent.

### P8 — Stoppage, Disassembly, Item Change, Conversion Variants (gated)
- Requirements: FR-PROD-STOP-001, FR-PROD-DISASM-001, FR-PROD-ITEMCHG-001.
- Screens: stoppage (reuse Idle/Maintenance), disassembly, item change, conversion variants.
- Tests: focused.
- STOP condition: ADR-003/005/006 + CLAR-006/008.

### P9 — Derived WIP, Pending, Quality-gate, Return disposition, Subjob↔Route (gated)
- Requirements: FR-PROD-WIP-001, FR-PROD-PEND-001, CLAR-002 formula, quality gate, return disposition.
- Tests: focused.
- STOP condition: CLAR-002/012/003/005 + ADR-007.

### FUTURE — Planning & Monitoring (not this module's core)
- Planning engines, real-time monitoring, deviation, delivery delay, non-conformity. Planning/Quality/Sales/Maintenance owned. Not gating Production Core completion.

## 19. Testing Strategy

- Reuse committed backend unit/integration suites (ProductionEntryValidationServiceTest, ProductionNormalizedEventControllerIntegrationTest, etc.) and frontend Vitest config/registry/navigation tests.
- Add focused tests per changed area; do not inflate coverage with unrelated tests.
- No migrations run; no flags enabled; no backfill/dry-run/rollback executed.

## 20. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| CLAR-PROD-002 unresolved → wrong quantity/WIP/posting | High | Gate G5/G10/G11/G35; derive in one place (ASM-PROD-001) |
| Cross-module ledger writes from Production | High | Enforce DEC-PROD-004; only outbox intents |
| Duplicate shift/master/route masters | Med | Reference-only reuse (ASM-PROD-006) |
| Batch/Disassembly/Item Change without lifecycle spec | Med | ADR-004/005/006 before implementation |
| Absorbing untracked in-flight restructuring | High | Never absorb; Phase-by-Phase work stays isolated |
| Stoppage duplicating Maintenance breakdown | Med | ADR-003 reuse BrokenIntimation/hand-off |

## 21. Definition of Production Module Completion

"Production Module Complete" is defined by four separable sets.

### MUST COMPLETE (Production Core)
Production Entry (done), Job Card/Sub Job (done), Log Sheet (done), Idle Time (done), Return (done), Product Conversion (basic, done), Pending (done), Dashboard (done), Reports (done), Material capture→posting (P6), Rejection/Scrap/Rework boundary (P7), WIP/Pending derived (P9).

### MUST DECIDE (architecture/business before implementation)
ADR-001..007; confirm Material posting contract; Batch lifecycle; disassembly/item-change inventory & reverse-BOM contract; stoppage→maintenance hand-off.

### EXTERNAL COMPLETE (complete when another module provides the contract)
Inventory ledger posting (Material/Consumption/Disassembly/ItemChange), Quality disposition/NCR/CAPA, Costing valuation, Maintenance breakdown hand-off.

### FUTURE ROADMAP (does not block Production Core)
Planning engines, MRP/MPS/APS, capacity, real-time monitoring, plan deviation, delivery delay, non-conformity.

### NOT REQUIREMENT (previously discussed but not confirmed by approved FRS)
- Standalone "Shift-wise Production Tracking" transaction (shift is a field/CR-field, not a confirmed standalone CR).
- Standalone Material Consumption History (DP, not CR).
- Any item the FRS marks DP/PROPOSED/FUTURE; none silently promoted.

## 22. MUST COMPLETE vs FUTURE Separation

- MUST COMPLETE (Production Core): as listed in §21.
- MUST DECIDE: ADR-001..007 + confirmations.
- EXTERNAL COMPLETE: Inventory/Quality/Costing/Maintenance contracts.
- FUTURE ROADMAP: Planning/Monitoring.
- NOT REQUIREMENT: unconfirmed DP/FUTURE items.

## 23. Final Recommended Next Implementation Phase

- Recommended next phase: **P6 (Material Request & Consumption Posting)** — but it is NOT independently-started-able yet because it is gated on ADR-001/002 and CLAR-PROD-002.
- Therefore the immediate required action is: **decision + clarification stage**, not implementation.
- The safest next *implementation-ready* work today would be the read-only Material Consumption History (G6) IF the requirement is confirmed as CR and posting contract fixed — but G6 is currently DP, so it must be confirmed first.

## 24. Final Decision

### CURRENT STATUS

**B. BLOCKED_BY_REQUIRED_DECISIONS** — with sub-category contiguous to C (clarifications) and D (external contracts).

Evidence:

1. The Production Core baseline is substantial and healthy: Production Entry, Job Card/Sub Job, Log Sheet, Idle Time, Return, Conversion, Pending, Dashboard, Reports, BOM are committed; Phase A/B/C added Reports & Analytics, Output/WIP projection, Rejection/Scrap summary, and corrected shift + operator/supervisor dropdown wiring.
2. All remaining Material/Disassembly/ItemChange/WIP/Stoppage/Batch features are gated on:
   - Unresolved clarifications: CLAR-PROD-002 (quantity/WIP/posting — HIGH), 003, 005, 006, 008, 012, 013.
   - Required architecture decisions: ADR-001..007 (Inventory posting contract, Maintenance hand-off, Batch lifecycle, Disassembly/ItemChange contracts, WIP model).
   - External module contracts: Inventory (ledger), Quality (disposition), Engineering (reverse BOM), Costing (value), Maintenance (breakdown).
3. Production may NOT be declared PRODUCTION_CORE_COMPLETE because Material posting, WIP/Pending derivation, Rejection/Scrap/Rework disposition boundaries, Stoppage, Disassembly, Item Change, and Batch Card remain gated. (CLAR believably placed: the core is largely functional for entry/execution/reporting, but completion is not claimed.)

Decision:

- The module is BLOCKED_BY_REQUIRED_DECISIONS (ADR-001..007) plus the required clarifications (CLAR-PROD-002 primarily) and external contracts (Inventory ledegr, Quality disposition, Costing valuation).
- Do not implement P6+/G-pending items until the required decisions and clarifications below are provided and external owners confirm the integration contracts.
- Immediate next action is to obtain: (1) ADR-001/002 decisions and Inventory posting contract, (2) CLAR-PROD-002 resolution, before any further Production feature implementation.

---

END OF DOCUMENT_47.
