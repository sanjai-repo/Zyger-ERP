# DOCUMENT_45 — PRODUCTION MODULE MASTER FUNCTIONAL ARCHITECTURE & DROPDOWN STRUCTURE

| Field | Value |
| --- | --- |
| Document ID | DOCUMENT_45 |
| Title | Production Module Master Functional Architecture & Dropdown Structure |
| Module | Zyger ERP — Production |
| Type | Functional Planning — READ-ONLY analysis deliverable |
| Author | Agent (authorized documentation session) |
| Date | 2026-09-04 |
| Status | Analysis Complete — documentation only |
| Authorization | None for implementation/staging/commit |
| Classification Basis | DOCUMENT_01, 03, 05, 06, 07, 08, 10, 11 (ProductionFRS) |

**MODE: DOCUMENTATION AND READ-ONLY ANALYSIS ONLY. NO IMPLEMENTATION PERFORMED.**

---

## 1. Document Control

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-09-04 | Agent | Initial publication of master Production module architecture & dropdown structure |

Source references cited throughout use the ProductionFRS document identifiers (e.g. DOCUMENT_03 §4, DOCUMENT_07 §02). Requirement tags (FR-PROD-*, CR-PROD-*, ASM-PROD-*, DEC-PROD-*, CLAR-PROD-*, FUT-PROD-*) are preserved verbatim from the source documents.

---

## 2. Purpose

This document defines the **master functional architecture** of the Zyger ERP Production module and the **proposed dropdown/menu navigation structure**, grounded exclusively in the **confirmed requirements already recorded in the existing ProductionFRS documentation**.

It classifies every element as one of:
- **CONFIRMED REQUIREMENT** — explicitly required in the source FRS.
- **DEVELOPMENT PROPOSAL** — a sensible design recommendation not explicitly stated as a requirement.
- **DEPENDENCY TO REVIEW** — requires an open clarification / external module resolution before design completes.
- **OUT OF CURRENT SCOPE** — explicitly deferred or owned by another module.

The purpose is to prepare correct **frontend navigation planning only**. No code, no database, no configuration changes.

---

## 3. Scope

- Define the Production module master dropdown/navigation hierarchy.
- Define every recommended menu/screen with purpose, roles, I/O, dependencies, source, ownership, classification, and implementation status.
- Define module ownership boundaries across Planning → Production → Quality → Inventory.
- Define the master workflow.
- Fix the architectural position of Production Entry and Job Card.
- Provide duplication/conflict analysis and a frontend navigation recommendation.
- Recommend the next documentation sequence . Do not create further documents automatically.

---

## 4. Non-Scope

Explicitly NOT in this document:
- No backend implementation.
- No frontend (React) implementation.
- No database schema, migration, or configuration changes.
- No inventory/stock posting changes.
- No `production_entry` modification.
- No P3.3 (DOCUMENT_43/44 backfill control) modification.
- No P3.4 file changes.
- No staging, commit, push, migration execution, flag enablement, backfill, or production workflows.
- No complete Production Entry screen design (deferred to DOCUMENT_46).
- No complete Job Card design (deferred to DOCUMENT_47).

---

## 5. Current Production Architecture Context

Committed state as of this analysis:
- Branch `main`; HEAD `db5abb2` = P3.3 backfill **committed** baseline.
- P3.4 implementation exists only as **8 untracked P3.4 files** (controller, command service, 2 DTOs, 2 tests, DOCUMENT_43, DOCUMENT_44), **none staged, none committed**.
- Unrelated pre-existing restructuring (Flyway, SecurityConfig, broader tracked/untracked production workflow files) remains **isolated** from functional scope.
- The functional scope of this document is the **Production FRS architecture** (DOCUMENT_01–DOCUMENT_11), independent of the P3.3/P3.4 backfill-and-control implementation work (which concerns historical data backfill of the execution engine, not this navigation architecture).

---

## 6. Source Requirement Review

The architecture below is grounded in the following confirmed source documents and their key structures:

| Source | Contribution |
| --- | --- |
| DOCUMENT_01 | Master CNC demand chain; process risks |
| DOCUMENT_03 | **14-submodule Production hierarchy**; ownership (owns / planning layer / integrates-not-duplicates); integration contracts |
| DOCUMENT_05 | Conflict analysis and clarifications needed |
| DOCUMENT_06 | Clarifications register (CLAR-PROD-*), assumptions (ASM-PROD-*), future enhancements (FUT-PROD-*) |
| DOCUMENT_07 | Full FRS: FR-PROD-* for every screen; terminology (TERM-PROD-001 PO vs WO); numbering; stock-posting rule (DEC-PROD-004); quality boundary |
| DOCUMENT_08 | Screen-wise spec, screen IDs SCR-PROD-*, screen Groups A–J |
| DOCUMENT_10 | Business rules (e.g. BR-PROD-REJ-001 rejection classification/disposition) |
| DOCUMENT_11 | Entity execution lifecycles and status dimensions |

**Key confirmed invariant:** The **14-submodule hierarchy (DOC_03 §4)** and the **A–J screen groups (DOC_08)** are the closest stated structure. **No document defines the actual UI sidebar/dropdown wireframe** — the dropdown is therefore a **DEVELOPMENT PROPOSAL** derived from the confirmed 14 modules and A–J groups.

---

## 7. Production Module Master Architecture

Master architecture derived from the confirmed 14-submodule list (DOC_03 §4) and A–J screen groups (DOC_08), grouped into logical navigation domains:

```
PRODUCTION
│
├── 01 Production Planning (Planning Layer)
├── 02 Production Orders (Core)
├── 03 Job Management / Job Card (Core)
├── 04 Shop Floor Execution (Core)
├── 05 Production Material Management (Core + Inventory intent)
├── 06 Production Quality Integration (Core record + Quality disposition)
├── 07 Rework & Rejection Management (Core + Quality disposition)
├── 08 Scrap Management (Core + Quality disposition)
├── 09 Idle Time & Downtime (Core)
├── 10 Product Conversion (Core + Inventory intent)
├── 11 Disassembly (Core + Inventory intent)
├── 12 Production Monitoring (Read-only derived)
├── 13 Capacity & Performance (Read-mostly; engine futures)
└── 14 Production Reports & Analytics (Read-only)
```

**Mapping of the task's candidate 5-group split:** The proposed top-level split (Production Planning / Shop Floor Execution / Production Transactions / Monitoring & Control / Production Reports) is **adopted and mapped**:

| Candidate group | Maps to confirmed submodules | Verdict |
| --- | --- | --- |
| Production Planning | 01 (Planning Layer) | CONFIRMED as its own section; see §9.1 re: Planning-vs-Production |
| Shop Floor Execution | 02, 03, 04 (Orders, Job Card, Execution) | CONFIRMED |
| Production Transactions | 05, 07, 08, 09, 10, 11 (Material, Rework/Rej/Scrap, Idle, Conversion, Disassembly) | CONFIRMED (with Inventory intents noted) |
| Monitoring & Control | 06 (Quality integration view), 12, 13 (Monitoring, Capacity/Performance) | CONFIRMED (read-mostly / cross-functional) |
| Production Reports | 14 (Reports & Analytics) | CONFIRMED |

---

## 8. Production Dropdown Structure

**Proposed Production dropdown (DEVELOPMENT PROPOSAL)** — grounded in confirmed submodules/groups. Each leaf carries a classification (CR = Confirmed Requirement; DP = Development Proposal; DR = Dependency to Review; O/S = Out of Current Scope).

```
PRODUCTION
│
├── Production Planning
│   ├── Planning Demand                       CR   (FR-PROD-PLAN-001)
│   ├── Item-wise Daily Plan                  CR   (FR-PROD-PLAN-002)
│   ├── Time Bucket & Rolling Schedule        CR   (FR-PROD-PLAN-003/004)
│   ├── Production Budget / Forecast          CR*  (FR-PROD-PLAN-005..009; engine = FUTURE)
│   ├── PO Day/Week/Month Schedule            CR   (FR-PROD-PLAN-010)
│   ├── Schedule Updation                     CR   (FR-PROD-PLAN-011)
│   └── (Work Center Planning → below under Capacity) 
│
│   Work Center / Capacity (Shared, see §9.1)
│   ├── Work Center Daily / Period Plan       CR   (FR-PROD-WC-001/002)
│   ├── Work Center Re-allocation             CR   (FR-PROD-WC-003)
│   └── Capacity Assessment                   CR   (FR-PROD-CAP-001)
│
│   Exceptions & Deviation
│   ├── Production Plan Deviation             CR   (FR-PROD-EXCP-001)
│   └── Delay to Customer Delivery            CR   (FR-PROD-PLAN-012)
│
├── Production Orders
│   ├── Production Order                      CR   (FR-PROD-ORDER-001)
│   ├── Composite Production Order            CR   (FR-PROD-ORDER-002)
│   ├── Rework Production Order               CR   (FR-PROD-ORDER-003)
│   └── Production Order Short Close          CR   (FR-PROD-ORDER-004)
│
├── Shop Floor Execution
│   ├── Job Card                              CR   (FR-PROD-JOBCARD-001)
│   ├── Job Entry                             CR   (FR-PROD-JOBCARD-002)
│   ├── Subjob Entry                          CR   (FR-PROD-JOBCARD-003) (CLAR-PROD-005 = DR)
│   ├── Job Completion                        CR   (FR-PROD-JOBCARD-004)
│   ├── Final-Part Production Workspace       CR   (FR-PROD-ENTRY-004, DEC-PROD-001)
│   ├── Production Entry                      CR   (FR-PROD-ENTRY-001)
│   ├── Rework Production Entry               CR   (FR-PROD-ENTRY-002)
│   ├── Multiple-Output Production Entry      CR   (FR-PROD-ENTRY-003)
│   └── Production Log Sheet                  CR   (FR-PROD-LOG-001)
│
├── Production Transactions
│   ├── Production Material Request           CR   (FR-PROD-MATL-001)
│   ├── Additional Material Request           CR   (FR-PROD-MATL-002)
│   ├── Other Material Request                CR   (FR-PROD-MATL-003)
│   ├── Consumable Consumption                CR   (FR-PROD-MATL-004)
│   ├── Material Consumption Posting          CR   (FR-PROD-MATL-005) (Inventory intent)
│   ├── Scrap Generation                      CR   (FR-PROD-SCRAP-001)
│   ├── Rework Workspace                      CR   (FR-PROD-ENTRY-002 rework)
│   ├── Idle Time                             CR   (FR-PROD-IDLE-001)
│   ├── Line / Machine Stoppage               CR   (FR-PROD-STOP-001)
│   ├── Production Return                     CR   (FR-PROD-RETURN-001) (Inventory intent)
│   ├── Product / Item Conversion             CR   (FR-PROD-CONV-001) (Inventory intent)
│   ├── Item Change                           CR   (FR-PROD-ITEMCHG-001)
│   ├── Disassembly                           CR   (FR-PROD-DISASM-001)
│   └── Batch Card Control                    CR   (FR-PROD-BATCH-001)
│
├── Monitoring & Control
│   ├── WIP Tracking                          CR   (read-only, SCR-PROD-WIP-001)
│   ├── Production Pending                    CR   (read-only, SCR-PROD-PEND-001)
│   ├── Production Output View                CR   (read-mostly, SCR-PROD-OUT-001)
│   ├── Production Non-Conformity             CR   (SCR-PROD-NCONF-001) (links Quality NCR)
│   └── Production Quality Integration (inspection-pending/reject/rework/scrap view)  CR (DOC_07 §14)
│
├── Capacity & Performance
│   ├── OEE / Manufacturing Performance       DR   (O/S engine; ASM-PROD-007; not duplicated)
│   └── Work Center Load vs Capacity          CR   (FR-PROD-CAP-001)
│
└── Production Reports & Analytics
    ├── Operation / Entry Register            DP
    ├── Material Consumption Report           DP
    ├── Rejection / Scrap / Rework Report     DP
    ├── Idle / Downtime Report                DP
    ├── Plan vs Actual                        CR   (DOC_03 §2.2)
    ├── Manpower Plan vs Actual               CR   (DOC_03 §2.2)
    └── Production Entry Traceability Report  DP
```

> **Note on Planning:** The source documents conceptually include the **Production Planning Layer as submodule #1 of Production** (DOC_03 §4) while also treating MRP/MPS/APS as external futures. Per §9.1 this document recommends Production Planning remain **inside the Production menu as its own top section**, with a clear "Planning authority" boundary and an explicit marker that optimization engines are external futures.

---

## 9. Detailed Menu and Screen Matrix

Each recommended item below includes: Menu Name; Parent; Screen; Business Purpose; Primary User/Role; Main Inputs; Main Outputs; Upstream Dependencies; Downstream Dependencies; Source Module; Owning Module; Requirement Evidence; Classification; Implementation Status.

### 9.1 Production Planning

| Field | Value |
| --- | --- |
| Menu Name | Production Planning |
| Parent Menu | PRODUCTION |
| Screen Name | Planning Demand; Daily Plan; Time Bucket; Budget/Forecast; Schedule; Schedule Updation |
| Business Purpose | Turn demand into an executable production schedule and plan (Planning authority). |
| Primary User / Role | Production Planner / Planning role |
| Main Inputs | Demand (orders/forecast/MRP), capacity, BOM/route availability |
| Main Outputs | Released schedule; work-center load plan; plan-vs-actual actuals feedback |
| Upstream Dependencies | MRP/Planning demand (external future engine for optimization), Sales forecast |
| Downstream Dependencies | Production Orders (release), Work Center plan |
| Source Module | Planning Layer (DOC_03 §4 submodule #1) |
| Owning Module | **Planning Layer (within Production menu; optimization engines external)** |
| Requirement Evidence | FR-PROD-PLAN-001..012, FR-PROD-WC-001..003, FR-PROD-CAP-001 (DOC_07 §11, DOC_08 §I) |
| Classification | CONFIRMED REQUIREMENT (screens); MRP/MPS/APS engines = FUTURE |
| Implementation Status | Planned (not yet built in committed baseline) |

---

### 9.2 Production Orders

| Field | Value |
| --- | --- |
| Menu Name | Production Orders |
| Parent Menu | PRODUCTION |
| Screen Name | Production Order; Composite PO; Rework PO; PO Short Close |
| Business Purpose | Authorize manufacturing of a final item in a specific quantity against a plan, referencing an approved BOM and route sheet (DOC_07 §02). Planning/authorization-level document. |
| Primary User / Role | Production Planner / Production Manager (approval) |
| Main Inputs | Approved BOM, route sheet, demand/plan, item, qty |
| Main Outputs | Released Production Order (→ Work/Job authorization) |
| Upstream Dependencies | Planning, Engineering (BOM/route), Master Data (item/plant) |
| Downstream Dependencies | Work Order / Job Card execution |
| Source Module | Production Core (DOC_03 §4 submodule #2) |
| Owning Module | **Production (planning/authorization level)** — see TERM-PROD-001 re WO |
| Requirement Evidence | FR-PROD-ORDER-001..004 (DOC_07 §02) |
| Classification | CONFIRMED REQUIREMENT |
| Implementation Status | Planned (core; committed baseline not built) |

---

### 9.3 Job Management / Job Card

| Field | Value |
| --- | --- |
| Menu Name | Shop Floor Execution → Job Card (and sub-items) |
| Parent Menu | PRODUCTION |
| Screen Name | Job Card; Job Entry; Subjob Entry; Job Completion |
| Business Purpose | Execution document controlling a specific production job; created from a Production Order (DOC_07 §03). |
| Primary User / Role | Production Supervisor / Shop-floor operator |
| Main Inputs | Released Production/Work Order, route operations, material availability |
| Main Outputs | Job Card with subjob/operation status; FG/SFG receipt trigger at Job Completion |
| Upstream Dependencies | Production Order (authorization), Route Sheet (Engineering) |
| Downstream Dependencies | Production Entry (operation events), material issues, Quality gate at completion |
| Source Module | Production Core (DOC_03 §4 submodule #3) |
| Owning Module | **Production** |
| Requirement Evidence | FR-PROD-JOBCARD-001..004 (DOC_07 §03, CR-PROD-005) |
| Classification | CONFIRMED REQUIREMENT (Subjob mapping = DEPENDENCY TO REVIEW, CLAR-PROD-005) |
| Implementation Status | Planned (committed baseline not built) |

---

### 9.4 Shop Floor Execution (Operation Events)

| Field | Value |
| --- | --- |
| Menu Name | Shop Floor Execution |
| Parent Menu | PRODUCTION |
| Screen Name | Final-Part Production Workspace; Production Entry; Rework Entry; Multiple-Output Entry; Production Log Sheet |
| Business Purpose | Core execution record of operation events: input/processed/accepted/rejected/rework/scrap, machine, operator, shift, timings, runtime, idle, inspection, material consumption (DOC_07 §04). |
| Primary User / Role | Shop-floor operator / machine operator |
| Main Inputs | Active job/operation, machine, operator, quantities, timings, inspection status |
| Main Outputs | Operation events; inspection-pending; material-consumption intents; output (accepted/rejected/rework/scrap) |
| Upstream Dependencies | Job Card / Work Order, Route Sheet operations, Machine/Operator masters |
| Downstream Dependencies | WIP/Pending derivation, Inventory posting intents, Quality inspection, Quality disposition for defects |
| Source Module | Production Core (DOC_03 §4 submodule #4) |
| Owning Module | **Production** |
| Requirement Evidence | FR-PROD-ENTRY-001..004 (DOC_07 §04, DEC-PROD-001) |
| Classification | CONFIRMED REQUIREMENT |
| Implementation Status | Planned (execution engine design is DOCUMENT_18-P4-linked; not built in committed baseline) |

---

### 9.5 Production Material Management

| Field | Value |
| --- | --- |
| Menu Name | Production Transactions → Material |
| Parent Menu | PRODUCTION |
| Screen Name | Production Material Request; Additional Material Request; Other Material Request; Consumable Consumption; Material Consumption Posting |
| Business Purpose | Confirm material requirement and consumption; post consumption **intents** to Inventory (ledger). Production records consumption confirmation; Inventory owns the ledger/debit. |
| Primary User / Role | Production Supervisor / Store (issue/return) |
| Main Inputs | BOM, job, issued qty, consumed qty, deviations, consumable usage |
| Main Outputs | Material request; consumption confirmation; **posting intents** (not direct stock writes) |
| Upstream Dependencies | Engineering BOM, Inventory stock availability, Job Card |
| Downstream Dependencies | Inventory issue/consumption postings (ledger), Costing actuals |
| Source Module | Production Core (DOC_03 §4 submodule #5) |
| Owning Module | **Production = consumption confirmation; Inventory = ledger** (DEC-PROD-004) |
| Requirement Evidence | FR-PROD-MATL-001..005 (DOC_07 §05) |
| Classification | CONFIRMED REQUIREMENT |
| Implementation Status | Planned |

---

### 9.6 Quality Integration (Records/Disposition)

| Field | Value |
| --- | --- |
| Menu Name | Monitoring & Control → Production Quality Integration |
| Parent Menu | PRODUCTION |
| Screen Name | Inspection-pending; rejection recording; rework link; scrap disposition (view/link) |
| Business Purpose | Production generates inspection-pending and rejection/rework/scrap **dispositions**; NCR/CAPA/PPAP workflows are **owned by Quality** (DOC_07 §14, DOC_03 §2.3). |
| Primary User / Role | Production operator/supervisor (record); Quality (disposition/approval of scrap/hold) |
| Main Inputs | Operation output, inspection results from Quality |
| Main Outputs | Rejection classification {REWORKABLE/SCRAP/HOLD_MRB}; rework reference; NCR link |
| Upstream Dependencies | Production Entry output, Quality inspection results |
| Downstream Dependencies | Quality NCR/CAPA/PPAP workflows (Quality-owned), Rework order/entry, Scrap posting intent |
| Source Module | Production + Quality integration contract (DOC_03 §2.3) |
| Owning Module | **Recording: Production; Disposition/NCR/CAPA/PPAP: Quality** |
| Requirement Evidence | FR-PROD-REJ-001 (DOC_07 §07), BR-PROD-REJ-001 (DOC_10 §3) |
| Classification | CONFIRMED REQUIREMENT (disposition authority-part = DEPENDENCY/Quality) |
| Implementation Status | Planned |

---

### 9.7 Rework / Rejection / Scrap

| Field | Value |
| --- | --- |
| Menu Name | Production Transactions → Rework / Rejection / Scrap |
| Parent Menu | PRODUCTION |
| Screen Name | Rejection Recording; Rework Workspace; Scrap Generation; Rework Production Entry |
| Business Purpose | Record and classify rejected quantity with traceability; drive rework execution; record scrap with authorization (DOC_07 §07). |
| Primary User / Role | Production supervisor / operator; authorized approver for scrap/hold |
| Main Inputs | Rejected qty, reason, NCR, authorized rework qty, rework route, scrap reason |
| Main Outputs | Rework order/entry; scrap transaction intent; traceability records |
| Upstream Dependencies | Production Entry output, Quality disposition |
| Downstream Dependencies | Rework PO (FR-PROD-ORDER-003), Material/inventory intents, Quality NCR |
| Source Module | Production Core (DOC_03 §4 submodules #7/#8) |
| Owning Module | **Production (execution); Quality (scrap/hold disposition approval)** |
| Requirement Evidence | FR-PROD-REJ-001, FR-PROD-SCRAP-001 (DOC_07 §07) |
| Classification | CONFIRMED REQUIREMENT |
| Implementation Status | Planned |

---

### 9.8 Scrap

See 9.7 (Scrap Generation grouped with Rework/Rejection). Number: `SC-{PLANT}-{FY}-{SEQ}` (DOC_07 §21).

---

### 9.9 Idle Time & Downtime

| Field | Value |
| --- | --- |
| Menu Name | Production Transactions → Idle Time / Stoppage |
| Parent Menu | PRODUCTION |
| Screen Name | Idle Time; Line / Machine Stoppage |
| Business Purpose | Record periods a resource is available but not producing (idle) with a controlled reason; record stoppage category (may map to Maintenance breakdown) (DOC_07 §09). |
| Primary User / Role | Shop-floor operator / supervisor |
| Main Inputs | Machine, shift, start/end, reason (controlled catalogue) |
| Main Outputs | Idle/stoppage records; downtime events → Maintenance (breakdown) |
| Upstream Dependencies | Machine master, shift master, reason catalogue (CLAR-PROD-006 = DR) |
| Downstream Dependencies | OEE (Availability input), Maintenance (breakdown link) |
| Source Module | Production Core (DOC_03 §4 submodule #9) |
| Owning Module | **Production (record); Maintenance (breakdown on machine failure)** |
| Requirement Evidence | FR-PROD-IDLE-001, FR-PROD-STOP-001 (DOC_07 §09) |
| Classification | CONFIRMED REQUIREMENT (reason catalogue = DEPENDENCY TO REVIEW) |
| Implementation Status | Planned |

---

### 9.10 Product Conversion / Disassembly

| Field | Value |
| --- | --- |
| Menu Name | Production Transactions → Conversion / Disassembly |
| Parent Menu | PRODUCTION |
| Screen Name | Product/Item Conversion; Item Change; Disassembly |
| Business Purpose | Convert input item → output item/state; record input/output qty, process loss, scrap, batch/lot and **update-inventory intent**; disassemble parent to components (DOC_07 §08). |
| Primary User / Role | Production supervisor / authorized operator |
| Main Inputs | Input item, output item(s), qty, loss, batch/lot, value context |
| Main Outputs | Conversion/disassembly transactions; **stock-intent updates** |
| Upstream Dependencies | Item masters, BOM (for disassembly), Production Entry/Job context |
| Downstream Dependencies | Inventory postings (ledger), Costing value |
| Source Module | Production Core (DOC_03 §4 submodules #10/#11) |
| Owning Module | **Production (transaction); Inventory (ledger); Costing (value)** |
| Requirement Evidence | FR-PROD-CONV-001, FR-PROD-ITEMCHG-001, FR-PROD-DISASM-001 (DOC_07 §08) |
| Classification | CONFIRMED REQUIREMENT |
| Implementation Status | Planned |

---

### 9.11 Monitoring & Control

| Field | Value |
| --- | --- |
| Menu Name | Monitoring & Control |
| Parent Menu | PRODUCTION |
| Screen Name | WIP Tracking; Production Pending; Production Output View; Production Non-Conformity; Quality Integration view |
| Business Purpose | Read-only, derived views of WIP / Pending / Output; record production non-conformity (links Quality NCR) (DOC_07 §06, DOC_08 §J). |
| Primary User / Role | Production supervisor / management read-only |
| Main Inputs | Derived from operation events/output (single source of truth, ASM-PROD-001) |
| Main Outputs | WIP by item/order/operation/batch/lot/qty/status; pending = planned − completed; non-conformity record |
| Upstream Dependencies | Production Entry, Route/operations |
| Downstream Dependencies | Management visibility; exception escalation |
| Source Module | Production Monitoring (DOC_03 §4 submodule #12) |
| Owning Module | **Production (derived, read-only)** |
| Requirement Evidence | FR-PROD-WIP-001, FR-PROD-PEND-001, SCR-PROD-NCONF-001, FR-PROD-OUT-001 |
| Classification | CONFIRMED REQUIREMENT (derived read-only) |
| Implementation Status | Planned (WIP/Pending/Output views) |

---

### 9.12 Capacity & Performance

| Field | Value |
| --- | --- |
| Menu Name | Capacity & Performance |
| Parent Menu | PRODUCTION |
| Screen Name | Capacity Assessment; Work Center Load; OEE / Manufacturing Performance |
| Business Purpose | Machine+manpower load vs capacity; cross-functional performance (OEE) (DOC_03 §8). |
| Primary User / Role | Production planner / management |
| Main Inputs | Work-center plans, actual production output, availability, rejection/scrap |
| Main Outputs | Capacity loading; OEE (single engine, not duplicated, ASM-PROD-007) |
| Upstream Dependencies | Work Center plan, Production/Maintenance/Quality data |
| Downstream Dependencies | Re-planning decisions |
| Source Module | Production Capacity (DOC_03 §4 submodule #13) |
| Owning Module | **Production (capacity); OEE = cross-functional single engine (DEVELOPMENT PROPOSAL / Dependency)** |
| Requirement Evidence | FR-PROD-CAP-001 (DOC_08 §I), ASM-PROD-007 |
| Classification | Capacity screens = CONFIRMED; OEE engine = DEPENDENCY TO REVIEW / DP |
| Implementation Status | Capacity = Planned; OEE = Not Yet Defined |

---

### 9.13 Production Reports & Analytics

| Field | Value |
| --- | --- |
| Menu Name | Production Reports & Analytics |
| Parent Menu | PRODUCTION |
| Screen Name | Entry register; consumption report; rejection/scrap/rework report; idle/downtime report; plan-vs-actual; manpower plan-vs-actual; traceability report |
| Business Purpose | Reporting on production execution, consumption, quality, utilization, plan-vs-actual (DOC_03 §2.2). |
| Primary User / Role | Management / supervisors |
| Main Inputs | All production actuals (entries, consumption, idle, output) |
| Main Outputs | Reports/analytics |
| Upstream Dependencies | All core execution data |
| Downstream Dependencies | Management decisions/visibility |
| Source Module | Production (DOC_03 §4 submodule #14) |
| Owning Module | **Production (reports)** |
| Requirement Evidence | Plan-vs-actual & manpower plan-vs-actual (DOC_03 §2.2); others = DP |
| Classification | CONFIRMED (plan-vs-actual) + DEVELOPMENT PROPOSAL (specific report list) |
| Implementation Status | Planned / Not Yet Defined (specific reports) |

---

## 10. Module Ownership Boundaries

Clear ownership across **PLANNING → PRODUCTION → QUALITY → INVENTORY**, plus Engineering/Master-Data/Costing/Maintenance/MRP boundaries (DOC_03 §2, §7).

### Production OWNS (DOC_03 §2.1 — CONFIRMED)
Shop-floor execution; production orders within approved scope; job execution; operation execution; actual production output; production material requirement/consumption **confirmation**; consumable consumption confirmation; machine usage capture; manpower usage capture; WIP execution status; rework execution; rejection **recording**; scrap generation; idle time; stoppage; production exceptions.

### ExecutionEntity Ownership Calls

| Entity | Owning Module | Basis | Classification |
| --- | --- | --- | --- |
| Planning authority (demand→schedule) | Planning Layer (inside Production menu section) | DOC_03 §4 submodule #1 | CONFIRMED |
| Production Order | **Production** (planning/authorization level) | TERM-PROD-001, FR-PROD-ORDER-001 | CONFIRMED |
| Work Order | **Production** (execution level under PO; single level → PO=WO) | TERM-PROD-001; ASM-PROD-014 | DEPENDENCY TO REVIEW (PO/WO split is PROPOSED) |
| Route Sheet | **Engineering** (Production consumes read-only) | DOC_07 §16, ASM-PROD-005 | CONFIRMED |
| Job Card | **Production** | FR-PROD-JOBCARD-001..004 | CONFIRMED |
| Sub Job | **Production** (1:1 to route operation default; free only under authz) | FR-PROD-JOBCARD-003; CLAR-PROD-005 | DEPENDENCY TO REVIEW |
| Production Entry | **Production** (execution record) | FR-PROD-ENTRY-001 | CONFIRMED |
| Production Completion | **Production** (Job Completion), FG/SFG receipt intent | FR-PROD-JOBCARD-004, BR-PROD-INV-002 | CONFIRMED |
| Production Return | **Production** (return record) + **Inventory** (stock return transaction) | FR-PROD-RETURN-001, DEC-PROD-004 | CONFIRMED (split) |
| Product Conversion | **Production** (transaction) + **Inventory** (ledger) + **Costing** (value) | FR-PROD-CONV-001, DEC-PROD-004 | CONFIRMED (split) |
| Production Log Sheet | **Production** | FR-PROD-LOG-001 | CONFIRMED |
| Idle Time | **Production** (record); Maintenance (breakdown) | FR-PROD-IDLE-001/STOP-001 | CONFIRMED |
| Production Pending | **Production** (derived read-only) | FR-PROD-PEND-001, ASM-PROD-001 | CONFIRMED |
| Material Consumption | **Production** (confirmation/intent) + **Inventory** (ledger) | FR-PROD-MATL-005, DEC-PROD-004 | CONFIRMED (split) |
| Finished Goods Receipt | **Inventory** (ledger) from accepted output (eligible last op) | BR-PROD-INV-002, DEC-PROD-004 | CONFIRMED (Inventory owns ledger) |
| Rejection recording | **Production** | FR-PROD-REJ-001 | CONFIRMED |
| Rejection disposition (HOLD_MRB)/scrap approval | **Quality** | BR-PROD-REJ-001, DOC_03 §2.3 | CONFIRMED (Quality) |
| Rework execution | **Production** | FR-PROD-ENTRY-002, Rework PO | CONFIRMED |
| Stock Posting | **Inventory** (ledger); Production supplies **intents** | DEC-PROD-004 | CONFIRMED (Inventory owns) |
| WIP | **Production** (execution status, derived) | ASM-PROD-001 | CONFIRMED |

### Hard boundary rule (this document's guardrail)
**Production must NOT directly own inventory/stock posting merely because it records an event.** Four distinct concerns are kept separate:
1. **BUSINESS EVENT RECORDING** → Production.
2. **INVENTORY POSTING** → Inventory (controlled stock transactions).
3. **QUALITY DISPOSITION** → Quality (NCR/CAPA/PPAP; scrap/hold approval).
4. **PLANNING AUTHORITY** → Production Planning Layer (schedule) with external MRP/APS engines future.

---

## 11. Planning → Production → Quality → Inventory Workflow

Validated master workflow (matches DOC_01 §1.2 demand chain and DOC_11 lifecycles; unsupported stages flagged):

```
PLANNING AUTHORITY ............................... CONFIRMED (Planning Layer)
        │  demand / schedule
        v
PRODUCTION ORDER (authorization-level doc) ....... CONFIRMED (FR-PROD-ORDER-*, TERM-PROD-001)
        │  release
        v
WORK / PRODUCTION AUTHORIZATION .................. CONFIRMED (WO under PO; single-level PO=WO — DR: ASM-PROD-014)
        │
        v
ROUTE SHEET / OPERATION SEQUENCE ................. CONFIRMED (Engineering-owned, read-only — ASM-PROD-005)
        │
        v
JOB / JOB CARD ................................... CONFIRMED (FR-PROD-JOBCARD-001)
        │  job entry (validate material availability partial allowed — ASM-PROD-003)
        v
MACHINE / OPERATOR EXECUTION ..................... CONFIRMED (FR-PROD-JOBCARD-002)
        │
        v
PRODUCTION ENTRY (operation event) ............... CONFIRMED (FR-PROD-ENTRY-001)
        │
        v
OPERATION COMPLETION ............................. CONFIRMED (doc/execution/op status dims — DOC_11)
        │
        v
QUALITY GATE .................................... CONFIRMED (inspection-pending; Quality disposition for defects — DOC_07 §14, CLAR-PROD-012 DR)
        │
        v
NEXT OPERATION OR COMPLETION ..................... CONFIRMED (op status next/completed)
        │
        v
JOB COMPLETION → FG/SFG receipt .................. CONFIRMED (BR-PROD-JOBCARD-001, BR-PROD-INV-002)
        │
        v
DOWNSTREAM INVENTORY PROCESS (FG/SFG receipt, consumables, returns, scrap) ..... CONFIRMED (Inventory ledger via intents — DEC-PROD-004)
```

**Unsupported/flagged stages:** MRP/APS optimization (WORK/PLANNING AUTHORITY → external engine) = **DEVELOPMENT PROPOSAL / FUTURE**. No stage is invented beyond the confirmed chain; deep PPAP = out of scope (Quality, FUT-PROD-004).

---

## 12. Production Entry Architectural Position

Position fixed per DOC_07 §04 and DEC-PROD-001:

- **Must exist before Production Entry:** authorizing document (Production/Work Order), route/operation sequence (Engineering read-only), Job Card (execution document), job entry with material-availability validation, machine/operator assignment.
- **What Production Entry records (operation-level event):** input quantity, processed, accepted, rejected, rework, scrap, machine, operator, shift, actual start/end datetime, runtime, idle time/reason, inspection status, material consumption (FR-PROD-ENTRY-001).
- **What Production Entry must NOT change:** stock balances directly, quality dispositions, planning authority. It records facts and produces data for derived WIP/Pending and posting intents.
- **Relationship with Route Sheet:** entry executes one route operation (multiple-output per FR-PROD-ENTRY-003); route owned by Engineering read-only.
- **Relationship with operation sequence:** each entry maps to a route operation; operation status NOT_STARTED→…→COMPLETED (DOC_11 §1.3).
- **Relationship with Job Card:** entries are operation events under a Job (Sub)Job; job completion reconciles subjobs/ops (FR-PROD-JOBCARD-004).
- **Relationship with machine/operator:** captures machine + operator + shift per entry.
- **Relationship with completed/rejected/pending quantity:** completed/accepted & rejected & rework & scrap captured atomically; Pending and WIP are **backend-derived read-only** (ASM-PROD-001, CLAR-PROD-002 DR).
- **Relationship with Quality:** generates inspection-pending; Quality disposes scrap/hold; NCR flows to Quality.
- **Relationship with Inventory:** consumption confirmaation + FG/SFG/return/scrap **intents**; Inventory is the ledger (DEC-PROD-004).

> Production Entry sits at the **centre of the operation-level execution** layer — between Job Card (execution document) and derived WIP/Pending + Inventory/Quality integration. Full screen design is deferred to DOCUMENT_46.

---

## 13. Job Card Architectural Position

Determination from requirements (no invention):

| Question | Determination | Basis |
| --- | --- | --- |
| Is Job Card a parent transaction? | **Yes** — parent to operation/subjob execution events | FR-PROD-JOBCARD-001..004 |
| Is Production Entry created against a Job Card? | **Yes (subjob/operation)** — entries run under the job | FR-PROD-JOBCARD-003, DOC_07 §03/§04 |
| Is Sub Job required? | **Required as default 1:1 to route operation**; free breakdown only under authorization | FR-PROD-JOBCARD-003; CLAR-PROD-005 = **DEPENDENCY TO REVIEW** |
| Is Job Card generated from Work Order? | **Yes** (created from a Production/Work Order) | FR-PROD-JOBCARD-001 |
| Is Job Card generated from Route Sheet operations? | **Partially** — subjobs default 1:1 to route operations; exact generation rule = DEPENDENCY TO REVIEW | ASM-PROD-005 / CLAR-PROD-005 |

**Architectural role:** Job Card is the **execution document** and the **parent of operation-level Production Entries**. It sits between Production/Work Order (authorization) and Production Entry (execution event). Full design deferred to DOCUMENT_47; subjob-route mapping behavior flagged as DR until CLAR-PROD-005 resolves.

---

## 14. Production Transaction Classification

| Transaction | Type | Direction of Stock Effect | Owner | Classification |
| --- | --- | --- | --- | --- |
| Production Order release | Authorization | None | Production | CONFIRMED |
| Job Card / Subjob | Execution doc | None | Production | CONFIRMED (DR subjob) |
| Production Entry | Execution record | None direct (facts) | Production | CONFIRMED |
| Material Request / Consumable | Requirement/consumption confirm | Issue intent | Production + Inventory | CONFIRMED |
| Material Consumption Posting | Consumption confirm | Issue/consume intent | Production + Inventory (ledger) | CONFIRMED |
| Production Return | Return record | Return intent | Production + Inventory | CONFIRMED |
| Finished Goods Receipt | Output | Receipt intent (from accepted last op) | Inventory (ledger) + Production (trigger) | CONFIRMED |
| Rejection / Scrap | Disposition record | Scrap/HOLD intent; Quality approves | Production record + Quality disposition | CONFIRMED |
| Rework | Execution | Rework issue/receipt intents | Production | CONFIRMED |
| Product Conversion / Disassembly | Conversion | Input-out / output-in intents | Production + Inventory + Costing | CONFIRMED |
| Idle / Stoppage | Utilization record | None | Production (+Maintenance breakdown) | CONFIRMED |
| WIP / Pending | Derived read-only | None | Production (derived) | CONFIRMED |

---

## 15. Dependency Matrix

| Dependent (Production) | Upstream Provider | Dependency Type | Status |
| --- | --- | --- | --- |
| Production Order | Planning demand, BOM, route | Data (Engineering/MRP) | CONFIRMED (optimization engines Future) |
| Job Card | Work Order, machine/operator masters | Data | CONFIRMED |
| Production Entry | Route ops, machine/operator/shift, Job Card | Data | CONFIRMED |
| Material Consumption | BOM, Inventory stock | Data + intent | CONFIRMED (ledger external) |
| Finished Goods Receipt | Accepted output last op | Intent → Inventory | CONFIRMED |
| Quality gate | Inspection results, NCR | Data (Quality) | CONFIRMED (disposition part DR) |
| Scrap/Hold approval | Quality authorization | Workflow | CONFIRMED (Quality-owned) |
| Cost snapshot | Costing rates/rules | Data (read-only) | CONFIRMED (Costing owns) |
| OEE | Availability/Performance/Quality | Data (single engine) | DEPENDENCY TO REVIEW |
| Subjob mapping | Route ops + clarification | Rule | DEPENDENCY TO REVIEW (CLAR-PROD-005) |
| Idle reason catalogue | Controlled catalogue (+Other) | Rule | DEPENDENCY TO REVIEW (CLAR-PROD-006) |

---

## 16. Duplicate Ownership / Conflict Analysis

| Function | Planning | Production | Inventory | Quality | **Owner** |
| --- | --- | --- | --- | --- | --- |
| Demand→schedule | ✓ | – | – | – | **Planning Layer** |
| Production Order auth | ✓(input) | ✓owns | – | – | **Production** |
| Work Order release | – | ✓ | – | – | **Production** |
| Route Sheet / Operation seq | – | – | – | – | **Engineering** |
| Job Card / Subjob | – | ✓ | – | – | **Production** |
| Production Entry (operation) | – | ✓ | – | – | **Production** |
| Material Consumption confirm | – | ✓ | ✓(ledger) | – | **Production + Inventory** |
| Finished Goods Receipt | – | ✓(trigger) | ✓(ledger) | – | **Inventory (ledger)** |
| Stock Posting | – | ✗ | ✓ | – | **Inventory** |
| Rejection recording | – | ✓ | – | ✓(disposition) | **Production + Quality** |
| Scrap / HOLD approval | – | – | – | ✓ | **Quality** |
| Rework execution | – | ✓ | – | ✓(NCR) | **Production (+Quality touch)** |
| Product Conversion / Disassembly | – | ✓ | ✓(ledger) | – | **Production + Inventory + Costing** |
| Idle Time record | – | ✓ | – | – | **Production** |
| WIP / Pending (derived) | – | ✓ | – | – | **Production (derived)** |
| Production Pending | – | ✓ | – | – | **Production (derived)** |

**Risks addressed:**
- **Duplicate ownership:** Production must not own the Inventory ledger; Quality must not own recording; Planning must not own shop-floor execution; Engineering must not own consumption. Owners above prevent duplication.
- **Circular workflow risk:** Completion→FG→inventory→material must be a strict one-direction chain; return path via controlled return transaction (no direct balance writes).
- **Stock ownership conflict:** resolved by DEC-PROD-004 (intents only).
- **Quality ownership conflict:** resolved by splitting recording (Production) vs disposition (Quality).
- **Planning authority conflict:** Planning schedules, Production authorizes/releases execution. MRP/APS engines remain external futures.

---

## 17. Frontend Navigation Recommendation

**PRODUCTION (top-level menu)** — proposed sidebar dropdown (DEVELOPMENT PROPOSAL, grounded in §8).

- **Top-level menu:** PRODUCTION
- **Submenus:** Production Planning · Production Orders · Shop Floor Execution · Production Transactions · Monitoring & Control · Capacity & Performance · Production Reports & Analytics
- **Screen grouping:** as per §8 tree (grouped by confirmed submodule identity).
- **Navigation order:** Planning → Orders → Shop Floor (Execution) → Transactions (Material/Conversion/Idle/Condemn) → Monitoring → Capacity/Performance → Reports.
- **Suggested role visibility:**
  - Production Planner: Planning + Orders.
  - Supervisor: Shop Floor + Transactions + Monitoring.
  - Operator: Shop Floor (workspace/log sheet) only.
  - Quality: read access to quality-integration views + disposition (via Quality module).
  - Management: Monitoring + Capacity/Performance + Reports.
- **Hidden/deferred initially:** Capacity & Performance engine views (OEE single engine pending — hide); MRP/APS-based planning screens (hide until external engine); Production Reports detail screens (defer until core data populates).
- **Ready for future frontend design:** Planning (day schedule, orders), Shop Floor (workspace, entry, log sheet), Monitoring (WIP/Pending read-only) — these map to confirmed CR requirements with defined screens.

**No React code is written. This is navigation planning only.**

---

## 18. Future Document Sequence

Recommended next documents (do **not** create automatically; sequence validated against findings):
1. **DOCUMENT_46 — Production Entry Functional Requirement Specification** (highest priority: entry is the core execution record and the pivot for §12).
2. **DOCUMENT_47 — Production Job Card Functional Requirement Specification** (Job Card is parent of entries; §13 DRs must be resolved first).
3. **DOCUMENT_48 — Production Module Transaction and Workflow Matrix** (consolidates §11/§15 lifecycle/status transitions at transaction level).

Recommendation: **DOCUMENT_46 first**, because Production Entry is the operational heart of shop-floor execution and the primary data source for WIP/Pending/Inventory/Quality intents. Resolve CLAR-PROD-002/005 in parallel with DOCUMENT_46/47.

---

## 19. Open Questions / Dependencies to Review

| ID | Topic | Status | Relevance to this document |
| --- | --- | --- | --- |
| CLAR-PROD-002 | Processed/Pending/WIP reconciliation formula | OPEN (High) | Affects §12 entry quantity model |
| CLAR-PROD-005 | Subjob ↔ route operation mapping | OPEN (High) | Affects §13 Job Card |
| CLAR-PROD-003 | Production Return default disposition | OPEN | Affects §9.10/§14 |
| CLAR-PROD-006 | Idle reason catalogue | OPEN | Affects §9.9 |
| CLAR-PROD-012 | Quality-gate override authorization | OPEN | Affects §11 gate |
| CLAR-PROD-013 | SAMPLING vs PPM | OPEN (non-blocking) | No functionality designed until resolved |
| ASM-PROD-014 | PO vs WO two-level split | PROPOSED | Affects §10 table |
| Fut-PROD-001..004 | MRP/MPS/APS engines, deep PPAP | FUTURE | Out of scope |
| None of the above block the **navigation architecture** assumptions themselves | – | – | DOC_03 14-submodule + DOC_08 A–J groups are the stable base |

---

## 20. Explicit Exclusions

- **OUT OF CURRENT SCOPE:** MRP/MPS/APS optimization engines (FUT-PROD-001..003), deep PPAP workflow (FUT-PROD-004), MSL deep reorder flow (Inventory-owned, ASM-PROD-015), full Engineering/Inventory/Quality/Maintenance/Costing/Master-Data module designs.
- **IMPLEMENTATION EXCLUDED (per task):** backend code; frontend/React code; database/migration; configuration; inventory/stock posting; `production_entry`; P3.3/P3.4 files; the 8 untracked P3.4 files (must not be staged/committed/modified).
- **Not silently assumed:** SAMPLING (CLAR-PROD-013) has no designed functionality; PO/WO split kept as DR not final.

---

## 21. Risk Register

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | Dropdown inventoried as confirmed when requirements only support a proposal | Every leaf classified CR/DP/DR/O/S with FR evidence |
| 2 | Navigation duplication with Planning/Inventory/Quality modules | §16 owner matrix; §10 hard boundary |
| 3 | Production claiming inventory ownership via event recording | DEC-PROD-004 intents-only rule enforced in §10 |
| 4 | Quality disposition mis-owned by Production | Recording vs disposition split (§9.6, §16) |
| 5 | Circular flow (completion→FG→material) | Strict one-direction chain + controlled return (§11, §16) |
| 6 | Premature frontend design before DRs resolve | §17 defers/hides engine & DR-dependent screens |
| 7 | Documentation drifting into implementation | Mandatory read-only mode; no files beyond DOCUMENT_45 |
| 8 | P3.4 files accidentally staged/committed | Explicit exclusion; no staging/commit in this phase |

---

## 22. Recommended Next Step

1. **Stop** — DOCUMENT_45 is documentation only; no implementation.
2. On **separate explicit authorization**, create **DOCUMENT_46 — Production Entry Functional Requirement Specification** (highest priority).
3. Resolve (with customer/stakeholders) **CLAR-PROD-002** (quantity reconciliation) and **CLAR-PROD-005** (subjob mapping) before finalizing DOCUMENT_46/47 screen designs.
4. Do **not** begin any frontend design, backend coding, migration, or staging without standing up the confirmed boundary rules in §10.

---

## 23. Final Decision

**Decision: Functional architecture documented; NAVIGATION SCOPING READY FOR REVIEW.**

The master Production dropdown structure (§8), ownership boundaries (§10), workflow (§11), and the architectural positions of Production Entry (§12) and Job Card (§13) are **documented and grounded in confirmed requirements** from DOCUMENT_03/07/08. Open clarifications (CLAR-PROD-002, 005, 012) are **tracked, not silently assumed**.

**Readiness classification relative to implementation:** Navigation architecture is **READY FOR REVIEW** but **NOT authorized for implementation or frontend design**. Any frontend/backend/database/staging work requires a separate explicit authorization. DOCUMENT_45 authorizes nothing.

---

### Record of Read-Only Verification (STEP 1)
- Branch: `main`; HEAD `db5abb2` (unchanged).
- Index staged: **0**.
- P3.4 files: **8 untracked (unstaged, uncommitted)** — untouched.
- No V6 migration; V4/V5 unchanged.
- No implementation, staging, commit: **none performed**.

## FINAL STOP GATE

**STOP.** No frontend code. No backend code. No database/migration change. No staging. No commit. No push. DOCUMENT_46 not started. Awaiting explicit authorization.
