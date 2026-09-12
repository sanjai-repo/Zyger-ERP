# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 01 — PRODUCTION REQUIREMENT ANALYSIS

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 01 — Production Requirement Analysis |
| Source inputs | (1) Customer Requirement Document, (2) Freedom ERP reference, (3) Zyger ERP Key Points |
| Classification keys | CR = Customer Requirement, REF = Freedom ERP Reference, ZYGER = Zyger ERP Requirement, PROPOSED = Proposed Design, FUTURE = Future Enhancement |
| Status | ANALYSIS — establishes requirement baseline |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Executive Understanding of the Production Module
2. Source Baseline and Traceability Keys
3. Customer Requirement Analysis
4. Zyger ERP Key-Point Analysis (requirement extraction)
5. Freedom ERP Reference Analysis (summary — detailed in DOCUMENT 02)
6. Requirement Relationship Map
7. Preliminary Risks and Dependencies
8. Traceability Seed Table (CR → FR → Module)

---

## 1. EXECUTIVE UNDERSTANDING OF THE PRODUCTION MODULE

### 1.1 What this module is

The Production Module is the **shop-floor execution and control domain** of Zyger ERP. It
records, controls, and reports the actual manufacturing work performed to convert raw or
semi-finished material into finished parts in a **CNC / precision manufacturing machine
shop**.

The module must answer, for every production batch:

- **What** part is being produced (final item).
- **Against which** Work Order / Production Order it runs.
- **How** it is made (route sheet / operations / process sequence).
- **Where** it is processed (work center / machine).
- **Who** operates it (operator / supervisor / manpower), and on which shift.
- **How many** pieces (planned, processed, accepted, rejected, rework, scrap, pending).
- **How long** (setup, runtime, idle, downtime), and **why** any stoppage occurred.
- **What material** was required, issued, consumed, deviated, and returned.
- **Whether** quality gates were satisfied.

### 1.2 The CNC manufacturing demand chain

The Production Module operates inside the following business chain (used throughout all
documents):

```
CUSTOMER DEMAND
      │
      ▼
PRODUCTION PLANNING
      │
      ▼
WORK ORDER
      │
      ▼
BOM (Engineering) + ROUTE SHEET (Engineering)
      │
      ▼
MATERIAL PLANNING
      │
      ▼
MATERIAL ISSUE (Inventory)
      │
      ▼
JOB CARD / BATCH CARD
      │
      ▼
MACHINE SETUP
      │
      ▼
PRODUCTION (Operation Events)
      │
      ▼
MATERIAL CONSUMPTION + PRODUCTION OUTPUT
      │
      ▼
QUALITY INSPECTION
      │
      ▼
NEXT OPERATION  OR  FINISHED GOODS
      │
      ▼
DISPATCH
```

### 1.3 Two mandatory perspectives

This document is written from two simultaneous perspectives:

1. **CNC Machine Shop Owner** — the design must work on a real shop floor with partial
   production, shortages, breakdowns, tool failure, rework, rejection, scrap, WIP,
   quality holds, alternate machines, and operator absence.
2. **Senior ERP Architect / Developer** — every requirement must be convertible into a
   screen → field → validation → business rule → API → database → audit → test-case
   specification.

### 1.4 Scope boundary (final)

The Production Module is a **bounded functional domain**. It **owns** shop-floor execution
transactions and **integrates with** (but does not duplicate) Engineering, Planning/MRP,
Inventory, Quality, Maintenance, Costing, and Master Data. Full ownership rules are defined
in DOCUMENT 03.

---

## 2. SOURCE BASELINE AND TRACEABILITY KEYS

Every requirement in this package carries one or more source keys. These keys are
**immutable** and are preserved across all documents. No source is silently converted.

| Key | Meaning | Ownership |
|---|---|---|
| CR | Customer Requirement | Must be preserved; risks flagged, not silently changed |
| REF | Freedom ERP Reference Behavior | Analyse; retain/improve/remove; never blindly copy |
| ZYGER | Zyger ERP proposed key point | Evaluate against CR, REF, and real shop floor |
| PROPOSED | Recommended design from this analysis | Explicit improvement |
| FUTURE | Valid functionality deferred | Recorded, not built now |

Example format used everywhere:
`FR-PROD-ENTRY-001 — Source: CR + REF + ZYGER`

---

## 3. CUSTOMER REQUIREMENT ANALYSIS

All requirements below are **Source = CR** (Customer Requirement Document). Priority is
P0 (mandatory release), P1 (high), P2 (medium), P3 (low/future).

| Req ID | Requirement Name | Description | Business Purpose | Business Process | Source | Priority | Affected Module | Dependencies | Risk | Clarification Required |
|---|---|---|---|---|---|---|---|---|---|---|
| CR-PROD-001 | Production Entry | Record actual production against a Work/Production Order for a machine/operation. | Tells ERP what was produced, against which order, which operation/machine/operator, how many good/rejected/process loss, time consumed. | Work Order → Select Operation → Select Machine → Select Operator → Material check → Start → Record Output (Good/Reject/Scrap/Rework) → Record Time → Inspection → Next operation | CR | P0 | Production Execution | Work Order, Route Sheet, Machine, Operator, Inventory | Incorrect qty postings; operation skip without control | Quantity reconciliation model (CLAR-PROD-002) |
| CR-PROD-002 | Product Conversion | Convert one inventory/product form into another item/state without normal sales/purchase. | Maintain stock traceability across conversion, record input/output, process loss, scrap, batch/lot, conversion cost, auto inventory update. | Input → Check input stock → Convert → Record output (good/loss/scrap) → Verify → Inventory update → Complete | CR | P1 | Production Conversion | Inventory, Item Master, Costing | Missing stock blocks conversion; loss not captured | Conversion cost allocation (CLAR-PROD-008) |
| CR-PROD-003 | Production Return | Return unused/recoverable issued material back to Stores with traceability. | Handle not-consumed, excess, remaining-after-completion, wrongly-issued, rejected/held material returns to inventory. | Issue → Production → Remaining? → Return request → Verify → Condition/Qty check → Store receipt → Inventory update | CR | P1 | Production Material Management | Inventory, Material Issue, Quality | Condition on return; wrong store receipt | Return condition/adjustment rules (CLAR-PROD-003) |
| CR-PROD-004 | Production Log Sheet | Detailed per-shift shop-floor activity history (setup, production, tool change, breakdown, inspection, waits). | Preserve operational history beyond summarized output for monitoring/analysis. | Assignment → Start shift → Log activities → Record qty → Shift end → Supervisor verification → Daily production | CR | P1 | Shop-Floor Execution | Job Card, Machine, Shift | Data-entry burden; incomplete logs | Log granularity/reason list (CLAR-PROD-004) |
| CR-PROD-005 | Job Card (Job Entry / Subjob / Completion) | Controlled execution document for a job from start through sub-jobs/operations to completion. | Give shop floor a controlled record of job, sub-jobs, machines, operators, quantities, completion. | WO → Create Job Card → Job Entry → Subjob → Assign op/machine/operator → Process → Output → Quality → next subjob / completion | CR | P0 | Job Management | Work Order, Route Sheet, Machine, Operator | Sub-jobs diverge from route sheet | Subjob ↔ route-op mapping (CLAR-PROD-005) |
| CR-PROD-006 | Idle Time | Record when a machine/operator/resource is available but not producing. | Quantify lost capacity and reason (material/operator/tool/program/inspection/no-order/plan). | Shift started → available → no production → record idle reason/duration → resume → analyse | CR | P1 | Idle Time / Stoppage | Machine, Shift, Production | Idle not recorded accurately | Idle reason catalogue (CLAR-PROD-006) |
| CR-PROD-007 | Production Pending | Show planned/released work not yet fully completed (remaining quantity and where stopped). | Management visibility of pending qty, location, reason, required action. | WO → plan → released → execute → completed/rework/reject/scrap → pending → reason → resume → complete | CR | P1 | Production Pending / Monitoring | Production Entry, Rework | Pending miscalc if entry rules vary | Pending formula (see CLAR-PROD-002) |

---

## 4. ZYGER ERP KEY-POINT ANALYSIS (REQUIREMENT EXTRACTION)

All items below are **Source = ZYGER** (from `production-key-points.md`). Each is assigned a
recommended owner classification per the scope rules (full table in DOCUMENT 03, Section 5).
Here they are grouped by functional area.

### 4.1 Production Order Management (ZYGER)
- Composite Production Order Entry
- Production Order (Single) Entry
- Rework Production Order Entry
- Production Order Short Close
- Production Order Day-wise / Week-wise / Month-wise (planning-facing)

### 4.2 Shop-Floor Execution (ZYGER)
- Production Entry
- Production Entry (Rework)
- Production Entry For Multiple Outputs
- Production Log Sheet (implied by CR-PROD-004)
- Production Output details

### 4.3 Material Management (ZYGER)
- Production Material Request
- Production Additional Material Request
- Other Material Request
- Consumable Consumption Entry
- Production consumption details
- Material Consumption (implied by CR + REF)

### 4.4 Planning Layer (ZYGER)
- Planning Demand
- Item-wise Daily Plan
- Production Planning Time Bucket
- Production Schedule for Next Time Bucket
- Work Center Daily Planning
- Work Center Planning for a Period
- Work Center Re-Allocation
- Production Plan Deviation Reason Entry
- Production Budget Core
- Production Budget Split Time Bucket-wise
- Production Budget Updation
- Production Budget / Sales Forecasting
- Production Budget / Sales Forecasting Revision

### 4.5 Capacity / Performance (ZYGER)
- Machine Capacity Assessment
- Capacity Assessment
- Manpower Plan vs Actual
- Man Efficiency
- Manpower Efficiency
- OEE (cross-functional)
- Operation-wise cost details (Plan vs Actual) — costing-facing

### 4.6 Quality / Engineering Integration (ZYGER — external modules)
- MRP Run (Planning/MRP module)
- Bill of Material / Routing / Routing details (Engineering)
- Machine Master (Master Data)
- Tool Master (Master Data)
- Process Flow Chart (Engineering)
- Non Conformity (Quality)
- PPAP (Quality)
- SAMPLING / PPM (Quality)

### 4.7 Exceptions / Conversions (ZYGER)
- Scrap Generation
- Item Conversion
- Item Change
- Disassembly
- Production Plan Deviation
- Delay To Customer Delivery Entry
- Line / Machine Stoppage

### 4.8 Reports / Analytics (ZYGER)
- Production Plan vs Actual (and Daily / Weekly / Monthly)
- Machine capacity plan
- Welding length details
- Welder Loss Report in Hrs
- Gas Consumption details
- Welding Consumption details
- Consumable Plan
- KPI data
- 6M Analysis
- CIP
- Daily Analysis
- Manufacturing cost
- Plant Performance
- Press shop Stroke format
- MIS
- MSL → **RESOLVED = Minimum Stock Level** (CLAR-PROD-001) — Inventory/Store reorder level, integration/report only

### 4.9 Explicit Zyger design requirement
- "All processes should come under a single entry (Final Part wise)" → addresses the
  conflict between a single final-part workspace and per-operation control. This is the
  basis for **DEC-PROD-001** (see DOCUMENT 03).

---

## 5. FREEDOM ERP REFERENCE ANALYSIS — SUMMARY

Full field-by-field analysis is in **DOCUMENT 02**. Summary of the reference Production
Entry screen:

- **Source = REF.** One operation/route-sheet-centric Production Entry screen.
- Headers: Entry Type, Production Type (General/Rework), Supervisor, Entry Date, Entry No (`PROD/0663/26-27`).
- Quantity summary: Produced (Processed/Accepted/Rejected), Pending (Production/Inspection), WIP (General/Rework).
- Route-sheet info: Route Sheet No, Pending-Sequence-Only toggle, Possible Qty, Route Qty, UOM, Process, Operator, Machine, Shift, Start/End time, Process Time, Process Rate, MHR, Target Qty.
- Material consumption grid: RM Code/Name, Req Qty, Total Issued Qty, Available Qty, Cons Qty, Dev Qty, Rtn Qty, Rate, Batch, End Bit Qty.
- Output/stage section: Stage, Process, Qty, Weight.

**Reference weaknesses to improve (not to copy):** manual/summarised qty model, ambiguous
Process Rate/MHR, rework as a bare radio button without traceability, flat (non-operation)
material view, per-component time fields (D/H/M/S), no mandatory quality gate, no defined
document-numbering/concurrency rules.

---

## 6. REQUIREMENT RELATIONSHIP MAP

```
CR-PROD-001 Production Entry ──┬── provides output data ──► CR-PROD-007 Production Pending
                               ├── consumes material ──► CR-PROD-003 Production Return
                               ├── feeds Log Sheet (CR-PROD-004)
                               └── executes operations from Job Card (CR-PROD-005)

CR-PROD-005 Job Card ──┬── orchestrates sub-jobs/operations ──► CR-PROD-001
                       └── start/stop window ──► CR-PROD-006 Idle Time

CR-PROD-002 Product Conversion & CR-PROD-003 Return ──► Inventory transactions ──► Inventory module
CR-PROD-006 Idle Time ──► OEE / Capacity / Manpower analysis
CR-PROD-007 Production Pending ──► Planning Layer (plan vs actual)
```

**Note:** MRP, BOM/Routing, Machine/Tool Master, PPAP, OEE engine, costing rules are owned
by other modules; Production **integrates** with them (contracts in DOCUMENT 07).

---

## 7. PRELIMINARY RISKS AND DEPENDENCIES

| ID | Risk | Mitigation / Flag |
|---|---|---|
| R-PROD-001 | Single/final-part entry could hide per-operation traceability if implemented as one flat transaction | Mandate DEC-PROD-001 (normalized operation events) |
| R-PROD-002 | Manual/summary quantity model (REF) risks inconsistent WIP | Backend-calculated pending/WIP; controlled posting |
| R-PROD-003 | Rework without reference breaks quality/stock traceability | Rework must link to original entry + NCR + qty cap (DOC 07) |
| R-PROD-004 | Planning-layer (MPS/budget/time-bucket) scope creep into Production | Owned by Planning Layer; separate module boundary |
| R-PROD-005 | Document-number regeneration on refresh breaks integrity | Server-side preview vs reservation; concurrency control (DOC 07) |
| R-PROD-006 | Stock balances overwritten directly | Every movement = controlled stock transaction (Inventory is system of record) |
| R-PROD-007 | MSL / ambiguous metrics designed by guesswork | MSL clarified = Minimum Stock Level (CLAR-PROD-001); scoped to Inventory/Store, Production integration-only |
| R-PROD-008 | Consumable/gas/welding consumption spans multiple modules | Ownership assigned to Production Material/Consumable; integration contract |

---

## 8. TRACEABILITY SEED TABLE (CR → FR → MODULE)

This is the seed for the full traceability matrix (DOCUMENT 14). Each CR is mapped to a
future Functional Requirement ID prefix and owning domain.

| CR / Designation | FR ID (seed) | Module Domain (DOC 03) |
|---|---|---|
| CR-PROD-001 Production Entry | FR-PROD-ENTRY-* | Production Execution / Operation Events |
| CR-PROD-002 Product Conversion | FR-PROD-CONV-* | Conversion |
| CR-PROD-003 Production Return | FR-PROD-MATL-* | Material Management |
| CR-PROD-004 Production Log Sheet | FR-PROD-LOG-* | Shop-Floor Execution |
| CR-PROD-005 Job Card | FR-PROD-JOBCARD-* | Job Management |
| CR-PROD-006 Idle Time | FR-PROD-IDLE-* | Idle Time / Stoppage |
| CR-PROD-007 Production Pending | FR-PROD-PEND-* | Production Monitoring |
| ZYGER Production/Composite/Rework Order | FR-PROD-ORDER-* | Production Order Management |
| ZYGER Multiple Output / Rework Entry | FR-PROD-MULTI-* / FR-PROD-REWORK-* | Production Execution |
| ZYGER Material/Additional/Other/Consumable request | FR-PROD-MATL-* | Material Management |
| ZYGER Scrap / Deviation / Stoppage | FR-PROD-EXCP-* | Exceptions / Deviations |
| ZYGER Conversion / Disassembly / Item Change | FR-PROD-CONV-* | Conversion |
| ZYGER Planning layer (time-bucket, budget, work-center plans) | FR-PROD-PLAN-* | Production Planning Layer |
| ZYGER Unit/Item-wise daily plan + MRP-consumed demand | FR-PROD-PLAN-* | Production Planning Layer |

**END OF DOCUMENT 01**