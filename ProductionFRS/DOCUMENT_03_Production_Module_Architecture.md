# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 03 — ZYGER ERP PRODUCTION MODULE ARCHITECTURE

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 03 — Zyger ERP Production Module Architecture |
| Includes | DEC-PROD-001 (approved); Scope Classification of every Zyger key point |
| Status | ARCHITECTURE — approved basis for all downstream FRS |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

---

## TABLE OF CONTENTS

1. Architecture Goals
2. Bounded Production Domain (ownership rules)
3. DEC-PROD-001 — Hybrid Final-Part-Centric Production Execution Architecture
4. Production Module Hierarchy (14 submodules)
5. Scope Classification Table (every Zyger key point)
6. Production Core vs Planning Layer vs External Modules
7. Integration Boundaries and Contracts Overview
8. Cross-Functional Capabilities (OEE, PPAP, MSL)
9. Architecture Non-Functionals (security, scalability, audit)
10. Architecture Decisions Register

---

## 1. ARCHITECTURE GOALS

- **Bounded production domain** — Production owns execution; does not absorb other modules.
- **Hybrid final-part UX + normalized operation events** (DEC-PROD-001).
- **Stable IDs** for future splitting (no position-dependent numbering).
- **Traceability** of every requirement to Source (CR/REF/ZYGER/PROPOSED/FUTURE).
- **Production-safe inventory posting** (Inventory is system of record).
- **Long-term maintainable** React + Spring Boot + PostgreSQL architecture.

---

## 2. BOUNDED PRODUCTION DOMAIN (OWNERSHIP RULES)

### 2.1 Production OWNS
- Shop-floor production execution.
- Production orders within approved scope.
- Job execution.
- Operation execution.
- Actual production output.
- Production material requirement/consumption confirmation.
- Consumable consumption confirmation.
- Machine usage capture.
- Manpower usage capture.
- WIP execution status.
- Rework execution.
- Rejection recording.
- Scrap generation.
- Idle time.
- Production stoppage.
- Production exceptions.

### 2.2 Production Planning Layer OWNS/COORDINATES
- Production planning.
- Daily / weekly / monthly planning.
- Work-center planning.
- Time-bucket planning.
- Production plan deviation.
- Capacity assessment.
- Production plan vs actual.
- Manpower plan vs actual.

### 2.3 Production INTEGRATES WITH but does NOT duplicate
- Engineering (BOM, multi-level BOM, route sheet, routing, process definitions).
- Inventory (stock balances, stock ledger, material issue/return/receipt posting).
- Quality (PPAP, inspection, NCR, CAPA, disposition).
- Maintenance (machine availability, breakdown, preventive maintenance).
- Master Data (machine, tool, employee, work center, operation, shift).
- Costing (costing rates, rules, calculations).
- MRP / Advanced Planning (MRP engine, supply/material planning engine).
- Reporting/Analytics (MIS platform, cross-module KPI aggregation).

---

## 3. DEC-PROD-001 — HYBRID FINAL-PART-CENTRIC PRODUCTION EXECUTION ARCHITECTURE

**Status: APPROVED — mandatory for all downstream design.**

### 3.1 Definition
- **Final-Part / Work-Order-centric Production Workspace** = the primary user-facing aggregate
  (one screen for a final part / work order / batch / job card showing all route operations).
- **Operation-Level Execution Events** = the primary execution, traceability, WIP, machine,
  manpower, quality, and costing records (one per operation).

### 3.2 Cardinalities
```
ONE Work Order
   → ONE OR MANY Production Execution Sessions
      → MANY Operation Execution Events
         → MANY Material / Machine / Labour / Quality / Output /
           Rework / Rejection / Scrap / Idle-Time records
```

### 3.3 Role split
| Concern | Final-Part Aggregate | Operation Event |
|---|---|---|
| User experience | Primary workspace | Backing transactions |
| Business summary | Primary | Supports |
| Reporting entry | Primary | Supports |
| Execution unit | — | Primary |
| WIP tracking | — | Primary |
| Machine tracking | — | Primary |
| Manpower tracking | — | Primary |
| Quality control unit | — | Primary |
| Costing data collection | — | Primary |
| Traceability | — | Primary |

### 3.4 Forbidden designs
- **A.** a single flat final-part transaction with no operation traceability — NOT allowed.
- **B.** completely disconnected per-operation transactions with no unified final-part
  workspace — NOT allowed.

### 3.5 Production Entry modes supported
1. QUICK FINAL-PART ENTRY — summarize; system expands into operation events.
2. OPERATION-BY-OPERATION ENTRY — detailed with machines/operators/WIP/inspection.
3. BATCH / JOB CARD EXECUTION — lot/batch, high traceability.
4. MULTI-OPERATION SINGLE SESSION — multiple route ops in one session, each event independent.

### 3.6 Route sequence control
Operations follow approved route sequence. Overrides (parallel/alternate/rework/sequence
skip) require authorization, reason, timestamp, and audit (BR-PROD-010).

### 3.7 WIP, quality, machine, material
- WIP tracked per operation (item, WO, route op, batch, lot, qty, status, location).
- Mandatory quality gates block progression until accepted (unless authorized override).
- Machine/manpower captured at operation level (feeds OEE, efficiency, costing, capacity).
- Material: final-part planned BOM view + operation-level actual consumption.

---

## 4. PRODUCTION MODULE HIERARCHY (14 SUBMODULES)

```
PRODUCTION MODULE
│
├── 1  Production Planning
├── 2  Production Orders
├── 3  Job Management
├── 4  Shop Floor Execution
├── 5  Production Material Management
├── 6  Production Quality Integration
├── 7  Rework and Rejection Management
├── 8  Scrap Management
├── 9  Idle Time and Downtime
├── 10 Product Conversion
├── 11 Disassembly
├── 12 Production Monitoring
├── 13 Capacity and Performance
└── 14 Production Reports and Analytics
```

| # | Submodule | Purpose | Included Transactions | Dependencies | Upstream Modules | Downstream Modules |
|---|---|---|---|---|---|---|
| 1 | Production Planning | Plan production over buckets/period; create demand-backed schedules | Planning Demand; Item-wise Daily Plan; Time-bucket plan; Work-Center Daily/Period plan; Budget; Deviation reason | Engineering BOM/Routing; MRP demand; Sales forecast | Sales/Demand; MRP/Planning | Production Orders, Production Monitoring |
| 2 | Production Orders | Authorize manufacturing work | Single PO; Composite PO; Rework PO; Short Close; Day/Week/Month PO | Planning; Engineering | Production Planning | Job Management, Execution |
| 3 | Job Management | Controlled execution document | Job Card; Job Entry; Subjob Entry; Job Completion | Production Order; Route Sheet; Machine; Operator | Production Orders | Shop Floor Execution |
| 4 | Shop Floor Execution | Record actual work & output | Production Entry; Rework Entry; Multiple-Output Entry; Log Sheet | Job Card; Route Sheet; Inventory; Quality | Job Management | WIP, Quality, Monitoring |
| 5 | Production Material Management | Request, consume, return production material/consumables | Material Request; Additional Material Request; Other Material Request; Consumable Consumption; Production Return; Consumption Posting | BOM; Inventory; Quality | Engineering BOM | Inventory |
| 6 | Production Quality Integration | Enforce quality gates; link inspection/NCR | Quality gate checks; Inspection-Pending; Rework reference; NCR reference; Quality Hold | Quality module | Shop Floor Execution | Next operation / FG |
| 7 | Rework & Rejection | Trace and execute rework/rejection | Rework Production Order; Rework Entry; Rejection recording; NCR linkage | Quality; Original Production Entry | Execution, Quality | Scrap, WIP |
| 8 | Scrap Management | Record and dispose scrap | Scrap Generation; Scrap posting; Scrap reason | Quality; Inventory | Execution, Rework | Inventory, Costing |
| 9 | Idle Time & Downtime | Capture unproductive time | Idle Time; Line/Machine Stoppage; Idle reason catalogue | Machine; Shift | Execution | OEE, Capacity, Maintenance |
| 10 | Product Conversion | Transform item to another item | Product Conversion; Item Conversion; Item Change | Inventory; Item Master; Costing | Execution, Inventory | Inventory, Costing |
| 11 | Disassembly | Break down a parent into components | Disassembly; component receipt; loss/scrap | Inventory; BOM | Inventory | Inventory |
| 12 | Production Monitoring | Track pending/completed status | Production Pending; Production Output details; WIP tracking; Batch Card control | Execution; WIP | Execution | Reporting |
| 13 | Capacity & Performance | Assess machine/manpower capacity & efficiency | Machine Capacity Assessment; Capacity Assessment; Manpower Plan vs Actual; Man efficiency; OEE data feed | Machine; Shift; Master | Execution, Idle | Reporting, Planning |
| 14 | Reports & Analytics | Plan vs actual + KPI reporting | Plan vs Actual (Daily/Weekly/Monthly); Consumption details; KPI; 6M; CIP; MIS; Plant performance | All submodules | All | MIS/BI |

---

## 5. SCOPE CLASSIFICATION TABLE (EVERY ZYGER KEY POINT)

Allowed classifications:
1. Production Core
2. Production Planning Layer
3. Shared Master Data
4. External Module Dependency
5. Reporting / Analytics
6. Cross-Functional Capability
7. Future Enhancement
8. Clarification Required

| Key Point | Classification | Recommended Module Owner | Production Responsibility | Integration Required | FRS Detail Level | Reason |
|---|---|---|---|---|---|---|
| Composite Production Order Entry | Production Core | Production Orders | Own | Engineering BOM/Routing | Full | Core order type |
| Consumable Consumption Entry | Production Core | Production Material Mgmt | Own confirmation | Inventory | Full | Production-owned consumption record |
| Delay To Customer Delivery Entry | Production Planning Layer | Production Monitoring | Record delay reason | Sales/Dispatch | Detailed functional (planning) | Feeds delivery performance |
| Disassembly | Production Core | Disassembly | Own | Inventory; BOM | Full | Core exception/conversion |
| Item Change | Production Core | Product Conversion | Own | Inventory; Item Master | Full | Sub-case of conversion |
| Item Conversion | Production Core | Product Conversion | Own | Inventory; Item Master | Full | Core conversion |
| Item Wise Daily Plan | Production Planning Layer | Production Planning | Plan | Planning; MRP; Sales | Detailed functional | Daily schedule |
| MRP Run | External Module Dependency | MRP / Advanced Planning | Consume demand/supply | MRP engine | Integration contract only | Independent engine |
| Non Conformity | External Module Dependency | Quality | Link (NCR reference) | Quality | Integration contract only | Quality-owned |
| Other Material Request | Production Core | Production Material Mgmt | Own | Inventory | Full | Production request type |
| Planning Demand | Production Planning Layer | Production Planning | Own/coordinate | MRP; Sales | Detailed functional | Demand input to schedule |
| Production Additional Material Request | Production Core | Production Material Mgmt | Own | Inventory; Deviation approval | Full | Additional material workflow |
| Production Budget Core | Production Planning Layer | Production Planning | Coordinate | Sales forecast; Costing | Detailed functional | Statutory/planning budget |
| Production Budget Split Bucket-wise | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | Time-bucket split |
| Production Budget Updation | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | Budget revision |
| Production Budget / Sales Forecasting | Production Planning Layer | Production Planning | Coordinate | Sales | Detailed functional | Forecast source |
| Production Budget / Sales Forecasting Revision | Production Planning Layer | Production Planning | Coordinate | Sales | Detailed functional | Revision flow |
| Production Entry | Production Core | Shop Floor Execution | Own | Inventory; Quality; Route | Full | Core transaction |
| Production Entry (Rework) | Production Core | Rework & Rejection | Own | Quality; Original Entry | Full | Traced rework entry |
| Production Entry For Multiple Outputs | Production Core | Shop Floor Execution | Own | Inventory; Routing | Full | Co/by-product output |
| Production Material Request | Production Core | Production Material Mgmt | Own | Inventory | Full | Material request |
| Production Order (Single) Entry | Production Core | Production Orders | Own | Planning; Engineering | Full | Core order |
| Production Order Short Close | Production Core | Production Orders | Own | Execution; Inventory | Full | Order closure |
| Production Plan Deviation Reason Entry | Production Planning Layer | Production Planning | Own/coordinate | Planning; Monitoring | Detailed functional | Deviation reason |
| Production Planning Time Bucket | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | MPS bucket framework |
| Production Schedule for Next Time Bucket | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | Rolling schedule |
| Rework Production Order Entry | Production Core | Rework & Rejection | Own | Quality; Original Order | Full | Rework authorization |
| Scrap Generation | Production Core | Scrap Management | Own | Quality; Inventory | Full | Scrap posting |
| Work Center Daily Planning | Production Planning Layer | Work Center & Capacity | Coordinate | Machine; Manpower | Detailed functional | Daily resource plan |
| Work Center Planning For A Period | Production Planning Layer | Work Center & Capacity | Coordinate | Machine; Manpower | Detailed functional | Period resource plan |
| Work Center Re-Allocation | Production Planning Layer | Work Center & Capacity | Coordinate | Planning | Detailed functional | Rebalance load |
| Production Plan vs Actual (and Daily/Weekly/Monthly) | Reporting / Analytics | Reports & Analytics | Source data | All | Report spec | KPI reports |
| Machine capacity plan | Reporting / Analytics | Capacity & Performance | Source data | Capacity | Report spec | Capacity report |
| Welding length details | Reporting / Analytics | Reports & Analytics | Source data | — | Report spec | Consumable/process report |
| Production consumption details | Reporting / Analytics | Reports & Analytics | Source data | Material | Report spec | Consumption report |
| Capacity Assessment | Reporting / Analytics | Capacity & Performance | Source data | Capacity | Report spec | Capacity report |
| Man Efficiency | Reporting / Analytics | Capacity & Performance | Source data | Manpower | Report spec | Efficiency report |
| Manpower Efficiency | Reporting / Analytics | Capacity & Performance | Source data | Manpower | Report spec | Efficiency report |
| Schedule updation | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | Schedule change |
| Consumable Plan | Production Planning Layer | Production Material Mgmt | Coordinate | Inventory budget | Detailed functional | Consumable plan |
| KPI data | Reporting / Analytics | Reports & Analytics | Source data | Cross-module | Report spec | KPI aggregation |
| 6M Analysis | Reporting / Analytics | Reports & Analytics | Source data | Quality; Maintenance | Report spec | Problem analysis |
| CIP | Reporting / Analytics | Reports & Analytics | Source data | Quality; Maintenance | Report spec | Continuous improvement |
| Daily Analysis | Reporting / Analytics | Reports & Analytics | Source data | All | Report spec | Daily review |
| Manufacturing cost | External Module Dependency | Costing | Source actual data | Costing | Integration contract only | Costing-owned calc |
| Plant Performance | Reporting / Analytics | Reports & Analytics | Source data | All | Report spec | Performance report |
| Press shop Stroke format | Reporting / Analytics | Reports & Analytics | Source data | — | Report spec | Sheet/stroke report |
| Welder Loss Report in Hrs | Reporting / Analytics | Reports & Analytics | Source data | — | Report spec | Downtime report |
| OEE | Cross-Functional Capability | Manufacturing Performance | Provide data | Production, Maintenance, Quality, Master | Cross-functional spec (DOC 07-§19) | Not duplicated |
| PPAP | External Module Dependency | Quality | Display status; block gated production | Quality | Integration contract only | Quality-owned |
| MIS | Reporting / Analytics | MIS / BI | Aggregation | Cross-module | Report spec | MIS platform |
| MSL | External Module Dependency | Inventory/Store | Reorder / shortage alert (material availability) | Inventory (min stock), Material | Integration contract only | = Minimum Stock Level (CLAR-PROD-001; ASM-PROD-015) |
| Batch card control | Production Core | Production Monitoring | Own | Inventory; Lot | Full | Batch/lot control |
| Production Order day/week/month | Production Planning Layer | Production Planning | Coordinate | Planning | Detailed functional | Schedule granularity |
| Machine capacity Assessment | Reporting / Analytics | Capacity & Performance | Source data | Capacity | Report spec | Capacity report |
| Line Stoppage | Production Core | Idle Time & Downtime | Own | Machine; Shift | Full | Line stoppage |
| Rejection details | Reporting / Analytics | Reports & Analytics | Source data | Quality | Report spec | Rejection report |
| Rework details | Reporting / Analytics | Reports & Analytics | Source data | Quality | Report spec | Rework report |
| Scrap details | Reporting / Analytics | Reports & Analytics | Source data | Quality | Report spec | Scrap report |
| PPM | Reporting / Analytics | Reports & Analytics | Source data | Quality | Report spec | Parts-per-million |
| SAMPLING | Clarification Required | Quality (external until clarified) | Display inspection-pending/sampling status; integration only | Quality Inspection; Routing | Integration contract only | CLAR-PROD-013 — distinction vs PPM and exact sampling discipline not defined by the source requirements |
| Machine wise OEE details | Reporting / Analytics | Reports & Analytics | Source data | OEE | Report spec | OEE report |
| Consumable Consumption details | Reporting / Analytics | Reports & Analytics | Source data | Material | Report spec | Consumption detail |
| Manpower Plan Vs Actual | Reporting / Analytics | Reports & Analytics | Source data | Manpower | Report spec | Plan-vs-actual |
| Production Output details | Reporting / Analytics | Reports & Analytics | Source data | Execution | Report spec | Output report |
| MRP | External Module Dependency | MRP/Advanced Planning | Consume demand | MRP engine | Integration contract only | Independent engine |
| Bill of Material / Routing / details | Shared Master Data | Engineering | Consume read-only | Engineering | Integration contract only | Engineering-owned |
| Machine Master | Shared Master Data | Master Data | Reference; machine usage capture | Machine Master | Integration contract only | Shared master |
| Tool Master | Shared Master Data | Master Data | Reference | Tool Master | Integration contract only | Shared master |
| Gas Consumption details | Reporting / Analytics | Reports & Analytics | Source data | Consumable | Report spec | Consumable report |
| Welding Consumption details | Reporting / Analytics | Reports & Analytics | Source data | Consumable | Report spec | Consumable report |
| Operation wise cost details (Plan Vs Actual) | External Module Dependency | Costing | Source actual op data | Costing | Integration contract only | Costing-owned calc |
| Process Flow chart | Shared Master Data | Engineering | Reference | Engineering | Integration contract only | Engineering-owned |

---

## 6. PRODUCTION CORE vs PLANNING LAYER vs EXTERNAL MODULES

### 6.1 Production Core (Full FRS in DOC 07/08)
Production Order, Composite PO, Rework PO, Short Close, Production Entry, Rework Entry,
Multiple-Output Entry, Job Card/Job/Subjob/Completion, Log Sheet, Production Pending, Material
Consumption, Consumable Consumption, Material Request, Additional/Other Material Request,
Production Return, Rejection, Rework, Scrap, Idle Time, Line/Machine Stoppage, Product
Conversion, Item Conversion, Item Change, Disassembly, Batch Card Control, Production Output,
WIP Tracking, Production Plan Deviation, Delay to Customer Delivery, Production Non-Conformity,
Operation-wise Control.

### 6.2 Production Planning Layer (Detailed functional in DOC 07/08)
Production Planning, Planning Demand, Item-wise Daily Plan, PO Day/Week/Month-wise, Work Center
Daily/Period planning, Work Center Re-allocation, Time Bucket, Schedule for Next Bucket,
Deviation Reason, Machine Capacity Assessment, Manpower Plan vs Actual, Production Plan vs
Actual, Capacity Assessment, Production Budget Core/Split/Updation/Forecast/Revision.

**Candidate for future Advanced Planning / MRP / APS module:** MRP Run, Capacity Planning engine,
Production Budget/Sales Forecasting engine, Time-bucket MPS optimization. These are flagged as
FUTURE for full engine migration.

### 6.3 External Module Dependencies (integration contracts only — DOC 07-§15..18)
Engineering, MRP/Planning, Master Data, Quality, Maintenance, Costing, Inventory, Sales/Dispatch.

---

## 7. INTEGRATION BOUNDARIES AND CONTRACTS OVERVIEW

| External module | Data Production consumes | Data Production provides | Contract spec |
|---|---|---|---|
| Engineering | BOM, route sheet, operations, process flow | Consumption/deviation actuals (for BOM accuracy) | DOC 07-§16 |
| MRP/Planning | Demand, supply, shortage, schedule | Actual consumption; plan-vs-actual; delays | DOC 07-§11 |
| Master Data | Machine/Tool/WorkCenter/Operation/Shift/Employee | Usage events | DOC 07-§12-14 |
| Quality | Inspection results, NCR, PPAP status, hold | Inspection-pending, rejection, rework references | DOC 07-§14 |
| Maintenance | Breakdown/availability | Downtime/stoppage events | DOC 07-§17 |
| Costing | Rates (MHR, labor, overhead), rules | Actual op-time, consumption, output, scrap | DOC 07-§18 |
| Inventory | Stock, issue/return/receipt postings | Posting intents (issue/consumption/return/receipt) | DOC 07-§15 |

---

## 8. CROSS-FUNCTIONAL CAPABILITIES (OEE, PPAP, MSL) [MSL RESOLVED]

- **OEE**: Cross-functional Manufacturing Performance. Consumes Availability (Maintenance,
  Stoppage, Idle), Performance (Production output vs theoretical), Quality (rejection/scrap).
  Single engine; not duplicated. Formula + data sources in DOC 07-§19.
- **PPAP**: Quality Module capability. Production displays PPAP status and may block production
  where PPAP approval is mandatory (integration only; not a Production transaction).
- **MSL**: **Resolved = Minimum Stock Level** (CLAR-PROD-001, clarified by customer). A
  store/inventory reorder-level concept: each item carries a minimum stock threshold used to
  flag reorder alerts. Owned by **Inventory/Store** (item minimum-stock level) — NOT a
  Production execution feature. Production consumes the material-availability signal (BR-PROD-MATL-001
  partial-issue/available check) and may surface shortage alerts, but does not store or set
  minimum levels. See CLAR-PROD-001 / ASM-PROD-015.
- **SAMPLING**: **CLARIFICATION REQUIRED** (CLAR-PROD-013). Listed only as a Zyger report key
  point; the distinction between SAMPLING and PPM and the applicable sampling/inspection
  discipline are not defined by the source requirements. Production records inspection pending;
  the sampling discipline itself is owned by Quality. No production functionality is designed
  for SAMPLING until the meaning is confirmed (must NOT be silently merged with PPM).

---

## 9. ARCHITECTURE NON-FUNCTIONALS

- **Security**: RBAC per screen/action; authorization baked into SecurityConfig pattern.
- **Scalability**: status/id-based queries; indexes on (item, plant, status, op, dates).
- **Data integrity**: optimistic locking (version), unique document numbers, FK integrity.
- **Audit**: created/updated/approved/cancelled/by/at + transaction history on every document.
- **Posting safety**: all stock movements via controlled transactions; never direct balance
  overwrite (DOC 07-§15).

---

## 10. ARCHITECTURE DECISIONS REGISTER

| ID | Decision | Status | Basis |
|---|---|---|---|
| DEC-PROD-001 | Hybrid Final-Part-Centric Production Execution Architecture | APPROVED (mandatory) | CR-PROD-001 + ZYGER final-part + REF per-op |
| DEC-PROD-002 | Bounded production domain (ownership rules) | APPROVED | Scope instruction |
| DEC-PROD-003 | Production Core + Planning Layer full FRS; external modules = contracts | APPROVED | Scope instruction |
| DEC-PROD-004 | Every stock movement via controlled transaction | APPROVED | R-PROD-006 |
| DEC-PROD-005 | OEE single cross-functional engine | PROPOSED | avoid duplication |

**END OF DOCUMENT 03**