# ZYGER ERP — PRODUCTION MODULE
# DOCUMENT 07 — COMPLETE PRODUCTION MODULE FRS

| | |
|---|---|
| Project | Zyger ERP |
| Module | Production (Core + Planning Layer) |
| Document | DOCUMENT 07 — Complete Production Module Functional Requirements Specification |
| Baseline | DOCUMENT 06 (REQUIREMENT BASELINE gate) |
| Architecture | DEC-PROD-001 (mandatory) |
| Status | FRS — module-level; DOCUMENT 08 provides screen-wise detail |
| Version | 1.0 — FINAL BASELINE (Approved for Development) |

**How to read this document.** This is the module-level FRS. It defines functional
requirements (FR-*), business rules (BR-*), workflows (WF-*), numbering (NUM-*), and
integration contracts. Field-level detail and per-screen layouts live in DOCUMENT 08 and are
cross-referenced here (e.g., `SCR-PROD-ENTRY-001`, `FLD-PROD-ENTRY-*`). IDs are stable and
split-ready (not position-dependent).

---

## TABLE OF CONTENTS (26 DOMAINS)

01. Production Foundation and Architecture
02. Production Order Management
03. Job Card and Shop-Floor Execution
04. Production Execution and Operation Events
05. Material and Consumable Management
06. Production Output and WIP
07. Rework, Rejection and Scrap
08. Production Return and Conversion
09. Idle Time and Production Stoppage
10. Batch Card Control
11. Production Planning Layer
12. Work Center and Capacity Planning
13. Production Exceptions and Deviations
14. Production Quality Integration
15. Inventory Integration
16. Engineering Integration
17. Maintenance Integration
18. Costing Integration
19. OEE and Performance Data
20. Reporting and Analytics
21. Document Numbering
22. Workflow and Status Lifecycle
23. Business Rules
24. Audit and Traceability
25. Database Impact Summary
26. API Impact Summary

---

## 01. PRODUCTION FOUNDATION AND ARCHITECTURE

### 01.1 Founding principle
Adopt DEC-PROD-001. The **Final-Part / Work-Order Production Workspace** is the primary user
aggregate; **Operation Execution Events** are the normalized execution, WIP, machine, manpower,
quality and costing records.

### 01.2 Entity model (conceptual)
```
Production Work Order
  → Production Execution Session (header, per batch/job)
     → Operation Execution Event (per route operation)
        → Material Consumption events
        → Machine Usage event
        → Manpower Usage event
        → Production Output event
        → Quality Result (gate)
        → Rework / Rejection / Scrap / Idle-Time records
  → Final Part Completion Summary (derived)
```

### 01.3 Base fields for all production documents
All transactional tables carry: `id, company_id, division_id, plant_id, status, created_by,
created_at, updated_by, updated_at, version` and where applicable `approved_by, approved_at,
cancelled_by, cancelled_at, cancellation_reason`. (Confirmed in DOC 12.)

### 01.4 Status model (global lifecycle)
`DRAFT → VALIDATED → SUBMITTED → PENDING_APPROVAL → APPROVED → (PARTIALLY_COMPLETED) →
COMPLETED → CLOSED`. Alternative paths: `DRAFT→CANCELLED`, `SUBMITTED→REJECTED`,
`APPROVED→REVERSED`. (Detail in DOC 07-§22.)

---

## 02. PRODUCTION ORDER MANAGEMENT

> **Terminology decision (TERM-PROD-001): Production Order vs Work Order.**
> The source requirements use both terms without explicitly distinguishing them (CR-PROD-001:
> "against a Work/Production Order"; DOC 01 demand chain shows WORK ORDER → JOB CARD). The
> establish as **PROPOSED** (outcome C): **Production Order is the planning/authorization-level
> document**; **Work Order is the execution-level order** generated from a released Production
> Order that carries BOM/route and a job/batch scope on the shop floor. When a single level
> suffices, the Production Order also acts as the Work Order (same entity). Assumption:
> WO = execution instance under a PO. Impact: `prod_order` is the authorizing record;
> `prod_work_order` (or `prod_order.work_order_no`) is the execution reference; screens/queries
> may filter by either. Marked PROPOSED/ASM-PROD-014; reversible if the customer clarifies the
> two as truly separate entities (see DOC 11).

### FR-PROD-ORDER-001 — Production Order (Single)
- **Source:** ZYGER. **Baseline:** confirmed.
- **Purpose:** authorize manufacturing of a final item in a specific quantity against a
  demand/plan, referencing an approved BOM and route sheet.
- **Key fields (see SCR-PROD-ORDER-001):** Production Order No, Type (Single/Composite/Rework),
  Item, Planned Qty, UOM, Priority, Start/Due date, Plant, Status, BOM revision, Route revision,
  Demand reference.
- **Rules:**
  - BR-PROD-010: operation sequence follows approved route sheet; order cannot reference
    unapproved BOM/route.
  - Numbering per NUM-PROD-ORDER (DOC 07-§21).
  - Requires engineering-validated BOM + route before release.
- **Lifecycle:** Draft → Released → In Progress → (Short Close) → Completed → Closed.

### FR-PROD-ORDER-002 — Composite Production Order
- **Source:** ZYGER. A composite order groups multiple production orders/items released together
  (e.g., a product bundle or a shared setup campaign) under one parent reference. Each sub-order
  keeps independent status/queries. Release of the composite releases members.

### FR-PROD-ORDER-003 — Rework Production Order
- **Source:** ZYGER + CFL-PROD-002.
- **Purpose:** authorize rework of rejected/reworkable quantity.
- **Mandatory links:** original order/entry, authorized quantity, NCR reference, rework route.
- **Rule (BR-PROD-REWORK-001):** rework quantity must not exceed that authorized by the NCR /
  quality disposition; no un-sourced rework.

### FR-PROD-ORDER-004 — Production Order Short Close
- **Source:** ZYGER.
- **Purpose:** close an order before planned quantity is reached, with an approved reason
  (customer change, material shortage, scrap, obsolescence, etc.).
- **Rule:** short close requires cancellation of remaining qty with reason + authorization;
  updates pending/WIP; triggers inventory/consumption reconciliation.

---

## 03. JOB CARD AND SHOP-FLOOR EXECUTION

### FR-PROD-JOBCARD-001 — Job Card
- **Source:** CR-PROD-005. Execution document controlling a specific production job.
- Created from a Production Order; carries planned qty, priority, dates, final part.

### FR-PROD-JOBCARD-002 — Job Entry
Create/start the job. Validates material availability (partial allowed per ASM-PROD-003),
assigns work center/machine, assigns operator, records planned vs due dates, before release.

### FR-PROD-JOBCARD-003 — Subjob Entry
- A subjob = an operation (or group) under the parent job. Mapping to route operation is 1:1 by
  default (CLAR-PROD-005); free breakdown only under authorization.
- Subjob captures operation, machine, operator, input/output quantities, quality gate.

### FR-PROD-JOBCARD-004 — Job Completion
Completion check across subjobs/operations. If pending → hold with reason; if complete → final
quality → FG/SFG receipt (inventory) → job closed (BR-PROD-JOBCARD-001).

### FR-PROD-LOG-001 — Production Log Sheet
- **Source:** CR-PROD-004.
- **Purpose:** per-shift/per-machine detailed activity history (setup, production, tool change,
  inspection, breakdown, material shortage, wait, other).
- **Rule:** every logged activity carries start/end time and quantity (where applicable); the
  log can generate or reference summarized production entries. Activity catalogue per
  CLAR-PROD-004 / ASM-PROD-004.

---

## 04. PRODUCTION EXECUTION AND OPERATION EVENTS

### FR-PROD-ENTRY-001 — Production Entry (operation-level event)
- **Source:** CR-PROD-001 + REF + ZYGER. The core execution record.
- Captures for an operation: input quantity, processed, accepted, rejected, rework, scrap,
  machine, operator, shift, actual start/end DateTime, runtime, idle time/reason, inspection
  status, material consumption.
- **Rule (BR-PROD-ENTRY-001):** quantities are backend-derived; Processed =
  Accepted + Rejected + Rework + Scrap (ASM-PROD-001 / CLAR-PROD-002).

### FR-PROD-ENTRY-002 — Rework Production Entry
- **Source:** ZYGER + CFL-PROD-002.
- A rework operation event linked to the original accepted/rejected qty + NCR + rework route.
- **Rule (BR-PROD-REWORK-001):** net rework output flows back to reworkable/WIP; cannot exceed
  authorized qty.

### FR-PROD-ENTRY-003 — Multiple-Output Production Entry
- **Source:** ZYGER + CFL-PROD-012.
- Supports primary output + optional co/by-products per operation (ASM-PROD-011). Each output
  becomes a separate operation output event.

### FR-PROD-ENTRY-004 — Final-Part Workspace (aggregate)
- **Source:** ZYGER + DEC-PROD-001.
- One screen (SCR-PROD-ENTRY-001) for a final part / WO / batch showing all route operations with
  per-op status (NOT STARTED / IN PROGRESS / COMPLETED / QUALITY HOLD / REWORK / SKIPPED-
  AUTHORIZED / REJECTED), operation timeline, per-op output/time/material. Operation events are
  created/updated from within this workspace (all modes).

---

## 05. MATERIAL AND CONSUMABLE MANAGEMENT

### FR-PROD-MATL-001 — Production Material Request
- **Source:** ZYGER. Requests material required for a job from inventory. Supports partial issue.

### FR-PROD-MATL-002 — Production Additional Material Request
- **Source:** ZYGER. For excess consumption beyond BOM/issued qty. Requires justification +
  approval (ASM-PROD-003, CFL-PROD-004). Deviation beyond tolerance → approval (BR-PROD-MATL-001).

### FR-PROD-MATL-003 — Other Material Request
- **Source:** ZYGER. Non-BOM material needed in production (e.g., packaging, consumables not in
  item/consumable plan) with authorization.

### FR-PROD-MATL-004 — Consumable Consumption
- **Source:** ZYGER. Records usage of consumables (cutting oil, inserts, gases, welding wire)
  against jobs; feeds consumable cost and consumption reports (DOC 07-§20).

### FR-PROD-MATL-005 — Material Consumption Posting
- **Source:** CR + REF + ZYGER.
- Operation-level material consumption: required (BOM-derived), issued, available, consumed,
  deviation, returned. Consumed ≤ Available unless approved additional request
  (ASM-PROD-003). Each consumption creates an inventory stock transaction (DOC 07-§15).

---

## 06. PRODUCTION OUTPUT AND WIP

### FR-PROD-OUT-001 — Production Output
- Operation output block: Accepted / Rejected / Rework / Scrap; output weight; output lot/batch;
  destination stage. (Improves REF §8.)

### FR-PROD-WIP-001 — WIP Tracking
- WIP tracked per operation by item, work order, route op, batch, lot, qty, status, location.
- Derived read-only from operation events (ASM-PROD-001). Accepted output of an operation
  becomes available input to the next permitted operation (BR-PROD-WIP-001).

### FR-PROD-PEND-001 — Production Pending
- **Source:** CR-PROD-007.
- Planned/ordered qty minus completed output (after rework/reject/scrap/transfer). Backend
  derived. Where stopped + reason surfaced (BR-PROD-PEND-001).

---

## 07. REWORK, REJECTION AND SCRAP

- **Rework (FR-PROD-ENTRY-002, BR-PROD-REWORK-001):** traced; references source entry + NCR +
  authorized qty + rework route; never a bare radio (CFL-PROD-002).
- **Rejection:** structured classification Reworkable / Scrap / Hold-MRB (CLAR-PROD-002).
  Rejection creates an inventory/quality disposition. (FR-PROD-REJ-001.)
- **Scrap (FR-PROD-SCRAP-001, ZYGER Scrap Generation):** records scrapped qty + reason + value
  context; posts a scrap inventory transaction (DOC 07-§15); feeds scrap reports/PPM.

### FR-PROD-REJ-001 — Production Rejection
- **Source:** CR + ZYGER. **Priority:** P0.
- **Purpose:** record and classify rejected quantity at operation level with full traceability.
- **Actors:** Operator (record), Supervisor (record/classify), Quality (disposition), Plant Head
  (approve disposition for scrap write-off).
- **Preconditions:** a valid operation event (op_event) exists; rejectedQty entered.
- **Validations (BR-PROD-REJ-001):** rejectedQty ≤ processedQty; rejectedQty + reworkQty +
  scrapQty + acceptedQty = processedQty (reconciliation); classification required
  (REWORKABLE / SCRAP / HOLD_MRB); reason required; NCR link required for scrap/hold.
- **Workflow:** recorded → classified → disposition (reworkable→rework route; scrap→scrap
  posting; hold→quarantine) → quality/NCR linkage.
- **Inventory impact:** disposition-driven — reworkable (no ledger move), scrap→SCRAP TXN,
  hold→HOLD/blocked (no move until disposition). No direct stock write.
- **Screens:** SCR-PROD-REJ-001 (scr); fields FLD-PROD-ENTRY-021.
- **Test cases:** per DOCUMENT 14 (rejection reconciliation, over-rejection, NCR linkage).

### FR-PROD-SCRAP-001 — Production Scrap
- **Source:** ZYGER (Scrap Generation). **Priority:** P0.
- **Purpose:** record scrapped quantity with reason, authorization and value context, posting a
  controlled scrap transaction.
- **Actors:** Operator (record), Supervisor (authorize within tolerance), Plant Head (authorize
  beyond tolerance / write-off).
- **Preconditions:** valid operation event; scrapQty entered; scrap reason from catalogue.
- **Validations (BR-PROD-SCRAP-001):** scrapQty ≤ processedQty; reconciliation with
  accepted/rejected/rework; reason mandatory; authorization level based on scrapQty/value vs
  tolerance; reversal restricted after costing/capitalization.
- **Workflow:** recorded → reason → (authorization) → scrap posting → cost/value context → report.
- **Inventory impact:** posts SCRAP transaction; value context supplied; feed PPM/scrap report.
- **Screens:** SCR-PROD-SCRAP-001; fields FLD-PROD-ENTRY-023.
- **Test cases:** per DOCUMENT 14 (scrap reconciliation, over-scrap, reversal restriction).

---

## 08. PRODUCTION RETURN AND CONVERSION

### FR-PROD-RETURN-001 — Production Return
- **Source:** CR-PROD-003.
- Returns unused/recoverable material to stores with traceability, condition/disposition
  (Good usable / QC Hold / Rejected) (ASM-PROD-004 / CLAR-PROD-003). Creates a stock return
  transaction. Quantity credited to store only per disposition.

### FR-PROD-CONV-001 — Product / Item Conversion
- **Source:** CR-PROD-002 + ZYGER.
- Converts input item → output item (or state), records input qty, output qty, process loss,
  scrap, batch/lot, and update-inventory intent. Production records qty/loss transactions;
  Costing values the conversion (ASM-PROD-005 / CLAR-PROD-008).

### FR-PROD-ITEMCHG-001 — Item Change
- Sub-case of conversion where an item's identifier/state changes without a full CO; still a
  controlled conversion transaction.

### FR-PROD-DISASSEMBLY-001 — Disassembly
- Parent item → component items. Records component receipt, by-products, loss/scrap. Uses BOM/
  reverse materials. Creates controlled stock transactions (input reduction, component receipts).

---

## 09. IDLE TIME AND PRODUCTION STOPPAGE

### FR-PROD-IDLE-001 — Idle Time
- **Source:** CR-PROD-006.
- Records period a resource is available but not producing, with a reason from a controlled
  catalogue (CLAR-PROD-006 / ASM-PROD-004). Duration auto-computed from start/end.
- Reasons: Material, Operator, Tooling, Program, Inspection/Quality, No-order, Setup delay,
  Machine waiting, Planning delay, Power/facility, Other (with text).
- Feeds OEE Availability and downtime reports.

### FR-PROD-STOP-001 — Line / Machine Stoppage
- **Source:** ZYGER. Stoppage category (may map to Maintenance breakdown on machine failure).
- Distinguishes wholly unproductive stoppage from partial idle. If linked to a machine failure,
  hand-off to Maintenance module (DOC 07-§17).

---

## 10. BATCH CARD CONTROL

### FR-PROD-BATCH-001 — Batch Card Control
- **Source:** ZYGER.
- Controls execution by batch/lot for batch-controlled items. Tracks batch creation, qty,
  status (open/held/closed), and every movement (issue, consumption, output, scrap, receipt)
  by batch/lot. Mandatory where the item is batch/lot-controlled (CLAR-PROD-011).

---

## 11. PRODUCTION PLANNING LAYER

- **FR-PROD-PLAN-001 Planning Demand:** demand input from orders/forecast/MRP to the schedule.
- **FR-PROD-PLAN-002 Item-wise Daily Plan:** final-item plan for a day.
- **FR-PROD-PLAN-003 Planning Time Bucket:** definition of buckets (day/week/month) used to
  slice plans (ASM-PROD-006 / FUT-PROD-003).
- **FR-PROD-PLAN-004 Schedule for Next Time Bucket:** rolling schedule generation from confirmed
  demand + capacity.
- **FR-PROD-PLAN-005 Production Budget Core / 006 Split Bucket-wise / 007 Updation / 008 Forecast / 009 Revision:**
  budget and forecast structures sliced by time bucket with revision control. Budget engine
  flagged FUTURE (MRP/APS migration), but the transactions/plan records are in-scope per scope
  decision (DOC 03-§6.2).
- **FR-PROD-PLAN-010 PO Day/Week/Month-wise:** order schedule granularity views generated from
  the plan.
- **FR-PROD-PLAN-011 Schedule Updation:** revision of a released schedule with change-request
  and audit.
- **FR-PROD-PLAN-012 Delay to Customer Delivery:** captures delay reason + attributed period;
  feeds delivery/plan-vs-actual reporting.
- **FR-PROD-PLAN-013 Manpower Plan vs Actual / Production Plan vs Actual:** comparison reports
  (detail in §20).
- **FR-PROD-PLAN-014 Capacity Assessment:** machine + manpower load vs capacity (detail §12).

---

## 12. WORK CENTER AND CAPACITY PLANNING

- **FR-PROD-WC-001 Work Center Daily Planning:** per-day per-work-center resource plan.
- **FR-PROD-WC-002 Work Center Planning for a Period:** weekly/monthly work-center load plan.
- **FR-PROD-WC-003 Work Center Re-Allocation:** reassign work to alternate work center/machine
  with reason + authorization + audit (BR-PROD-WC-001).
- **FR-PROD-CAP-001 Machine Capacity Assessment / Capacity Assessment:** load vs available
  capacity by machine/work center; feeds capacity report (§20) and capacity engine (FUT-PROD-002).
- **Rule BR-PROD-CAP-001:** capacity calc uses shift calendars and machine availability (from
  Maintenance) and planned cycle/setup times.

---

## 13. PRODUCTION EXCEPTIONS AND DEVIATIONS

- **FR-PROD-EXCP-001 Production Plan Deviation:** records deviation from plan with reason +
  responsible area + required action (ZYGER Plan Deviation Reason Entry).
- **FR-PROD-EXCP-002 Delay to Customer Delivery:** same as FR-PROD-PLAN-012 (cross-reference).
- **FR-PROD-EXCP-003 Production Non-Conformity:** records a production-level non-conformity and
  links/creates an NCR in Quality (Production does not own NCR workflow).
- **FR-PROD-EXCP-004 Operation-wise Control:** BR-PROD-010 sequence control + authorized
  override (reason/user/time/audit).

---

## 14. PRODUCTION QUALITY INTEGRATION

- **Gate model (BR-PROD-QA-001):** operation with required inspection cannot advance to next
  operation until inspection accepts; override allowed only with authorization + audit
  (CLAR-PROD-012 / ASM-PROD-012).
- **Fields exposed per operation:** Inspection Required (from route), Inspection Status
  (PENDING/PASS/FAIL/HELD), Inspection Reference, Quality Hold, Rework Reference, NCR Reference.
- **Integration:** Production consumes results & PPAP status (block mandatory where PPAP
  required) and generates inspection-pending and rejection/rework/scrap dispositions; NCR/CAPA/
  PPAP workflows are owned by Quality (DOC 03-§2.3).

---

## 15. INVENTORY INTEGRATION

### 15.1 Posting principle (DEC-PROD-004)
Never overwrite stock balances directly. Every movement creates a controlled stock transaction
through the Inventory module. Production supplies posting intents; Inventory is the ledger.

### 15.2 Transaction types
- MATERIAL_ISSUE (initial + additional)
- PRODUCTION_CONSUMPTION
- PRODUCTION_RETURN (with disposition)
- PRODUCTION_RECEIPT (FG/SFG)
- SCRAP
- REWORK (output movement)
- CONVERSION (input decrease / output increase / loss / scrap)
- DISASSEMBLY (parent decrease / components + by-products + loss)

### 15.3 Transaction structure
Header + lines: `item, quantity, uom, store, rack, bin, lot, batch, reference_document,
transaction_date, cost_snapshot, user, timestamp, plant/company/division`. (Detail DOC 12.)

### 15.4 Rules
- BR-PROD-INV-001: consumption ≤ available unless approved additional request.
- BR-PROD-INV-002: receipt to FG/SFG only from accepted output of eligible last operation.
- BR-PROD-INV-003: return credited per disposition; QC-hold/rejected returns are segregated.

---

## 16. ENGINEERING INTEGRATION

- Production consumes **approved** BOM (single/multi-level), route sheet, operations, process
  flow, and process definitions from Engineering (READ-ONLY; DOC 03-§2.3).
- **Rules:** production order cannot release without approved BOM + route; route revision changes
  require controlled propagation; BOM consumption rates drive required quantities.

---

## 17. MAINTENANCE INTEGRATION

- Production consumes machine **availability & breakdown** state to gate machine selection
  (BR-PROD-020) and to attribute downtime.
- Stoppage due to breakdown → hand-off to Maintenance (FR-PROD-STOP-001). Maintenance returns
  repaired/available status. OEE Availability uses this combined data (DOC 07-§19).

---

## 18. COSTING INTEGRATION

- Production stores a **cost snapshot** at entry time: machine rate (MHR), labour rate, material
  rate, overhead basis — read-only from Costing config (CFL-PROD-011).
- Costing module computes manufacturing/operation cost (plan vs actual) from Production actuals
  (time, consumption, output, scrap). Production does not compute cost (ASM-PROD-005).
- Conversion value is Costing-owned (CLAR-PROD-008).

---

## 19. OEE AND PERFORMANCE DATA

### 19.1 Single engine (DEC-PROD-005)
OEE = Availability × Performance × Quality.

- **Availability** = (Planned run time − downtime) / Planned run time.
  Sources: Production runtime, Idle/Stoppage (DOC 07-§09), Maintenance downtime (§17), shift
  calendar (Master Data).
- **Performance** = (Actual output) / (Theoretical output = Ideal cycle time × run time).
  Sources: Production output events (§06), cycle/process time (Engineering + CLAR-PROD-007).
- **Quality** = (Accepted output) / (Total production output).
  Sources: Production accepted/reject/rework/scrap (§06/§07).
- **Missing data handling:** if ideal cycle time absent, Performance is reported blank (not
  zero); downtime without a reason is classified "Unclassified-Stoppage" (audited).
- **Audit:** every OEE input is versioned to its source event; metric re-derived, not stored
  separately.

### 19.2 Feeds
Machine-wise OEE, Plant Performance, Man Efficiency, Capacity — via Reporting (§20).

---

## 20. REPORTING AND ANALYTICS

All reports: report purpose, data source(s), filters, KPIs, columns, drill-down, export
(CSV/Excel/PDF), refresh strategy. Production provides actual data; MIS aggregates cross-module.

| Report | Domain source | Key KPIs/filters |
|---|---|---|
| Production Plan vs Actual (Daily/Weekly/Monthly) | Production Planning + Execution | Plan/actual/accepted/pending by item or order |
| Machine capacity plan / Capacity Assessment | Work Center & Capacity | Load vs capacity by machine/work center |
| Production consumption details | Material & Consumable | Item, order, consumed vs issued, deviation |
| Manpower Plan vs Actual / Man & Manpower Efficiency | Planning + Execution | Planned hrs vs actual, efficiency % by operator |
| Rejection / Rework / Scrap details | Rework/Reject/Scrap | Qty, reason, NCR, item, order |
| Machine-wise OEE + Plant Performance | OEE engine | Availability/Performance/Quality/OEE |
| Consumable Plan / Gas / Welding Consumption | Material/Consumable | Consumption by consumable; welding length; welder loss hrs |
| Weekly / Monthly report | Aggregate | Plan vs actual, output, downtime, ppm |
| KPI data / Daily Analysis | Aggregate cross-module | OEE, ppm, output, downtime, efficiency |
| 6M Analysis / CIP | Quality + Maintenance | Problem categories, actions, trend |
| Operation-wise Cost Plan vs Actual (display) | Costing (displayed; owned by Costing) | Plan vs actual cost by operation |
| Manufacturing cost (display) | Costing (displayed) | Cost by order/item |
| Press shop Stroke format / Welder Loss Report | Process data | Strokes, welder losses in hrs |
| MIS | MIS/BI | Enterprise dashboard (cross-module) |

---

## 21. DOCUMENT NUMBERING

### 21.1 Global rule (NUM-PROD-000)
- Number preview may repeat and does **not** consume the sequence.
- Number is **permanently reserved** once successfully saved as Draft or Submitted.
- Reserved numbers are **never reused**.
- Browser refresh/reload/tab change/network interruption before save must not consume or
  change the number.
- Concurrency: server-side transactional sequence controller prevents duplicates.

### 21.2 Formats (configurable prefix per plant/company/division/financial-year)

| Document | Number ID | Format (default) | Preview | Reserve on |
|---|---|---|---|---|
| Production Order | NUM-PROD-ORDER | `PO-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Composite Production Order | NUM-PROD-ORDER-COMP | `POC-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Rework Production Order | NUM-PROD-ORDER-REWORK | `POR-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Work Order (if distinct) | NUM-PROD-WO | `WO-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Job Card | NUM-PROD-JOBCARD | `JC-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Production Entry | NUM-PROD-ENTRY | `PE-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Rework Entry | NUM-PROD-ENTRY-REWORK | `PER-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Production Log Sheet | NUM-PROD-LOG | `PL-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Material Request | NUM-PROD-MREQ | `PM-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Additional Material Request | NUM-PROD-AMREQ | `PMA-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Other Material Request | NUM-PROD-OMREQ | `PMO-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Production Return | NUM-PROD-RETURN | `PR-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Idle Time / Stoppage | NUM-PROD-IDLE | `ID-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Scrap | NUM-PROD-SCRAP | `SC-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Product Conversion | NUM-PROD-CONV | `CV-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Disassembly | NUM-PROD-DISASM | `DS-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Batch Card | NUM-PROD-BATCH | `BC-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |
| Rejection / Defect Record | NUM-PROD-REJ | `REJ-{PLANT}-{FY}-{SEQ}` | Repeatable | Draft/Submit |

### 21.3 Behavior rules
- **Cancellation:** cancelled document keeps its number; number not reused (BR-NUM-001).
- **Draft:** reserve on first successful draft save; subsequent revisions reuse same number.
- **Submit:** number unchanged by submission.
- **Sequences:** per (company, division, plant, FY, type). Cross-plant/concurrent safe.

### 21.4 Rejection document number (NUM-PROD-REJ) — decision
- Rejection is a **separate, number-controlled document** (not merely a sub-field of the
  Production Entry) because:
  1. A rejection/defect record has its own lifecycle (created → classified → disposition →
     closed) and its own dispositional workflow (reworkable / scrap / hold).
  2. It is independently auditable and independently referenceable by NCR, rework order, scrap
     posting, and reports (Rejection details).
  3. Business justification: rejection frequency, disposition and approval are monitored as a
     first-class quality/execution record.
- Each rejection line/detail remains linked to its source operation event (op_event) for
  traceability; the document number identifies the rejection/defect control document.
- Format `REJ-{PLANT}-{FY}-{SEQ}`; preview repeatable; reserved on Draft/Submit; never reused;
  server-side transactional allocation (BR-NUM-001).

---

## 22. WORKFLOW AND STATUS LIFECYCLE

- **Document state machine (global):** DRAFT → VALIDATED → SUBMITTED → PENDING_APPROVAL →
  APPROVED → [PARTIALLY_COMPLETED] → COMPLETED → CLOSED. Lateral: CANCELLED, REJECTED, REVERSED.
- **Authorizations:** per role in DOC 08. Draft/Edit by operator/supervisor; Validate/Submit by
  supervisor; Approve by plant head/planner; Reverse/cancel restricted.
- **State transition validation (BR-WF-001):** only allowed transitions; incomplete postings
  block APPROVED; reversal requires reason + reversal of inventory transactions in controlled
  order.
- Every transition writes an audit record (created/submitted/approved/cancelled/reversed by + at).

---

## 23. BUSINESS RULES

Business rules appear throughout. Central inventory (stable IDs), each expanded per the
standard template (Rule ID/Name/Source/Description/Trigger/Preconditions/Validation/System
Action/Exception/DB/Inventory/Production/Quality/Audit) in DOCUMENT 10. Key ones:

| ID | Summary |
|---|---|
| BR-PROD-001 | Entry Type controls fields/workflow/inventory/costing/quality; locked after save |
| BR-PROD-002 | Rework traceability (source + NCR + qty cap) |
| BR-PROD-010 | Operation sequence control with authorized override |
| BR-PROD-020 | Machine selection validation (work center, active, not breakdown, eligible) |
| BR-PROD-ENTRY-001 | Quantity reconciliation (Processed = Accepted+Rejected+Rework+Scrap) |
| BR-PROD-MATL-001 | Deviation tolerance + additional-material approval |
| BR-PROD-INV-001 | Consumption ≤ available unless approved |
| BR-PROD-INV-002 | FG/SFG receipt only from accepted last-op output |
| BR-PROD-INV-003 | Return credited per disposition |
| BR-PROD-WIP-001 | Accepted op output becomes next op input |
| BR-PROD-PEND-001 | Pending computed from posted events |
| BR-PROD-JOBCARD-001 | Job close requires all subjobs complete or authorized hold |
| BR-PROD-QA-001 | Mandatory quality gate + authorized override |
| BR-PROD-WC-001 | Re-allocation requires reason + authorization + audit |
| BR-PROD-CAP-001 | Capacity uses shift calendars + maintenance availability |
| BR-PROD-REWORK-001 | Rework qty ≤ authorized; sourced |
| BR-PROD-REJ-001 | Rejection control (qty/reason/classification/disposition; reconciliation) |
| BR-PROD-SCRAP-001 | Scrap control (qty/reason/authorization; reversal restriction) |
| BR-PROD-004 | Actual Production DateTime integrity (prior-shift late entry) |
| BR-NUM-001 | Reserved numbers never reused |
| BR-WF-001 | Only allowed status transitions; reversal controlled |

---

## 24. AUDIT AND TRACEABILITY

- Every document/transaction: created_by/at, updated_by/at, version; where applicable
  approved/cancelled/reversed by + at + reason.
- Posting actions create immutable stock-transaction history.
- Overrides (sequence, quality gate, re-allocation, deviation) require reason + user + timestamp
  + audit record.
- Full traceability chain supported: Order → Job Card → Operation Event → Output → Quality →
  Inventory transaction → Cost record → Report.

---

## 25. DATABASE IMPACT SUMMARY

Detailed DDL in DOCUMENT 12. High-level entity groups (all base fields per DOC 07-§01.3):

- `prod_order` / `prod_order_line` (single/composite/rework; status; qty; revs; demand ref).
- `prod_job_card` / `prod_subjob` / `prod_subjob_operation`.
- `prod_execution_session` / `prod_operation_event` (input, processed, accepted, rejected,
  rework, scrap; machine, operator, shift; start/end, runtime, idle; inspection status).
- `prod_output_event` (accepted/co/by-product; lot/batch; weight; dest).
- `prod_consumption_event` (required, issued, available, consumed, deviation, returned; batch/lot).
- `prod_rework_event` (source ref, NCR, authorized qty, route).
- `prod_rejection_event` (type: reworkable/scrap/hold).
- `prod_scrap_event` (qty, reason, value-context).
- `prod_return` (disposition).
- `prod_conversion` / `prod_disassembly` / `prod_item_change`.
- `prod_idle` / `prod_stoppage` (reason_catalogue).
- `prod_batch_card` / `prod_batch_move`.
- `prod_req_material` / `prod_req_addl` / `prod_req_other` / `prod_consumable_consumption`.
- `prod_log_entry`.
- `prod_deviation` / `prod_delay_customer`.
- `prod_plan_demand` / `prod_plan_item_daily` / `prod_plan_bucket` / `prod_plan_wc` /
  `prod_plan_budget` / `prod_plan_rev`.
- Numbering: `num_series` / `num_reservation`.
- Audit: `prod_document_audit`.
- Integration outboxes/interfaces: `stock_tx_intent`, `oee_input` views.

Indexes: item + plant + status; order + operation; batch/lot; date range on every event.

---

## 26. API IMPACT SUMMARY

Detailed API specs in DOCUMENT 13. High-level REST surface (Spring Boot, versioned `/api/v1`):

- Production Orders: `POST/GET/PUT /api/v1/production-orders`, `.../{id}/release`,
  `.../{id}/short-close`, `.../{id}/cancel`, `.../{id}/reverse`.
- Job Cards: `/api/v1/job-cards`, `/api/v1/job-cards/{id}/subjobs`, `.../{id}/complete`.
- Production Workspace: `GET /api/v1/production-workspace/{final-part||workOrder}`;
  `POST /api/v1/production-entries` (creates operation events);
  `POST /api/v1/production-entries/{sessionId}/operations`; `PUT .../operations/{opEventId}`;
  `POST .../{opEventId}/submit`, `/approve`, `/complete`; `POST .../{id}/reverse|/cancel`.
- Rework: `/api/v1/rework-orders`, `/api/v1/rework-entries`.
- Material: `/api/v1/material-requests`, `/additional`, `/other`,
  `/consumable-consumptions`, `/production-returns`, `/consumptions`.
- Conversion: `/api/v1/conversions`, `/disassemblies`, `/item-change`.
- Idle/Stoppage: `/api/v1/idle-times`, `/api/v1/stoppages`.
- WIP/Pending/Output: `GET /api/v1/wip`, `GET /api/v1/production-pending`,
  `GET /api/v1/production-output`.
- Planning: `/api/v1/planning/demand`, `/daily-plan`, `/budget`, `/forecast`,
  `/work-center-plans`, `/schedule`, `/deviation`.
- Batch: `/api/v1/batch-cards`.
- Numbering: `POST /api/v1/numbers/preview`, `POST /api/v1/numbers/reserve`.
- Reports: `/api/v1/reports/...`.
- Each API: purpose, authorization (RBAC), request/response DTO, validation, error handling,
  affected tables + transactions (DOC 13).

---

**END OF DOCUMENT 07**